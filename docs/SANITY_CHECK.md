# PvP Sim 3: RHEA & WebGPU DES Sanity Check Report

**Date**: 2026-10-29  
**Scope**: Audit of the Rolling Horizon Evolutionary Algorithm (RHEA) planner, WebGPU Discrete Event Simulator (`advance_combat`), and foundational combat mechanics for MVP expansion.

---

## 1. What Is Already Solid (Great Foundation)

* **True Shared GPU DES Engine (`advance_combat`)**: Both rollouts ([`simulate_candidate`](file:///home/aaron-ma/pvp_sim3/src/shaders/sim.wgsl.ts)) and live match progression ([`advance_live`](file:///home/aaron-ma/pvp_sim3/src/shaders/sim.wgsl.ts)) execute the exact same WGSL function (`advance_combat`) and clone the in-flight 40-event binary min-heap (`SimQueue`). There is zero CPU/GPU simulation drift.
* **Non-Blocking Asynchronous Host/GPU Architecture**: In [`src/simulator.ts`](file:///home/aaron-ma/pvp_sim3/src/simulator.ts), live combat ticks (`advanceLiveAsync`), sliced RHEA generation evaluation (`stepRHEAAsync`), and double-buffered UI readbacks (`requestSnapshot`) are cleanly decoupled. Plan publication happens via GPU-to-GPU buffer copies (`bestPlanBuffer` $\to$ `committedPlanBuffer`), and `prepare_search` shifts the horizon forward using per-unit `decision_count` offsets so in-flight search latency does not replay stale actions.
* **2-Population Co-evolution (No Single-Chromosome Collusion)**: The population is split (`cand_idx < half_pop` for Team 0, `>= half_pop` for Team 1). Each half mutates only its own team's genes and evaluates against the opposing team's current elite plan (`bestPlan`), preventing the optimizer from forcing the enemy team to self-sabotage.

---

## 2. RHEA-Specific Shortcuts & Subtle Bugs

1. **`advance_live` Previously Passed Only a 1-Step Horizon (`horizon = 1u`)**
   * **Where**: `advance_live` in [`src/shaders/sim.wgsl.ts`](file:///home/aaron-ma/pvp_sim3/src/shaders/sim.wgsl.ts)
   * **The Shortcut**: `advance_live` copied only a single step `plan[u * 8u] = bestPlan[u * 8u + step]` and called `advance_combat(..., 1u, ...)`.
   * **Impact**: If search takes $>500\text{ms}$ or `advanceLiveAsync` is stepped with a larger delta across multiple decision points, any subsequent decision uses `min(step, horizon - 1u)` which clamped to `0`, repeating the first action instead of advancing through `step + 1, step + 2, ...`.
   * **Resolution**: Copy the full remaining shifted horizon (`h = 0..7`) into `plan` in `advance_live` and pass `8u` as the horizon.

2. **Atomic Race Condition in `find_best_candidate`**
   * **Where**: `find_best_candidate` in [`src/shaders/sim.wgsl.ts`](file:///home/aaron-ma/pvp_sim3/src/shaders/sim.wgsl.ts)
   * **The Shortcut**: Updating the max fitness (`bestCandidateResult[1]`) via `atomicMax` and storing the winning candidate index (`bestCandidateResult[0]`) via `atomicStore` were two separate non-atomic operations across up to 1,024 workgroups.
   * **Impact**: A slower workgroup with a *lower* fitness (that still beat an earlier `prev`) could overwrite `bestCandidateResult[0]` *after* the true global maximum workgroup wrote its index.
   * **Resolution**: Perform a parallel workgroup reduction and resolve the winning `(fitness, index)` pair deterministically without a split atomic race (or pack quantized fitness + candidate index / use an atomic CAS loop).

3. **Future Horizon Mutation Gated by Current Snapshot Power (`is_spell_valid`)**
   * **Where**: `mutate_population` in [`src/shaders/sim.wgsl.ts`](file:///home/aaron-ma/pvp_sim3/src/shaders/sim.wgsl.ts)
   * **The Shortcut**: `mutate_population` checked `is_spell_valid(unit, cand_spell)`—which enforces `unit.power >= spell.cost` at $t = \text{now}$—for **all future horizon steps $h = 0 \dots 7$**.
   * **Impact**: If a Warrior had `< 30` Rage at the search snapshot (e.g. 15 Rage), `is_spell_valid` rejected Mortal Strike (cost 30) across the *entire 8-step future horizon*, even though the Warrior generates Rage from auto-attacks during the rollout!
   * **Resolution**: Only enforce current snapshot `unit.power >= spell.cost` at step `h == 0`. For future steps `h > 0`, allow any spell owned by the unit's class (`owns_spell`) so RHEA can plan spenders after future resource generation (while `advance_combat` still validates resource cost at execution time).

4. **Spatial Range Mutation Excluded Short-Range Caster Plays**
   * **Where**: `mutate_population` in [`src/shaders/sim.wgsl.ts`](file:///home/aaron-ma/pvp_sim3/src/shaders/sim.wgsl.ts)
   * **The Shortcut**: Casters (`unit.power_type != 1u`) could only sample desired ranges from `{15u, 25u, 30u}`.
   * **Impact**: Priests and Mages could never discover moving into `< 10y` range to land `Psychic Scream` (8y) or `Frost Nova` (10y).
   * **Resolution**: Expand spatial intent mutation choices to include `5u` (close/AoE range) alongside `{15u, 25u, 30u}`.

5. **Fitness Function Rewarded Overhealing & Unused Shield Spam**
   * **Where**: `advance_combat` & `simulate_candidate` in [`src/shaders/sim.wgsl.ts`](file:///home/aaron-ma/pvp_sim3/src/shaders/sim.wgsl.ts)
   * **The Shortcut**: `damage_team0` / `damage_team1` accumulated $1.5 \times \text{raw\_heal}$ (even at 100% HP!) and $1.0 \times \text{PW:Shield applied}$ (even when refreshing an untouched shield!).
   * **Impact**: Because effective damage and effective healing are *already* reflected in final $\text{HP}_{\text{ally}}$ and $\text{HP}_{\text{enemy}}$, rewarding raw heal/shield casts encouraged Priest candidates to spam PW:Shield and Flash Heal on full-HP targets for free fitness points.
   * **Resolution**: Track only *effective* damage dealt (and effective HP restored `new_hp - old_hp`, or pure outcome HP + effective damage dealt) and remove artificial credit for unabsorbed shield applications.

---

## 3. Combat Engine & Data-Model Shortcuts

1. **DoTs/HoTs Were Disconnected from Aura Slots (Infinite Stacking Exploit)**
   * **Where**: `advance_combat` (`case 2u`, `case 3u`, `case 5u`) in [`src/shaders/sim.wgsl.ts`](file:///home/aaron-ma/pvp_sim3/src/shaders/sim.wgsl.ts)
   * **The Shortcut**: Casting a DoT/HoT (`is_dot == 1u`, like Corruption, Rend, SW:P, Renew) directly enqueued an `EV_DOT_TICK` (`kind = 3u`) into the heap with an expiration timestamp in `ev.generation`. Corruption, Rend, and SW:P had `auraType: 0`, so they didn't occupy `unit.auras`, and **re-casting a DoT queued a second parallel chain of ticks in the heap** instead of refreshing the existing DoT.
   * **Resolution**: Tie all periodic effects (`is_dot == 1u`) to persistent `AuraSlot` entries on the target (matching `spell_id` and `source_id`). When an existing periodic aura is refreshed, increment a sequence/token or update `next_tick_at` / `expires_at` in the aura slot so stale duplicate tick events in the heap become no-ops and only one active tick chain runs per aura.

2. **Passive Mana Regen Was Coupled to Decision Events (`case 5u`)**
   * **Where**: `advance_combat` (`case 5u`) in [`src/shaders/sim.wgsl.ts`](file:///home/aaron-ma/pvp_sim3/src/shaders/sim.wgsl.ts)
   * **The Shortcut**: Casters gained `+40.0` mana inside `case 5u` (every decision event). Because `next_decision` is scheduled after `max(gcd_end, cast_end, stun_end)`, a Warlock casting a 2.5s `Shadow Bolt` or a stunned unit had fewer decision events and therefore regenerated less mana per second than an instant-cast spammer!
   * **Resolution**: Track `last_mana_Ms` (stored in `EntityState.pad2`) and regenerate mana continuously proportional to elapsed time (`80.0` mana/sec = `0.08 * dt_ms`) whenever an entity is updated or checked.

3. **Phase 2 Structural & RHEA Upgrades (Completed 2026-10-29)**
   * **Centralized Struct Layout Constants**: Exported `ARENA_HEADER_WORDS`, `ENTITY_BASE_WORDS`, `AURA_SLOT_WORDS`, `ENTITY_WORDS`, `ARENA_BYTES`, `SIM_QUEUE_BYTES`, `COMBAT_EVENTS_BYTES`, `BEST_PLAN_BYTES`, and `ENTITY_FIELD_OFFSETS` in [`src/constants.ts`](file:///home/aaron-ma/pvp_sim3/src/constants.ts) and wired them through [`src/simulator.ts`](file:///home/aaron-ma/pvp_sim3/src/simulator.ts) and [`diagnostics/combat-parity.ts`](file:///home/aaron-ma/pvp_sim3/diagnostics/combat-parity.ts).
   * **Per-Spell Cooldowns (`get_spell_cd_end` / `set_spell_cd_end`)**: Packed 16-bit cooldown expiration timestamps (in 100ms resolution) for all 16 spells across `EntityState.auras[0..7].pad` so `cooldown_ms` (`Mortal Strike` 6s, `Shield Wall` 30s, `PW:Shield` 4s, `Psychic Scream` 24s, `Fire Blast` 8s, `Frost Nova` 20s) is enforced in live execution, rollouts, and `h == 0` mutation masking without altering the 2,224-byte `ArenaState` ABI.
   * **Data-Driven Aura Durations, Physical/Magic Armor Separation & Fear DR**: Populated true durations in `SPELL_CATALOG` (`Mortal Wounds` 10s, `Hamstring` 8s, `Shield Wall` 8s, `PW:Shield` 15s, `Frostbolt` 5s, `Frost Nova` 6s), restricted `armor` mitigation on instant casts to physical spells (`spell.power_type == 1u`), and added diminishing returns (`apply_cc`) to `Fear` (`cc_type == 4u`).
   * **Coordinate-Ascent Single-Unit Mutation & Temporal Discounting**: In `mutate_population`, 50% of candidates (`(cand_idx & 1u) == 1u`) mutate a single friendly unit's trajectory while preserving teammates' elite plans so multi-unit improvements don't scramble teammates. In `advance_combat`, applied a temporal discount factor (`time_weight` from `1.0` down to `0.70` over 10s) to damage and effective healing so RHEA prioritizes immediate pressure and faster kills.

4. **Phase 3 Combat & Spatial Blind-Spot Fixes (Completed 2026-10-29)**
   * **Enemy-Referenced Movement During Friendly Heals/Buffs**: In `advance_combat` (`case 5u`), units now compute movement spacing (`desired_range`) relative to their primary enemy target (`move_ref_tgt`) even when casting a beneficial spell on themselves or an ally (`active_tgt`). Healers can now kite enemies while self-healing or healing teammates.
   * **Cast-Completion Mana Deduction, Range Re-Check & Damage CC Break**: Cast-time spells now verify range and Line-of-Sight on cast completion (`case 2u`) and deduct mana when the cast finishes rather than on cast start. Added `break_cc_on_damage` so active Roots (`aura_type == 6`) and Fears/Incapacitates (`stun_end`) break when damage exceeds threshold values.
   * **Data-Driven 2D Arena Pillars (Collision & Line-of-Sight)**: Added `pillars: array<ArenaPillar, 4>` to `ArenaState` (`2,288` bytes total, configured via `DEFAULT_ARENA_PILLARS` in `src/constants.ts` and `sim.pillars` in `src/simulator.ts`—zero hardcoded pillar coordinates in WGSL or `main.ts`). `advance_combat` enforces circle pushout collision (`resolve_pillar_collision`) during movement and segment-vs-circle intersection (`has_line_of_sight`) on spell initiation and cast completion.
