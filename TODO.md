# Project TODO, Architecture Rules & Roadmap

## 1. Ground Rules & Principles (Non-Negotiable)

**Target ruleset: Forever (user clarification, 2026-10-30).** Forever is closest
to WoW Classic. Always use Classic as the default reference for spells, stances,
talents and combat mechanics; use Forever-specific behavior where known. Do not
substitute TBC, later expansions or custom tuning without an explicit reason.
The ruleset choice is settled and does not need to be asked again.

1. **Zero Hardcoded Heuristics & Zero Pretrained / Warmstart Neural Weights**:
   - **No behavioral rule hardcoding**: Never hardcode behaviors like "kiting", "chasing", "execute phase prioritizing", or class-specific decision trees.
   - **No neural warmstarting or hand-tuned weights**: Previous iterations spent excessive development time training, tuning, and baking neural network weights (`neuro_champion.nepl`, KAN/MLP checkpoints) to warmstart neuroevolution. We deliberately avoid this: RHEA must plan in real time from scratch on the GPU using pure forward simulation and objective rollout fitness.
   - Movement and targeting are simply action choices in the chromosome (`move_intent: -1, 0, +1`; `target_id: 0..N-1`). Effective positioning and target focus must be 100% **emergent** from the search.
2. **GPU-Only Combat Simulation (Zero CPU Combat Loop)**:
   - All state transitions, combat evaluations, RNG, binary min-heaps, damage mitigation, and evolutionary mutations must execute exclusively in WebGPU compute shaders (`WGSL`).
   - The CPU / JavaScript environment is strictly an orchestrator and visualizer (dispatching compute passes, managing UI widgets, and rendering debug canvases). Never simulate combat steps in TypeScript.
3. **Homogeneous Universal Entity Mechanics**:
   - Every combatant (regardless of class or role) must use the identical struct memory layout and mechanical pipelines.
   - **No class-based branch divergence in shaders**: Swing timers, cast bars, global cooldowns (GCD), periodic resource/regen ticks, and aura/buff slots use identical logic across all entities.
   - Differences in spells, ranges, costs, and effects must be strictly data-driven via table lookups (`SpellCatalog`), not hardcoded `if (class == WARRIOR)` code branches.
4. **Hardware Wave32 / Subgroup Saturation**:
   - Retain `@workgroup_size(32)` to guarantee clean SIMD mapping to AMD Wave32 and NVIDIA 32-thread warps without wave straddling or register spilling.
   - Maintain high batch occupancy ($32{,}768$ to $65{,}536$ candidate rollouts) during search passes to saturate compute units.
5. **Asynchronous Non-Blocking Host Boundary**:
   - Never stall the rendering/event loop with synchronous GPU readback (`await mapAsync`) on large buffers. Readbacks must be double-buffered or narrow (e.g. 16-byte atomic summaries).
6. **No Single-Chromosome Collusion or Pseudo-Coevolution Shortcuts**:
   - **STRICT PROHIBITION**: Never bundle opposing teams into a single chromosome evaluated by a single team's objective function. Doing so allows the optimizer to force the opposing team to self-sabotage/throw matches.
   - Competitive multi-agent search MUST use two independent, co-evolving populations (Team 0 vs Team 1) or a true rolling league archive where Team 0 candidates play against Team 1's league elite, and vice versa.
   - No artificial distance/positional shaping rewards (`pos_fitness`) added to patch collusion. Fitness must reflect pure game outcomes: HP preserved + damage dealt - enemy HP.

---

## 2. Implementation Audit (2026-10-29)

Status below reflects source inspection plus the shared-engine refactor, not a fresh browser/GPU runtime verification. The ground rules above remain requirements; implemented features do not imply full compliance.

### Planner and GPU simulation
- [x] WebGPU pipeline initialization, bind groups, and compute dispatch.
- [x] Thread-private 40-event DES min-heap and 256-iteration rollout loop.
- [x] Wave32 workgroups and 32,768-candidate default search population; 65,536-candidate benchmark capacity. Interactive searches interleave smaller batches with live steps to bound GPU queue latency.
- [x] GPU fitness reduction and elite plan extraction with asynchronous narrow result/plan readbacks.
- [x] Live action selection consumes extracted elite genes, skipping decisions consumed since the search snapshot and rechecking validity at execution.
- [x] Decouple live stepping, sliced snapshot-based search, GPU plan publication, and double-buffered render readbacks. Host scheduling regression tests pass with delayed fake GPU fences/readbacks; actual browser performance remains to be measured.
- [x] Spell, target, and desired-range genes with an 8-step horizon.
- [x] Separate team population halves evaluated against the opposing team's current elite.
- [x] Mutation filtering for spell ownership, resource type, and available power (with future steps `h > 0` checking ownership so spenders can be planned after future resource generation), plus 50% coordinate-ascent single-unit mutations.
- [x] Enforce individual spell cooldowns in live combat, rollouts, and `h == 0` action masking using packed 100ms cooldown timestamps in `EntityState.auras[i].pad`.
- [x] Make live combat GPU-only. Both `simulate_candidate` and `advance_live` call `advance_combat`; TypeScript only dispatches and decodes snapshots/events. The live event heap persists between steps and is cloned for rollouts.
- [ ] Remove behavioral fallbacks and class/resource-specific decisions (restored by user-requested rollback, 2026-10-30):
  - `seedInitialBestPlan` again seeds Mortal Strike, Flash Heal, Frostbolt and Corruption, with 0/20/30 yd class/resource presets.
  - WGSL mutation again forces rage users to 0 yd and samples mana-user ranges from [5, 15, 25, 30] yd.
  - These are known Ground Rule #1 exceptions in the restored diagnostic baseline, not a completed emergent-behavior solution.
  - [x] Spell ownership still uses catalog class metadata; this improvement predates the rolled-back expansion.
- [x] Align fitness with pure-outcome requirements (effective healing only, no unabsorbed shield application credit, temporal discount factor `time_weight`) and eliminate atomic race conditions in `find_best_candidate`.

Evidence: `src/shaders/sim.wgsl.ts` (`simulate_candidate`, `mutate_population`, `is_spell_valid`, `find_best_candidate`, `extract_elite_plan`, `get_spell_cd_end`, `set_spell_cd_end`); `src/simulator.ts` (`stepRHEAAsync`, GPU snapshot decoding, initial plan seeding); `docs/SANITY_CHECK.md`.

### Auras and crowd control — partially complete
- [x] Persistent 8-slot WGSL aura storage and host packing (centralized layout constants in `src/constants.ts`).
- [x] Aura application, refresh by aura type, and reuse of expired slots.
- [x] Timestamp-based expiration checks for modifiers and UI visibility.
- [x] Mortal Wounds healing reduction, Shield Wall damage reduction, and shield absorption/depletion helpers.
- [x] Slow/root movement multipliers in GPU rollouts.
- [x] Rollout DoT/HoT events and rescheduling through the DES heap.
- [x] Stun & Fear diminishing returns (full/half/quarter/immune, 15-second reset), silence, interrupt, and fear incapacitation in WGSL.
- [x] Tie periodic effects (`Rend`, `Shadow Word: Pain`, `Corruption`, `Renew`) to persistent aura slots, preventing duplicate DoT/HoT tick chain stacking on refresh and decoupling passive mana regeneration from decision events (`pad2` timestamp).
- [ ] Implement aura stacks and dispels (magic/curse/bleed); neither has state/handlers yet.
- [x] Move aura durations into `SPELL_CATALOG` (`dotDurationMs` for Mortal Wounds 10s, Hamstring 8s, Shield Wall 8s, PW:Shield 15s, Frostbolt 5s, Frost Nova 6s) and restrict physical armor mitigation to physical abilities (`power_type == 1u`).
- [x] Share live/rollout aura, movement, and periodic tick execution. Both now use the same GPU DES function and clone the persistent event heap.
- [ ] Extend CC beyond basic single-target incapacitation:
  - Multi-target / AoE resolution (e.g. radius around caster for Psychic Scream, Frost Nova).
  - [x] Fear/Horror wandering with deterministic GPU movement events, root/slow modifiers and pillar/boundary resolution; browser runtime checks remain pending.
  - School-specific interrupt lockout (currently locks all spells like silence).

Evidence: `src/shaders/sim.wgsl.ts` (`AuraSlot`, `apply_aura`, modifier helpers, `apply_cc`, event kind 3); `src/simulator.ts` (GPU state packing/decoding).

### Warrior stance/mobility experiment — rolled back; research required (2026-10-30)

User requested restoration of the pre-expansion baseline after battle-log(6) and
battle-log(7) showed ineffective Warrior behavior. Active code is restored to
commit `8d58c1a`: no Warrior stance state/choices/modifiers, Charge or Intercept;
original opening spells and class/resource distance sampling are restored.
Polymorph, Ice Barrier, Blink, Drain Life, Drain Life graphics, damage/healing log
values, bounded log refresh, and CC reporting corrections are retained.

- [x] Archive the failed implementation and its native tests in `diagnostics/warrior-stance-experiment.patch`, based on `8d58c1a`, before restoring the baseline.
- [x] Roll back the stance/mobility engine, expanded plan fields, generic distance mutation, neutral opening plans, and associated layout/UI changes. Entity state returns from 115 to 100 words; arena returns from 2840 to 2480 bytes. Search scheduling/budget is unchanged.
- [ ] Research coordinated spell, target, distance and stance search before reintroducing the expansion. Log(7) showed Mortal Strike with 69 yd desired distance, 14 of 33 snapshots requesting over 30 yd, and no further Warrior ability activation after Intercept at 4.11s despite the match continuing to 32.4s.
- [ ] Investigate stance churn and Rage starvation: frequent stance changes repeatedly retained only 10 Rage. Establish whether independent/local mutations can preserve useful combinations at the existing candidate budget; do not add forced chasing, automatic stance switches or artificial distance rewards as the replacement solution.
- [ ] Instrument winning/baseline/rejected candidate outcomes to distinguish search failure, objective incentives and invalid plans. The battle exports alone do not establish the complete cause of candidate selection.
- [ ] Investigate the adaptive-throughput estimator independently: both supplied logs report zero measured throughput and a 1024-candidate population. The 250ms measurement window resets after each short batch with one batch in flight. No estimator/budget increase is included in this rollback.
- [ ] When revisiting mobility, preserve independent range movement after failed gap closers, evaluate activation at the decision's starting position, and ensure render/prediction/live agreement. A partial fix passed native GPU mechanics tests but did not solve the strategic retreating in log(7).
- [ ] Reassess the larger search space and memory/performance costs with fixed-budget planning-quality comparisons and hardware throughput measurements before re-enabling. Native software Vulkan parity is insufficient evidence of useful combat strategy or hardware performance.
- [ ] Reintroduce Classic/Forever stance legality, independent stance cooldown, Rage retention, damage/crit modifiers and Charge/Intercept only after research demonstrates reliable behavior. Exact Forever PvP DR categories/timing and transit speed still need validation.
- [ ] Follow-up Warrior candidates remain Pummel, Disarm, Berserker Rage and Execute. Existing Shield Wall tuning/equipment requirements and wider Classic fidelity need a separate audit.

### Spell catalog — expanded, with remaining abilities
- [x] Warrior: Mortal Strike, Rend, Hamstring, Shield Wall. Stances, Charge and Intercept were rolled back; see the research item above.
- [x] Priest: Flash Heal, Renew, Power Word: Shield, Shadow Word: Pain, Psychic Scream.
- [x] Mage: Frostbolt, Fire Blast, Frost Nova.
- [x] Warlock: Corruption, Shadow Bolt, Fear, Death Coil (damage, effective self-heal, independent 3s horror, 120s cooldown).
- [x] Add Polymorph (independent DR, damage break, regeneration), Ice Barrier (self absorb), Blink (planned direction, root/stun escape, collision), and Drain Life (interruptible channel and effective leech). Browser verification deferred.
- [ ] Implement AoE Psychic Scream/Frost Nova and complete existing spell mechanics using the aura/CC work above. Catalog presence does not establish full live/rollout parity.

Evidence: `src/constants.ts` (`SPELL_CATALOG`, 21 entries including Idle).

### Arena and visualizer
- [x] Continuous 2D desired-range movement (always referenced against enemy target so healers can kite while healing allies) and arena boundary clamps in both live stepping and rollouts.
- [x] Client-side dead reckoning and directional extrapolation for fluid unit movement between 500 ms discrete GPU decision ticks.
- [x] Arena rendering with four data-driven pillars; no inter-character collision.
- [x] Interactive unit frames, class icons, HP/power bars, and stat/gear editor modal (`editorOverlay`).
- [x] Aura icons with remaining-duration labels on unit frames.
- [x] Cast bars, targeting lines, and horizon plan/action visualization.
- [x] Combat log, battle-log JSON export, playback speed controls, and match-end detection.
- [x] GPU data-driven pillar collision/occlusion (`resolve_pillar_collision`) and line-of-sight checks (`has_line_of_sight`) via `ArenaState.pillars`.
- [ ] Aura stack count labels and split buff vs debuff rows (currently single mixed row without stack count).
- [ ] Ability cooldown sweep overlays on action bars / unit frames (per-spell cooldowns exist in GPU/simulation, but UI lacks visual radial/sweep cooldown indicators).

Evidence: `src/main.ts` (unit frame and arena rendering, log export, playback); `src/simulator.ts` (GPU dispatch and snapshot decoding); `src/shaders/sim.wgsl.ts` (rollout movement).

### GPU diagnostics
- [x] Work around dynamic entity-pointer call sites using local copies; native shader compilation results are recorded in `diagnostics/README.md`.
- [ ] DEFERRED by user (2026-10-30): Verify browser execution of the current shader and real match behavior. Native compilation does not establish browser runtime correctness.

### Battle-log follow-up (2026-10-30)
- [x] Fix Polymorph damage breaks leaving stale heals active: invalidate the pending tick, including at the exact healing timestamp, and never extend expired Polymorph slots on damage.
- [x] Fix early Polymorph/Fear breaks leaving decisions postponed until the old CC end. Retiming reuses the existing heap event, respects remaining CC/cast/GCD and pre-CC cadence, and does not duplicate or grant early turns. Native software Vulkan checks pass for 24 live/prediction scenarios; browser checks remain deferred.
- [x] Temporary user-requested Polymorph tuning: fill the target to maximum HP on each one-second healing tick, including through healing reduction. Revisit exact Forever healing later.
- Archived: the failed-dash freeze fix passed native mechanics tests, but log(7) still showed retreating; the entire expansion has now been rolled back.
- [ ] Research the failed Warrior experiment using logs (6)/(7) and the archived implementation; keep budget changes separate.
- [x] Add animated Drain Life channel beam driven by cast/aura state; stop on cancellation, expiry or death.
- [x] Stop reporting DR-immune CC attempts as successful CC and omit zero-damage spell events.
- [x] Investigate wasted Polymorph choices with candidate-score instrumentation. Battle log (5) showed attempts during DR immunity and effective casts broken by allied damage. Added zero-overhead GPU diagnostic reduction tracking candidate fitness across Frostbolt, Fire Blast, and Polymorph, exposing them in live unit frames and exported battle logs.
  - **Findings from battle-log(8) & Reward-Hacking Audit (2026-10-30)**:
    1. **Identical Rollout Fitness & No Fast-Kill Urgency**: `frostbolt` and `polymorph` evaluated to the exact same maximum fitness (`12,328`). In a 2v1 (Mage + Warlock vs solo Warrior), the 10-second rollout reaches terminal victory regardless of whether the opener is Polymorph or Frostbolt because `simulate_candidate` had no reward for unit kills (`alive`) or finishing the match earlier (`remaining_sec`).
    2. **Cumulative `damage_team` Farming & Miscredited Polymorph Heal (Reward Hacking)**: Because `damage_team` was added 1:1 on top of terminal HP (`team_hp * 2.0 + damage_team - enemy_hp * 2.0`), damaging a target for 2,000 HP and letting Polymorph heal it back for 2,000 HP allowed attackers to *keep* the $+2,000$ `damage_team` score and farm the regenerated HP pool again (whereas killing a target capped further damage farming). Furthermore, `case 7u` credited Polymorph's heal (`damage_team += healed * time_weight`) to the *victim's team* rather than subtracting it from the Polymorph caster's team.
    3. **Atomic Tie-Breaking Favoring Candidate Index**: `find_best_candidate` uses `(65535u - best_i)` in `atomicMax` to break fitness ties, causing identical-scoring candidates to favor lower candidate indices or retained coordinate-ascent baselines rather than preferring pure damage over CC.
    4. **Live vs Rollout Timing Mismatch**: At $t = 21.06\text{s}$, Mage cast Polymorph while Warlock cast Shadow Bolt ($22.41\text{s}$) and Death Coil ($22.46\text{s}$). The damage landed 100ms *before* Polymorph finished ($22.56\text{s}$), leaving the sheep unbroken at 2,416 HP and allowing the 1.0s tick to restore the Warrior back to 3,800 HP (+1,384 HP). In rollouts, earlier damage breaks or jitter often cancelled the heal tick before it occurred, masking the live risk.
  - [x] **Fix fitness reward hacking in `src/shaders/sim.wgsl.ts` (2026-10-30)**: Penalize the Polymorph-casting team's `damage_team` on enemy Polymorph heal ticks (`case 7u`), scale down cumulative `damage_team` to `0.25` (temporal tie-breaker only), and add explicit unit-elimination (`alive_diff * 4000.0`) and fast-victory urgency (`2000.0 + remaining_sec * 500.0`) bonuses in `simulate_candidate` without changing Polymorph regeneration rate.
- [ ] Opening/range heuristics are restored as part of the user-approved rollback; replacing them remains research work.

## 3. Recommended Next Work

### High priority — deferred for today (user request, 2026-10-30)

#### For Advanced Models Only (Deep RHEA / Engine Bugs Flagged 2026-10-30)
- [ ] **Off-Target CC & Utility Spells Overwrite Primary `unit.target_id` (`src/shaders/sim.wgsl.ts` line 964)**:
  - In `advance_combat` (`case 5u`), `if (!friendly_spell) { state.entities[src].target_id = chosen_target; }` executes for *all* non-healing actions, including off-target CC (`Polymorph`, `Fear`, `Death Coil`), self-targeted utility (`Blink`, `spell_id == 19`), and even `Idle / Wait` (`spell_id == 0`).
  - Casting Polymorph on an off-target permanently switches `unit.target_id` to that sheeped target, causing subsequent auto-attack swings (`case 1u`, which reads `state.entities[src].target_id`) and default target mutations (`mutate_population` line 1444: `var chosen_target = unit.target_id;`) to focus and break the sheeped target.
- [ ] **Coupled Tri-Gene Mutation Prevents Independent Target / Range Exploration (`src/shaders/sim.wgsl.ts` lines 1417–1483)**:
  - `mutate_population` re-rolls `(spell_id, desired_range, target_id)` simultaneously whenever a gene mutates. It cannot mutate *only* `target_id` (e.g., shifting an existing `Polymorph` or `Fear` from the primary kill target to an off-target) or *only* `desired_range` without also randomizing the spell ID.
- [ ] **16-Bit Quantized Fitness Clamping & `4.0`-Point Tie-Breaking Blindness (`src/shaders/sim.wgsl.ts` line 192)**:
  - `find_best_candidate` packs fitness into 16 bits via `clamp(u32(max(0.0, best_f + 100000.0) * 0.25), 1u, 65535u)`.
  - The `* 0.25` quantization truncates any fitness difference `< 4.0` points to the exact same integer, causing `atomicMax` to break ties purely by `65535u - best_i` (favoring index `0` / `half_pop`, the unmutated baseline). Shifting by `+100000.0` also wastes ~38% of the 16-bit dynamic range.
- [ ] **Channeled Spell Recast Heap Saturation (`Drain Life`, `src/shaders/sim.wgsl.ts` lines 1118–1165)**:
  - Recasting `Drain Life` (`spell_id == 20`) sets `expires_at = state.now` on the existing aura slot before calling `apply_aura`, which allocates a fresh periodic chain and enqueues a new `EV_DOT_TICK` (`kind = 3u`) without reusing the existing chain's schedule. Repeated channel recasts in random rollout mutations can accumulate stale tick events in the 40-event `SimQueue`, triggering `queue.overflow = 1u` (`state.pad1 = 1u`) and rejecting the candidate (`-999999.0` fitness).
- [x] **Adaptive Population Estimator Permanently Stuck at `1,024` Candidates (`src/simulator.ts` lines 135–145, 820–841)**:
  - With `maxSearchInFlight = 1`, every completed search slice decrements `this.searchInFlight` to `0` in `.finally()`, which executes `if (this.searchInFlight === 0) { this.throughputWindowStart = 0; this.throughputWindowCount = 0; }`.
  - Because a single 2,048-candidate slice completes in `< 15 ms`, the 250 ms measurement window (`if (windowMs >= 250)`) is reset after every slice and *never* completes. `this.searchThroughput` remains `0`, locking `adaptivePopulation()` to `min = 1024` forever.
  - Fixed: accumulate active queue time across serial batches, exclude idle gaps, and retain existing population caps. Fake-GPU regression covers 25 short batches; `npm test` and build pass. Hardware throughput remains unverified.

- [ ] **Polymorph selection still has issues.** Candidate instrumentation in battle-log(8) confirmed that Polymorph ties Frostbolt in terminal rollout fitness in 2v1 situations, and tie-breaking/desynchronized live damage allows healing resets. Potential solutions to research:
  1. Add a slight bias in candidate evaluation or tie-breaking favoring direct damage over non-damaging CC when target is low/kill target or in asymmetric man-advantage.
  2. Improve target mutation for CC abilities to actively sample off-targets rather than inheriting the active kill-focus target.
  3. Penalize redundant CC on targets currently being bursted by teammates to avoid 100ms out-of-order heal resets.

**Warrior expansion rolled back by user request (2026-10-30).** The restored
pre-expansion baseline is active. Research the failed movement/stance/search
experiment before another attempt; see the detailed checklist above. The four
signature spells added before that experiment remain available.

1. **DEFERRED (user request, 2026-10-30): Verify shared-engine runtime parity in a WebGPU browser.** The duplicate CPU combat loop is removed. Run `diagnostics/combat-parity.html` to compare uninterrupted predictions, midfight predictions, and 50 ms live commits for casts, periodic effects, shields, and roots. Build and native WGSL/SPIR-V compilation pass; browser execution remains unverified in this headless sandbox.
2. **Aura stacks, dispels & extended CC mechanics (after signature abilities):**
   - Add stack tracking to `AuraSlot` (WGSL & host) and UI stack counter labels.
   - Implement dispel mechanics (e.g. Purge/Dispel Magic, Remove Curse).
   - Add AoE propagation for Psychic Scream & Frost Nova (affecting all valid targets within radius rather than single target).
   - School-specific interrupt lockouts.
3. **Signature abilities — current priority (2026-10-30):**
   - [x] Add Polymorph, Ice Barrier, Blink, and Drain Life to the shared GPU engine and catalog.
   - Browser behavior verification remains deferred; build, host checks and native shader validation are the current checks.
4. **UI feedback for cooldowns and split aura placement:**
   - Render cooldown sweep overlays on abilities.
   - Split positive buffs and harmful debuffs into separate rows.
5. **Opening/range heuristic cleanup — research pending after rollback:**
   - [ ] Replace restored hardcoded opening spell/range presets and resource-based distance sampling while preserving useful behavior under the existing search budget.
   - Spell ownership still reads catalog class metadata; configurable entity loadouts remain future work.

Validate browser/GPU behavior as these changes land. Browser runtime parity is explicitly deprioritized by user request (2026-10-30). Signature abilities are the current priority, followed by aura/CC mechanics; retain browser verification as deferred work.

## 4. Match Setup & Scenario Roadmap

Keep saved initial configuration separate from live combat state. Initial scope uses
six total entity slots and two teams; these are engine entity slots, not exclusively
player slots. Independently simulated combat pets would consume slots too. Combat
pets are not currently implemented; increasing capacity or introducing a separate
pet system requires engine design and performance validation.

- [ ] Build pre-match team panels with three slots per team and an Empty / Warrior / Priest / Mage / Warlock selector; support duplicate classes.
- [ ] Add/remove players by enabling/disabling stable entity slots. Support 1v1, 2v2, 3v3 and uneven teams within six total entities.
- [ ] Allow moving players between teams; validate at least one active combatant per team before starting.
- [ ] Replace roster-dependent initial plans, spell ownership/UI mappings and renderer indexing assumptions with configuration-aware handling; validate arbitrary occupied/empty slot arrangements.
- [ ] Extend setup stats to starting HP, maximum HP, starting/maximum resources, movement speed, attack power, spell power, armor and weapon speed, with reusable stat presets.
- [ ] Add draggable pre-match player positions, validating arena bounds and pillar clearance.
- [ ] Add mirrored and seeded randomized spawn layouts.
- [ ] Add an arena editor for moving, resizing and removing pillars within the current four-pillar capacity, plus saved arena presets.
- [ ] Save/load complete match scenarios: roster, teams, stats, resources, starting positions, arena layout and random seed.
- [ ] Make Reset restore the selected saved starting configuration, including HP/resources, cooldowns, auras, event queue and planner state, rather than the hardcoded default or modified live state.
- [ ] Add reproducible seeded random scenarios and replay using the same setup/seed; distinguish reproducible scenario generation from exact planner replay under adaptive asynchronous scheduling.
- [ ] Add repeated-match batches for comparing compositions and planner consistency across starting conditions; report results alongside search population and timing settings.

Suggested setup sequence: choose roster → place units → adjust stats/arena → save
scenario → start fight. Capacity beyond six entities, new classes, additional pillar
slots and variable arena dimensions are future engine extensions rather than setup
UI changes. More active entities and combat pets require queue/iteration-budget and
rollout-throughput checks.

## 5. Combat Pets, Targeting & Entity Capacity — Design Research

- [ ] Investigate pets with their own AI/action track, linked to an owning player but with independent position, health, targeting, abilities, cooldowns and GCD. Treat this as a proposed design, not a settled implementation choice.
- [ ] Research whether a separate pet planning track is preferable to joint owner/pet plans or hierarchical planning. Compare coordination quality, target consistency, action-space growth and rollout cost. Preserve the project's GPU-only combat and no-hardcoded-behavior requirements.
- [ ] Design targeting around stable entity IDs and explicit owner/team/entity-kind relationships. Define which spells can target players, pets, allies, enemies or self; cover pet death, owner death, despawn/resummon and stale target references.
- [ ] Evaluate shared owner/pet target intent versus independent targeting, and how to expose both clearly in setup, unit frames, target lines and combat logs.
- [ ] Design player capacity separately from pet/entity capacity; investigate supporting six players plus pets without reducing the player roster limit.
- [ ] Centralize capacity-dependent shader/host constants: entity arrays, plan strides, origin/readback buffers, mutation/extraction loops, renderer indexing and parity fixtures. Six is currently hardcoded in multiple locations, not just MAX_ENTITIES.
- [ ] Benchmark compiled capacities of 6, 8 and 12 entities with equal active rosters, then compare additional active pets. Separate capacity/register/private-memory costs from event-processing and targeting costs.
- [ ] Compare fixed-population throughput and fixed-time planning quality/plan age. Measure GPU memory, queue occupancy/overflow, iteration-budget exhaustion and live-step latency before selecting larger capacities or budgets.
- [ ] Investigate lower-frequency or shorter-horizon pet planning as measured alternatives, while keeping pet combat outcomes in full team rollouts.
- [ ] Add independent off-GCD action support for items/trinkets, including individual/shared-category cooldowns and optional simultaneous spell/item choices; avoid forcing them into the existing single spell action or universal GCD.
