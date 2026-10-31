// Complete WebGPU WGSL compute shader for Discrete Event Simulation (DES) + RHEA Planner
// Features:
// 1. Thread-private 40-element binary min-heap for O(log K) discrete event simulation.
// 2. Universal Entity Mechanics (Shared Swing Timers, GCDs, Cast State, Resource Ticks, Auras).
// 3. Parallel RHEA Rollout: 1024+ candidates mutated and evaluated simultaneously on GPU.
// 4. Fitness reduction and elite plan selection.

export const SIMULATION_WGSL = /* wgsl */ `
struct SpellDef {
    cast_time_ms: u32,
    cooldown_ms: u32,
    cost: f32,
    power_type: u32,      // 0: Mana, 1: Rage, 2: Energy
    range_yards: f32,
    base_dmg_min: f32,
    base_dmg_max: f32,
    scaling: f32,
    is_heal: u32,
    is_dot: u32,
    dot_duration_ms: u32,
    dot_tick_ms: u32,
    dot_dmg_per_tick: f32,
    cc_type: u32,          // 0: None, 1: Stun, 2: Silence, 3: Interrupt, 4: Fear, 5: Root, 6: Horror
    cc_duration_ms: u32,
    aura_type: u32,        // 0: None, 1: MortalWounds, 2: ShieldWall, 3: PWShield, 4: Renew, 5: Slow, 6: Root
    self_heal_ratio: f32,
    class_id: u32,
    self_only: u32,
    blink_distance: f32,
    channel_ms: u32,
    absorb_base: f32,
    min_range_yards: f32,
    requires_out_of_combat: u32,
    power_gain: f32,
    dash_speed: f32,
};

struct AuraSlot {
    spell_id: u32,
    aura_type: u32,       // 1: MortalWounds, 2: ShieldWall, 3: PWShield, 4: Renew, 5: Slow, 6: Root
    expires_at: u32,
    tick_interval_ms: u32,
    next_tick_at: u32,
    value: f32,           // Absorb amount remaining, HoT tick value, or slow percent
    source_id: u32,
    pad: u32,
};

struct EntityState {
    id: u32,
    team: u32,
    alive: u32,
    target_id: u32,
    
    hp: f32,
    max_hp: f32,
    power: f32,
    max_power: f32,
    power_type: u32,
    
    gcd_end: u32,
    cast_end: u32,
    cast_spell_id: u32,
    swing_timer: u32,
    swing_speed_ms: u32,
    
    attack_power: f32,
    spell_power: f32,
    crit_chance: f32,
    armor: f32,
    
    pos_x: f32,
    pos_y: f32,
    speed: f32,
    stun_end: u32,
    silence_end: u32,
    dr_stun_count: u32,
    dr_stun_reset_at: u32,
    class_id: u32,
    decision_count: u32,
    pad2: u32,
    extra_cooldowns: u32,
    horror_end: u32,
    incapacitate_type: u32,
    next_flee_at: u32,

    extra_cooldowns2: u32,
    extra_cooldowns3: u32,
    polymorph_dr_count: u32,
    polymorph_dr_reset_at: u32,
    extra_cooldowns4: u32,
    combat_until: u32,
    dash_start: u32,
    dash_end: u32,
    dash_origin_x: f32,
    dash_origin_y: f32,
    dash_dest_x: f32,
    dash_dest_y: f32,
    controlled_stun_count: u32,
    controlled_stun_reset_at: u32,
    controlled_stun_end: u32,
    auras: array<AuraSlot, 8>,
};

struct ArenaPillar {
    x: f32,
    y: f32,
    r: f32,
    pad: f32,
};

struct ArenaState {
    now: u32,
    num_entities: u32,
    pad0: u32,
    pad1: u32,
    entities: array<EntityState, 6>,
    pillars: array<ArenaPillar, 4>,
};

struct Event {
    at: u32,
    kind: u32,       // 1: Swing, 2: CastComplete, 3: DotTick, 4: GCD, 5: Decision
    source_id: u32,
    target_id: u32,
    spell_id: u32,
    generation: u32, // periodic aura token; for decisions, pre-CC due time (0 = not CC-delayed)
};

struct SimQueue {
    size: u32,
    overflow: u32,
    events: array<Event, 40>,
};

// Groups & Bindings
// Group 0 Bindings
@group(0) @binding(0) var<storage, read> spellCatalog: array<SpellDef>;
@group(0) @binding(1) var<storage, read_write> liveState: ArenaState;
@group(0) @binding(2) var<storage, read_write> candidatePlans: array<u32>; // [POPULATION * 6 * HORIZON]
@group(0) @binding(3) var<storage, read_write> candidateFitness: array<f32>; // [POPULATION]
@group(0) @binding(4) var<storage, read_write> bestPlan: array<u32>; // [6 * HORIZON] (0..2 for Team 0, 3..5 for Team 1)
@group(0) @binding(5) var<uniform> simParams: vec4<u32>; // x: seed, y: population_size, z: horizon_length, w: max_sim_time_ms
@group(0) @binding(6) var<storage, read_write> bestCandidateResult: array<atomic<u32>, 8>; // [0]: team0_best_idx, [1]: team0_max_fit, [2]: team1_best_idx, [3]: team1_max_fit, [4]: mage_frostbolt_fit, [5]: mage_fireblast_fit, [6]: mage_polymorph_fit, [7]: mage_best_target_packed

// The live queue is authoritative; rollouts clone it along with the arena.
@group(0) @binding(7) var<storage, read_write> liveQueue: SimQueue;
@group(0) @binding(8) var<uniform> liveParams: vec4<u32>; // x: advance-until timestamp
struct CombatLogRecord {
    at: u32, source: u32, recipient: u32, spell: u32, kind: u32, value: f32,
};
struct CombatLogBuffer { count: u32, records: array<CombatLogRecord, 80>, };
@group(0) @binding(9) var<storage, read_write> combatEvents: CombatLogBuffer;
fn record_event(enabled: bool, at: u32, source: u32, recipient: u32, spell: u32, kind: u32, value: f32) {
    if (enabled) {
        combatEvents.records[combatEvents.count % 80u] = CombatLogRecord(at, source, recipient, spell, kind, value);
        combatEvents.count += 1u;
    }
}
@group(0) @binding(11) var<uniform> searchSlice: vec4<u32>; // candidate offset/count
@group(0) @binding(12) var<storage, read_write> planOrigin: array<u32, 8>; // time, per-unit decision counts
@group(0) @binding(13) var<storage, read> committedPlan: array<u32>;
@group(0) @binding(14) var<storage, read> committedOrigin: array<u32, 8>;

struct CombatResult { state: ArenaState, queue: SimQueue, damage0: f32, damage1: f32, };

// Reduction kernel: Find max fitness candidates for both Team 0 and Team 1 purely on GPU
var<workgroup> wg_max_fitness: array<f32, 32>;
var<workgroup> wg_best_idx: array<u32, 32>;

@compute @workgroup_size(32)
fn find_best_candidate(@builtin(global_invocation_id) id: vec3<u32>, @builtin(local_invocation_id) lid: vec3<u32>) {
    let cand_idx = id.x;
    let pop_size = simParams.y;
    let half_pop = pop_size / 2u;
    let lane = lid.x;

    var my_fitness = -9999999.0;
    var my_idx = 0u;

    if (cand_idx < pop_size) {
        my_fitness = candidateFitness[cand_idx];
        my_idx = cand_idx;
    }

    wg_max_fitness[lane] = my_fitness;
    wg_best_idx[lane] = my_idx;
    workgroupBarrier();

    // Parallel reduction in workgroup shared memory
    for (var s = 16u; s > 0u; s = s >> 1u) {
        if (lane < s) {
            if (wg_max_fitness[lane + s] > wg_max_fitness[lane]) {
                wg_max_fitness[lane] = wg_max_fitness[lane + s];
                wg_best_idx[lane] = wg_best_idx[lane + s];
            }
        }
        workgroupBarrier();
    }

    // Publish index + 1 atomically; compare immutable full-f32 scores.
    // Zero means no winner yet. CAS keeps score and index logically coupled.
    if (lane == 0u) {
        let best_f = wg_max_fitness[0];
        let best_i = wg_best_idx[0];
        let slot = select(3u, 1u, best_i < half_pop);
        var previous = atomicLoad(&bestCandidateResult[slot]);
        loop {
            if (previous > 0u) {
                let previous_i = previous - 1u;
                let previous_f = candidateFitness[previous_i];
                if (previous_f > best_f || (previous_f == best_f && previous_i <= best_i)) { break; }
            }
            let result = atomicCompareExchangeWeak(&bestCandidateResult[slot], previous, best_i + 1u);
            if (result.exchanged) { break; }
            previous = result.old_value;
        }
    }
}


// Xorshift RNG
fn xorshift32(state: ptr<function, u32>) -> u32 {
    var x = *state;
    x ^= x << 13u;
    x ^= x >> 17u;
    x ^= x << 5u;
    *state = x;
    return x;
}

fn rand_float(state: ptr<function, u32>) -> f32 {
    let r = xorshift32(state);
    return f32(r & 0x00FFFFFFu) / 16777216.0;
}

// Per-spell cooldown tracking (in units of 100ms, max 6.5s..6553.5s) packed into u32 words:
// Spells 0..15 use two u16 timestamps per aura pad; spell 16 uses extra_cooldowns.
fn get_spell_cd_end(unit: EntityState, spell_id: u32) -> u32 {
    if (spell_id == 0u || spell_id >= arrayLength(&spellCatalog)) { return 0u; }
    if (spell_id >= 16u) {
        var packed = unit.extra_cooldowns;
        if (spell_id >= 22u) { packed = unit.extra_cooldowns4; }
        else if (spell_id >= 20u) { packed = unit.extra_cooldowns3; }
        else if (spell_id >= 18u) { packed = unit.extra_cooldowns2; }
        return ((packed >> ((spell_id & 1u) * 16u)) & 0xFFFFu) * 100u;
    }
    let slot = spell_id >> 1u;
    let shift = (spell_id & 1u) * 16u;
    let cd_100ms = (unit.auras[slot].pad >> shift) & 0xFFFFu;
    return cd_100ms * 100u;
}

fn set_spell_cd_end(unit: ptr<function, EntityState>, spell_id: u32, cd_end_ms: u32) {
    if (spell_id == 0u || spell_id >= arrayLength(&spellCatalog)) { return; }
    if (spell_id >= 16u) {
        let shift = (spell_id & 1u) * 16u;
        let mask = ~(0xFFFFu << shift);
        let value = min(65535u, (cd_end_ms + 99u) / 100u) << shift;
        if (spell_id >= 22u) { (*unit).extra_cooldowns4 = ((*unit).extra_cooldowns4 & mask) | value; }
        else if (spell_id >= 20u) { (*unit).extra_cooldowns3 = ((*unit).extra_cooldowns3 & mask) | value; }
        else if (spell_id >= 18u) { (*unit).extra_cooldowns2 = ((*unit).extra_cooldowns2 & mask) | value; }
        else { (*unit).extra_cooldowns = ((*unit).extra_cooldowns & mask) | value; }
        return;
    }
    let slot = spell_id >> 1u;
    let shift = (spell_id & 1u) * 16u;
    let cd_100ms = min(65535u, (cd_end_ms + 99u) / 100u);
    let mask = ~(0xFFFFu << shift);
    (*unit).auras[slot].pad = ((*unit).auras[slot].pad & mask) | (cd_100ms << shift);
}
// Universal Aura Helpers
// Apply or refresh aura in recipient's 8-slot array.
// Returns the generation token (1..255) if a new periodic tick event should be queued, or 0u if an existing periodic chain is already active.
// Note: lower 8 bits of auras[i].pad store the periodic tick generation token if i < 4; auras[0..7].pad upper/lower 16 bits are only used for cooldowns if we separate them.
// To avoid any overlap between aura[i].pad generation tokens and spell cooldowns, store periodic generation tokens in bits 24..31 of aura_type!
fn apply_aura(recipient: ptr<function, EntityState>, spell_id: u32, aura_type: u32, duration_ms: u32, tick_ms: u32, value: f32, source_id: u32, now: u32) -> u32 {
    let base_type = aura_type & 0xFFu;
    if (base_type == 0u) { return 0u; }
    let expires_at = now + duration_ms;
    
    // Check if aura already exists on recipient (refresh it without spawning duplicate tick chains)
    for (var i = 0u; i < 8u; i = i + 1u) {
        let slot_type = (*recipient).auras[i].aura_type & 0xFFu;
        let same_periodic = base_type == 7u && (*recipient).auras[i].spell_id == spell_id && (*recipient).auras[i].source_id == source_id;
        let same_typed = base_type != 7u && slot_type == base_type;
        if ((same_periodic || same_typed) && (*recipient).auras[i].expires_at > now) {
            (*recipient).auras[i].spell_id = spell_id;
            (*recipient).auras[i].expires_at = expires_at;
            (*recipient).auras[i].value = value;
            (*recipient).auras[i].source_id = source_id;
            if (tick_ms > 0u && ((*recipient).auras[i].next_tick_at <= now || (*recipient).auras[i].tick_interval_ms == 0u)) {
                let gen = (((*recipient).auras[i].aura_type >> 8u) + 1u) & 0xFFFFu;
                let safe_gen = select(gen, 1u, gen == 0u);
                (*recipient).auras[i].aura_type = base_type | (safe_gen << 8u);
                (*recipient).auras[i].tick_interval_ms = tick_ms;
                (*recipient).auras[i].next_tick_at = now + tick_ms;
                return safe_gen;
            }
            return 0u;
        }
    }
    // Otherwise place into first empty or expired slot
    for (var i = 0u; i < 8u; i = i + 1u) {
        if ((*recipient).auras[i].expires_at <= now || ((*recipient).auras[i].aura_type & 0xFFu) == 0u) {
            let gen = (((*recipient).auras[i].aura_type >> 8u) + 1u) & 0xFFFFu;
            let safe_gen = select(gen, 1u, gen == 0u);
            (*recipient).auras[i].spell_id = spell_id;
            (*recipient).auras[i].aura_type = base_type | (safe_gen << 8u);
            (*recipient).auras[i].expires_at = expires_at;
            (*recipient).auras[i].tick_interval_ms = tick_ms;
            (*recipient).auras[i].next_tick_at = select(now + tick_ms, 0u, tick_ms == 0u);
            (*recipient).auras[i].value = value;
            (*recipient).auras[i].source_id = source_id;
            return select(0u, safe_gen, tick_ms > 0u);
        }
    }
    return 0u;
}

// Check active aura modifiers on an entity
fn get_healing_received_multiplier(input_unit: EntityState, now: u32) -> f32 {
    var unit = input_unit;
    var mult = 1.0;
    for (var i = 0u; i < 8u; i = i + 1u) {
        // Mortal Wounds (-50% healing taken)
        if ((unit.auras[i].aura_type & 0xFFu) == 1u && unit.auras[i].expires_at > now) {
            mult *= 0.5;
        }
    }
    return mult;
}

fn get_damage_reduction_multiplier(input_unit: EntityState, now: u32) -> f32 {
    var unit = input_unit;
    var mult = 1.0;
    for (var i = 0u; i < 8u; i = i + 1u) {
        // Shield Wall (-60% damage taken)
        if ((unit.auras[i].aura_type & 0xFFu) == 2u && unit.auras[i].expires_at > now) {
            mult *= 0.4;
        }
    }
    return mult;
}

fn get_speed_multiplier(input_unit: EntityState, now: u32) -> f32 {
    var unit = input_unit;
    var mult = 1.0;
    for (var i = 0u; i < 8u; i = i + 1u) {
        let a_type = unit.auras[i].aura_type & 0xFFu;
        // Root: 0% speed
        if (a_type == 6u && unit.auras[i].expires_at > now) {
            return 0.0;
        }
        // Slow: 50% speed
        if (a_type == 5u && unit.auras[i].expires_at > now) {
            mult = min(mult, 0.5);
        }
    }
    return mult;
}

// Absorb damage with active Power Word: Shield if present
fn absorb_damage(unit: ptr<function, EntityState>, raw_dmg: f32, now: u32) -> f32 {
    var remaining_dmg = raw_dmg;
    for (var i = 0u; i < 8u; i = i + 1u) {
        if (((*unit).auras[i].aura_type & 0xFFu) == 3u && (*unit).auras[i].expires_at > now) {
            let shield_val = (*unit).auras[i].value;
            if (shield_val >= remaining_dmg) {
                (*unit).auras[i].value -= remaining_dmg;
                return 0.0;
            } else {
                remaining_dmg -= shield_val;
                (*unit).auras[i].value = 0.0;
                (*unit).auras[i].expires_at = 0u; // Shield broken
            }
        }
    }
    return remaining_dmg;
}

// Universal Diminishing Returns helper for CC durations
// Stun & Fear DR curve: 1st: 100%, 2nd: 50%, 3rd: 25%, 4th+: Immune (0%)
// DR resets after 15,000ms of no stuns/fears applied
fn apply_cc(recipient: ptr<function, EntityState>, cc_type: u32, base_duration_ms: u32, now: u32) -> bool {
    let before = *recipient;
    if (cc_type == 7u) {
        if (now >= (*recipient).polymorph_dr_reset_at) { (*recipient).polymorph_dr_count = 0u; }
        let duration = base_duration_ms >> min((*recipient).polymorph_dr_count, 3u);
        if ((*recipient).polymorph_dr_count < 3u) {
            let token = apply_aura(recipient, 17u, 8u, duration, 1000u, 0.0, (*recipient).id, now);
            (*recipient).polymorph_dr_count += 1u;
            (*recipient).polymorph_dr_reset_at = now + duration + 15000u;
            (*recipient).cast_end = now;
            (*recipient).cast_spell_id = 0u;
        }
    } else if (cc_type == 1u) {
        if (now >= (*recipient).controlled_stun_reset_at) { (*recipient).controlled_stun_count = 0u; }
        if ((*recipient).controlled_stun_count < 3u) {
            let duration = base_duration_ms >> (*recipient).controlled_stun_count;
            (*recipient).controlled_stun_count += 1u;
            (*recipient).controlled_stun_end = max((*recipient).controlled_stun_end, now + duration);
            (*recipient).controlled_stun_reset_at = (*recipient).controlled_stun_end + 15000u;
            (*recipient).cast_end = now;
            (*recipient).cast_spell_id = 0u;
        }
    } else if (cc_type == 4u) { // Fear has its own diminishing returns.
        // Reset DR if reset window elapsed
        if (now >= (*recipient).dr_stun_reset_at) {
            (*recipient).dr_stun_count = 0u;
        }

        var duration = base_duration_ms;
        if ((*recipient).dr_stun_count == 1u) {
            duration = base_duration_ms / 2u;
        } else if ((*recipient).dr_stun_count == 2u) {
            duration = base_duration_ms / 4u;
        } else if ((*recipient).dr_stun_count >= 3u) {
            duration = 0u; // Immune
        }

        if (duration > 0u) {
            let new_stun_end = now + duration;
            if (new_stun_end > (*recipient).stun_end) {
                (*recipient).stun_end = new_stun_end;
                (*recipient).incapacitate_type = cc_type;
            }
            // Stun / Fear cancels current cast
            if ((*recipient).cast_end > now) {
                (*recipient).cast_end = now;
                (*recipient).cast_spell_id = 0u;
            }
            (*recipient).dr_stun_count = (*recipient).dr_stun_count + 1u;
            (*recipient).dr_stun_reset_at = new_stun_end + 15000u;
        }
    } else if (cc_type == 2u) { // Silence
        let new_silence_end = now + base_duration_ms;
        if (new_silence_end > (*recipient).silence_end) {
            (*recipient).silence_end = new_silence_end;
        }
        // Silence cancels active cast
        if ((*recipient).cast_end > now) {
            (*recipient).cast_end = now;
            (*recipient).cast_spell_id = 0u;
        }
    } else if (cc_type == 3u) { // Interrupt
        // Interrupt immediately lockout active cast and locks that spell school for duration
        if ((*recipient).cast_end > now) {
            (*recipient).cast_end = now;
            (*recipient).cast_spell_id = 0u;
            (*recipient).silence_end = max((*recipient).silence_end, now + base_duration_ms);
        }
    } else if (cc_type == 6u) { // Horror is independent of Fear DR and does not break on damage.
        (*recipient).horror_end = max((*recipient).horror_end, now + base_duration_ms);
        if ((*recipient).cast_end > now) {
            (*recipient).cast_end = now;
            (*recipient).cast_spell_id = 0u;
        }
    } else if (cc_type == 5u) { // Root
        // Handled via aura_type == 6 (speed = 0)
        return true;
    }
    return (*recipient).controlled_stun_end != before.controlled_stun_end ||
        (*recipient).stun_end != before.stun_end ||
        (*recipient).silence_end != before.silence_end ||
        (*recipient).horror_end != before.horror_end ||
        (*recipient).polymorph_dr_count != before.polymorph_dr_count;
}

// Break active Fear (stun_end when dr_stun_count > 0) or Root (aura_type == 6) when direct/periodic damage exceeds threshold
// Return whether incapacitation was shortened, so its existing decision event
// can be moved forward after all damage/CC effects from this hit have resolved.
fn break_cc_on_damage(recipient: ptr<function, EntityState>, dmg: f32, now: u32) -> bool {
    if (dmg <= 0.0) { return false; }
    var shortened = false;
    for (var i = 0u; i < 8u; i++) {
        if (((*recipient).auras[i].aura_type & 0xFFu) == 8u) {
            if ((*recipient).auras[i].expires_at > now) {
                (*recipient).auras[i].expires_at = now;
                shortened = true;
            }
            // Invalidate pending heals even at the exact break/expiry timestamp.
            // Never extend an already-expired aura to the current damage time.
            (*recipient).auras[i].next_tick_at = 0u;
        }
    }
    // Break Root (aura_type 6) if a single hit deals >= 150 damage, or accumulate against value
    for (var i = 0u; i < 8u; i = i + 1u) {
        if (((*recipient).auras[i].aura_type & 0xFFu) == 6u && (*recipient).auras[i].expires_at > now) {
            let rem = (*recipient).auras[i].value - dmg;
            if (rem <= 0.0) {
                (*recipient).auras[i].expires_at = 0u;
                (*recipient).auras[i].value = 0.0;
            } else {
                (*recipient).auras[i].value = rem;
            }
        }
    }
    // Break incapacitate/Fear early if single hit >= 280 damage
    if ((*recipient).incapacitate_type == 4u && (*recipient).stun_end > now && dmg >= 280.0) {
        (*recipient).stun_end = now;
        shortened = true;
    }
    return shortened;
}

fn incapacitated_until(unit: EntityState) -> u32 {
    var until = max(max(unit.stun_end, unit.horror_end), unit.controlled_stun_end);
    for (var i = 0u; i < 8u; i++) {
        if ((unit.auras[i].aura_type & 0xFFu) == 8u) { until = max(until, unit.auras[i].expires_at); }
    }
    return until;
}

// Data-driven 2D Pillar Line-of-Sight & Circle Collision helpers (reads ArenaState.pillars[0..3])
fn has_line_of_sight(pillars: array<ArenaPillar, 4>, ax: f32, ay: f32, bx: f32, by: f32) -> bool {
    let abx = bx - ax;
    let aby = by - ay;
    let ab_len_sq = abx * abx + aby * aby;
    if (ab_len_sq < 0.0001) { return true; }
    for (var p = 0u; p < 4u; p = p + 1u) {
        let pr = pillars[p].r;
        if (pr <= 0.0) { continue; }
        let apx = pillars[p].x - ax;
        let apy = pillars[p].y - ay;
        let t = clamp((apx * abx + apy * aby) / ab_len_sq, 0.0, 1.0);
        let cx = ax + t * abx - pillars[p].x;
        let cy = ay + t * aby - pillars[p].y;
        if (cx * cx + cy * cy < pr * pr) {
            return false;
        }
    }
    return true;
}

fn resolve_pillar_collision(pillars: array<ArenaPillar, 4>, x: f32, y: f32) -> vec2<f32> {
    var px = clamp(x, 2.0, 58.0);
    var py = clamp(y, 2.0, 38.0);
    for (var p = 0u; p < 4u; p = p + 1u) {
        let pr = pillars[p].r;
        if (pr <= 0.0) { continue; }
        let min_r = pr + 1.5; // inflated by unit radius; keep in sync with UNIT_RADIUS_YARDS
        let dx = px - pillars[p].x;
        let dy = py - pillars[p].y;
        let d2 = dx * dx + dy * dy;
        if (d2 < min_r * min_r) {
            let d = max(0.001, sqrt(d2));
            px = clamp(pillars[p].x + (dx / d) * min_r, 2.0, 58.0);
            py = clamp(pillars[p].y + (dy / d) * min_r, 2.0, 38.0);
        }
    }
    return vec2<f32>(px, py);
}

fn dash_path_clear(pillars: array<ArenaPillar, 4>, origin: vec2<f32>, destination: vec2<f32>) -> bool {
    let segment = destination - origin;
    let length_sq = max(dot(segment, segment), 0.0001);
    if (any(destination < vec2<f32>(2.0)) || any(destination > vec2<f32>(58.0, 38.0))) { return false; }
    for (var p = 0u; p < 4u; p++) {
        if (pillars[p].r <= 0.0) { continue; }
        let center = vec2<f32>(pillars[p].x, pillars[p].y);
        let t = clamp(dot(center - origin, segment) / length_sq, 0.0, 1.0);
        let distance_sq = dot(origin + segment * t - center, origin + segment * t - center);
        let radius = pillars[p].r + 1.5;
        if (distance_sq < radius * radius) { return false; }
    }
    return true;
}

// Only active dashes run this bounded update. pad0 bit 0 = initialized,
// bits 1..6 = active dash entity mask; no extra per-dash event chain.
fn update_dashes(state: ptr<function, ArenaState>, now: u32) {
    if (((*state).pad0 >> 1u) == 0u) { return; }
    for (var u = 0u; u < 6u; u++) {
        if (((*state).pad0 & (2u << u)) == 0u) { continue; }
        var unit = (*state).entities[u];
        // State was advanced to the CC event before the effect was applied.
        // Cancellation therefore holds the last authoritative position.
        if (unit.alive == 0u || incapacitated_until(unit) > now || get_speed_multiplier(unit, now) == 0.0) {
            unit.dash_end = 0u;
            (*state).pad0 &= ~(2u << u);
        } else {
            let t = clamp(f32(now - min(now, unit.dash_start)) / f32(max(1u, unit.dash_end - unit.dash_start)), 0.0, 1.0);
            unit.pos_x = mix(unit.dash_origin_x, unit.dash_dest_x, t);
            unit.pos_y = mix(unit.dash_origin_y, unit.dash_dest_y, t);
            if (now >= unit.dash_end) { (*state).pad0 &= ~(2u << u); }
        }
        (*state).entities[u] = unit;
    }
}

// Forced movement is a CC mechanic, not planner behavior. No shared mutation RNG:
// direction is fixed by unit and absolute time so live/predicted commits agree.
fn is_fleeing(unit: EntityState, now: u32) -> bool {
    return unit.horror_end > now || (unit.stun_end > now && unit.incapacitate_type == 4u);
}

fn flee_direction(unit_id: u32, now: u32) -> vec2<f32> {
    var seed = (unit_id + 1u) * 747796405u ^ (now / 750u + 1u) * 2891336453u;
    let x = rand_float(&seed) * 2.0 - 1.0;
    let y = rand_float(&seed) * 2.0 - 1.0;
    let length = sqrt(x * x + y * y);
    if (length < 0.001) { return vec2<f32>(1.0, 0.0); }
    return vec2<f32>(x / length, y / length);
}

// Binary Min-Heap Priority Queue (thread private)
fn heap_before(a: Event, b: Event) -> bool {
    if (a.at != b.at) {
        return a.at < b.at;
    }
    // Periodic dot ticks and swings resolve before decisions at exact same ms
    return a.kind < b.kind;
}

fn enqueue(q: ptr<function, SimQueue>, ev: Event) {
    if ((*q).size >= 40u) {
        (*q).overflow = 1u;
        return;
    }
    var i = (*q).size;
    (*q).size = i + 1u;
    
    for (var step = 0u; step < 6u; step = step + 1u) {
        if (i == 0u) { break; }
        let parent = (i - 1u) / 2u;
        if (!heap_before(ev, (*q).events[parent])) {
            break;
        }
        (*q).events[i] = (*q).events[parent];
        i = parent;
    }
    (*q).events[i] = ev;
}

// Decrease the timestamp of the existing decision, without adding a second turn
// or expanding the queue. Only called when damage actually shortens CC.
fn resume_decision_after_cc_break(q: ptr<function, SimQueue>, unit: EntityState, now: u32) {
    if (unit.alive == 0u || unit.hp <= 0.0) { return; }
    let busy_end = max(max(unit.gcd_end, unit.cast_end), incapacitated_until(unit));
    let ready_at = max(now, busy_end) + 50u;
    for (var slot = 0u; slot < (*q).size; slot++) {
        var ev = (*q).events[slot];
        if (ev.kind != 5u || ev.source_id != unit.id) { continue; }
        // A normal pending turn must not be accelerated just because CC was
        // applied and broken before that turn. Preserve its original cadence.
        if (ev.generation == 0u) { return; }
        let due = max(ready_at, ev.generation);
        if (ev.at <= due) { return; }
        ev.at = due;
        var i = slot;
        for (var step = 0u; step < 6u; step++) {
            if (i == 0u) { break; }
            let parent = (i - 1u) / 2u;
            if (!heap_before(ev, (*q).events[parent])) { break; }
            (*q).events[i] = (*q).events[parent];
            i = parent;
        }
        (*q).events[i] = ev;
        return;
    }
}

fn dequeue(q: ptr<function, SimQueue>) -> Event {
    let top = (*q).events[0];
    (*q).size = (*q).size - 1u;
    if ((*q).size > 0u) {
        let tail = (*q).events[(*q).size];
        var i = 0u;
        for (var step = 0u; step < 6u; step = step + 1u) {
            let left = 2u * i + 1u;
            let right = left + 1u;
            var smallest = i;
            if (left < (*q).size) {
                if (heap_before((*q).events[left], tail)) {
                    smallest = left;
                }
            }
            if (right < (*q).size) {
                var pick_right = false;
                if (smallest == i) {
                    pick_right = heap_before((*q).events[right], tail);
                } else {
                    pick_right = heap_before((*q).events[right], (*q).events[left]);
                }
                if (pick_right) {
                    smallest = right;
                }
            }
            if (smallest == i) { break; }
            (*q).events[i] = (*q).events[smallest];
            i = smallest;
        }
        (*q).events[i] = tail;
    }
    return top;
}

// One combat engine for predictions and committed match execution.
fn advance_combat(input_state: ArenaState, input_queue: SimQueue, plan: array<u32, 48>, horizon: u32, max_time_ms: u32, logging: bool) -> CombatResult {
    var state = input_state;
    var queue = input_queue;
    let num_units = state.num_entities;

    // Seed only once. In-flight casts, swings and ticks survive every commit.
    if (state.pad0 == 0u) {
        state.pad0 = 1u;
        for (var u = 0u; u < num_units; u = u + 1u) {
            if (state.entities[u].alive == 1u) {
                state.entities[u].pad2 = state.now;
                // Next auto-attack
                var swing_at = state.entities[u].swing_timer;
                if (swing_at <= state.now) {
                    swing_at = state.now + 100u;
                }
                enqueue(&queue, Event(swing_at, 1u, u, state.entities[u].target_id, 0u, 0u));

                // Initial decision event for RHEA plan
                enqueue(&queue, Event(state.now + 10u, 5u, u, state.entities[u].target_id, 0u, 0u));
                if (is_fleeing(state.entities[u], state.now) && state.entities[u].next_flee_at == 0u) {
                    state.entities[u].next_flee_at = state.now + 500u;
                    enqueue(&queue, Event(state.now + 500u, 6u, u, u, 0u, 0u));
                }
            }
        }

    }

    var decision_steps: array<u32, 6>;
    for (var u = 0u; u < 6u; u = u + 1u) {
        decision_steps[u] = 0u;
    }

    var damage_team0 = 0.0;
    var damage_team1 = 0.0;
    let start_now = state.now;

    // Bounded DES loop. Exhaustion is reported, never silently treated as completion.
    for (var iter = 0u; iter < 256u; iter = iter + 1u) {
        var roster_teams = 0u;
        var alive_teams = 0u;
        for (var u = 0u; u < num_units; u++) {
            if (state.entities[u].max_hp > 0.0) {
                roster_teams |= 1u << state.entities[u].team;
                if (state.entities[u].alive == 1u) { alive_teams |= 1u << state.entities[u].team; }
            }
        }
        if (roster_teams == 3u && alive_teams != 3u) {
            state.pad1 = queue.overflow;
            return CombatResult(state, queue, damage_team0, damage_team1);
        }
        if (queue.size == 0u) { break; }
        if (queue.events[0].at > max_time_ms) { break; }
        let ev = dequeue(&queue);
        update_dashes(&state, ev.at);
        state.now = ev.at;
        // Temporal discount factor (1.0 at t=start_now down to 0.70 at +10s) so RHEA prioritizes
        // immediate pressure and fast kills over delayed actions.
        let elapsed_sec = f32(state.now - min(state.now, start_now)) * 0.001;
        let time_weight = clamp(1.0 - elapsed_sec * 0.03, 0.70, 1.0);

        let src = ev.source_id;
        let tgt = select(ev.target_id, state.entities[src].target_id, ev.kind == 1u);

        // Skip if source died
        if (state.entities[src].alive == 0u) {
            continue;
        }

        var was_alive: array<u32, 6>;
        for (var u = 0u; u < num_units; u++) { was_alive[u] = state.entities[u].alive; }
        var shortened_cc_target = 6u;
        switch (ev.kind) {
            // 1: Universal Auto-Attack Swing
            case 1u: {
                if (state.entities[tgt].alive == 1u && state.entities[tgt].team != state.entities[src].team && state.entities[src].cast_end <= state.now && state.now >= incapacitated_until(state.entities[src])) {
                    let dx = state.entities[tgt].pos_x - state.entities[src].pos_x;
                    let dy = state.entities[tgt].pos_y - state.entities[src].pos_y;
                    let dist = sqrt(dx * dx + dy * dy);

                    // Auto-attack range limit (5 yards melee for all units)
                    // Mana casters only have melee staff/fist attack at 5y dealing minimal physical damage
                    let range_limit = 5.0;

                    if (dist <= range_limit && state.entities[src].dash_end <= state.now) {
                        state.entities[src].combat_until = state.now + 5000u;
                        state.entities[tgt].combat_until = state.now + 5000u;
                        var base_dmg = state.entities[src].attack_power * 0.35 + 40.0;
                        if (state.entities[src].power_type != 1u) {
                            base_dmg = 15.0; // Casters deal negligible 15 physical damage staff bonk
                        }
                        let armor_factor = 1000.0 / (1000.0 + state.entities[tgt].armor);
                        let raw_dmg = base_dmg * armor_factor * get_damage_reduction_multiplier(state.entities[tgt], state.now);
                        // Use a local pointer: Naga SPIR-V emission crashes on dynamic array-element pointer arguments.
                        var effect_entity_1 = state.entities[tgt];
                        let final_dmg = absorb_damage(&effect_entity_1, raw_dmg, state.now);
                        if (break_cc_on_damage(&effect_entity_1, final_dmg, state.now)) { shortened_cc_target = tgt; }
                        state.entities[tgt] = effect_entity_1;
                        
                        state.entities[tgt].hp = max(0.0, state.entities[tgt].hp - final_dmg);
                        if (final_dmg > 0.0) { record_event(logging, state.now, src, tgt, ev.spell_id, 1u, final_dmg); }
                        if (state.entities[src].team == 0u) {
                            damage_team0 += final_dmg * time_weight;
                        } else {
                            damage_team1 += final_dmg * time_weight;
                        }

                        // Rage gain on swing for rage users
                        if (state.entities[src].power_type == 1u) {
                            state.entities[src].power = min(state.entities[src].max_power, state.entities[src].power + 20.0);
                        }

                        if (state.entities[tgt].hp <= 0.0) {
                            state.entities[tgt].alive = 0u;
                        }
                    }
                }
                // Reschedule next swing per universal swing timer
                let next_swing = state.now + state.entities[src].swing_speed_ms;
                state.entities[src].swing_timer = next_swing;
                enqueue(&queue, Event(next_swing, 1u, src, tgt, 0u, 0u));
            }

            // 2: Cast Complete (consumes mana on completion and verifies range + pillar LoS)
            case 2u: {
                let spell = spellCatalog[ev.spell_id];
                if (state.entities[src].cast_end == state.now && state.entities[src].cast_spell_id == ev.spell_id && state.now >= incapacitated_until(state.entities[src])) {
                    state.entities[src].cast_spell_id = 0u;
                    let cast_dx = state.entities[tgt].pos_x - state.entities[src].pos_x;
                    let cast_dy = state.entities[tgt].pos_y - state.entities[src].pos_y;
                    let cast_dist = sqrt(cast_dx * cast_dx + cast_dy * cast_dy);
                    let in_range = tgt == src || cast_dist <= spell.range_yards;
                    let in_los = tgt == src || has_line_of_sight(state.pillars, state.entities[src].pos_x, state.entities[src].pos_y, state.entities[tgt].pos_x, state.entities[tgt].pos_y);

                    if (state.entities[tgt].alive == 1u && state.entities[src].power >= spell.cost && in_range && in_los) {
                        if (state.entities[src].team != state.entities[tgt].team) {
                            state.entities[src].combat_until = state.now + 5000u;
                            state.entities[tgt].combat_until = state.now + 5000u;
                        } else if (state.entities[tgt].combat_until > state.now) {
                            state.entities[src].combat_until = state.now + 5000u;
                        }
                        state.entities[src].power -= spell.cost;
                        var cd_entity_cast = state.entities[src];
                        if (spell.cooldown_ms > 0u) {
                            set_spell_cd_end(&cd_entity_cast, ev.spell_id, state.now + spell.cooldown_ms);
                        }
                        state.entities[src] = cd_entity_cast;

                        if (spell.is_heal == 1u && spell.aura_type != 3u) {
                            let heal_mult = get_healing_received_multiplier(state.entities[tgt], state.now);
                            let heal_amt = (spell.base_dmg_min + spell.scaling * state.entities[src].spell_power) * heal_mult;
                            let old_hp = state.entities[tgt].hp;
                            state.entities[tgt].hp = min(state.entities[tgt].max_hp, old_hp + heal_amt);
                            let eff_heal = state.entities[tgt].hp - old_hp;
                            record_event(logging, state.now, src, tgt, ev.spell_id, 2u, heal_amt);
                            if (state.entities[src].team == 0u) {
                                damage_team0 += eff_heal * time_weight;
                            } else {
                                damage_team1 += eff_heal * time_weight;
                            }
                        } else if (spell.is_heal == 0u) {
                            let dmg_red = get_damage_reduction_multiplier(state.entities[tgt], state.now);
                            let raw_dmg = (spell.base_dmg_min + select(spell.scaling, 0.0, spell.is_dot == 1u) * state.entities[src].spell_power) * dmg_red;
                            // Use a local pointer: Naga SPIR-V emission crashes on dynamic array-element pointer arguments.
                            var effect_entity_2 = state.entities[tgt];
                            let final_dmg = absorb_damage(&effect_entity_2, raw_dmg, state.now);
                            if (break_cc_on_damage(&effect_entity_2, final_dmg, state.now)) { shortened_cc_target = tgt; }
                            state.entities[tgt] = effect_entity_2;
                            let damage_dealt = min(final_dmg, state.entities[tgt].hp);
                            state.entities[tgt].hp = max(0.0, state.entities[tgt].hp - final_dmg);
                            if (final_dmg > 0.0) { record_event(logging, state.now, src, tgt, ev.spell_id, 1u, final_dmg); }
                            if (state.entities[src].team == 0u) {
                                damage_team0 += final_dmg * time_weight;
                            } else {
                                damage_team1 += final_dmg * time_weight;
                            }
                            if (state.entities[tgt].hp <= 0.0) {
                                state.entities[tgt].alive = 0u;
                            }

                            if (spell.self_heal_ratio > 0.0 && state.entities[src].alive == 1u) {
                                let healing = damage_dealt * spell.self_heal_ratio * get_healing_received_multiplier(state.entities[src], state.now);
                                let previous_hp = state.entities[src].hp;
                                state.entities[src].hp = min(state.entities[src].max_hp, previous_hp + healing);
                                let effective_heal = state.entities[src].hp - previous_hp;
                                record_event(logging, state.now, src, src, ev.spell_id, 2u, effective_heal);
                                if (state.entities[src].team == 0u) { damage_team0 += effective_heal * time_weight; }
                                else { damage_team1 += effective_heal * time_weight; }
                            }

                            // Apply CC on hit
                            if (spell.cc_type > 0u && spell.cc_duration_ms > 0u) {
                                // Use a local pointer: Naga SPIR-V emission crashes on dynamic array-element pointer arguments.
                                var effect_entity_3 = state.entities[tgt];
                                let applied = apply_cc(&effect_entity_3, spell.cc_type, spell.cc_duration_ms, state.now);
                                if (applied) { record_event(logging, state.now, src, tgt, ev.spell_id, 4u, 0.0); }
                                state.entities[tgt] = effect_entity_3;
                                if (spell.cc_type == 7u) {
                                    for (var a = 0u; a < 8u; a++) {
                                        let aura = state.entities[tgt].auras[a];
                                        if ((aura.aura_type & 0xFFu) == 8u && aura.expires_at > state.now && aura.next_tick_at == state.now + 1000u) {
                                            enqueue(&queue, Event(aura.next_tick_at, 7u, tgt, tgt, 17u, aura.aura_type >> 8u));
                                        }
                                    }
                                }
                                if (is_fleeing(state.entities[tgt], state.now) && state.entities[tgt].next_flee_at == 0u) {
                                    state.entities[tgt].next_flee_at = state.now + 500u;
                                    enqueue(&queue, Event(state.now + 500u, 6u, tgt, tgt, 0u, 0u));
                                }
                            }
                        }

                        // Apply aura (and periodic DoT/HoT tick chain via aura slot) on hit if specified
                        let aura_t = select(spell.aura_type, 7u, spell.aura_type == 0u && spell.is_dot == 1u);
                        if (aura_t > 0u && state.entities[tgt].alive == 1u) {
                            var aura_val = 0.0;
                            if (aura_t == 3u) { // PW:Shield absorb
                                aura_val = spell.absorb_base + state.entities[src].spell_power * spell.scaling;
                            } else if (aura_t == 6u) { // Root break threshold
                                aura_val = 300.0;
                            }
                            let aura_dur = select(15000u, spell.dot_duration_ms, spell.dot_duration_ms > 0u);
                            // Use a local pointer: Naga SPIR-V emission crashes on dynamic array-element pointer arguments.
                            var effect_entity_4 = state.entities[tgt];
                            let tick_gen = apply_aura(&effect_entity_4, ev.spell_id, aura_t, aura_dur, spell.dot_tick_ms, aura_val, src, state.now);
                            state.entities[tgt] = effect_entity_4;
                            if (spell.is_dot == 1u && tick_gen > 0u) {
                                enqueue(&queue, Event(state.now + spell.dot_tick_ms, 3u, src, tgt, ev.spell_id, tick_gen));
                            }
                        }
                    }
                }
            }

            // 3: DoT / HoT Tick (bound to active AuraSlot on recipient; refreshes do not stack duplicate tick chains)
            case 3u: {
                let spell = spellCatalog[ev.spell_id];
                if (state.entities[tgt].alive == 1u) {
                    var active_slot = 8u;
                    for (var a = 0u; a < 8u; a = a + 1u) {
                        let slot = state.entities[tgt].auras[a];
                        if (slot.spell_id == ev.spell_id && slot.source_id == src && (slot.aura_type >> 8u) == ev.generation && slot.expires_at >= state.now && slot.next_tick_at == state.now) {
                            active_slot = a;
                            break;
                        }
                    }
                    if (active_slot < 8u && spell.channel_ms > 0u) {
                        let dx = state.entities[src].pos_x - state.entities[tgt].pos_x;
                        let dy = state.entities[src].pos_y - state.entities[tgt].pos_y;
                        if (state.entities[src].cast_spell_id != ev.spell_id || state.entities[src].cast_end < state.now || incapacitated_until(state.entities[src]) > state.now || state.entities[src].silence_end > state.now || length(vec2<f32>(dx, dy)) > spell.range_yards || !has_line_of_sight(state.pillars, state.entities[src].pos_x, state.entities[src].pos_y, state.entities[tgt].pos_x, state.entities[tgt].pos_y)) {
                            state.entities[tgt].auras[active_slot].expires_at = state.now;
                            state.entities[tgt].auras[active_slot].next_tick_at = 0u;
                            if (state.entities[src].cast_spell_id == ev.spell_id) { state.entities[src].cast_spell_id = 0u; state.entities[src].cast_end = state.now; }
                            active_slot = 8u;
                        }
                    }
                    if (active_slot < 8u) {
                        if (state.entities[src].team != state.entities[tgt].team) {
                            state.entities[src].combat_until = state.now + 5000u;
                            state.entities[tgt].combat_until = state.now + 5000u;
                        } else if (state.entities[tgt].combat_until > state.now) {
                            state.entities[src].combat_until = state.now + 5000u;
                        }
                        if (spell.is_heal == 1u && spell.aura_type != 3u) {
                            let heal_mult = get_healing_received_multiplier(state.entities[tgt], state.now);
                            let tick_heal = (spell.dot_dmg_per_tick + spell.scaling * state.entities[src].spell_power * 0.2) * heal_mult;
                            let old_hp = state.entities[tgt].hp;
                            state.entities[tgt].hp = min(state.entities[tgt].max_hp, old_hp + tick_heal);
                            let eff_heal = state.entities[tgt].hp - old_hp;
                            record_event(logging, state.now, src, tgt, ev.spell_id, 2u, tick_heal);
                            if (state.entities[src].team == 0u) {
                                damage_team0 += eff_heal * time_weight;
                            } else {
                                damage_team1 += eff_heal * time_weight;
                            }
                        } else if (spell.is_heal == 0u) {
                            let dmg_red = get_damage_reduction_multiplier(state.entities[tgt], state.now);
                            let raw_dmg = (spell.dot_dmg_per_tick + spell.scaling * state.entities[src].spell_power * 0.2) * dmg_red;
                            // Use a local pointer: Naga SPIR-V emission crashes on dynamic array-element pointer arguments.
                            var effect_entity_5 = state.entities[tgt];
                            let tick_dmg = absorb_damage(&effect_entity_5, raw_dmg, state.now);
                            if (break_cc_on_damage(&effect_entity_5, tick_dmg, state.now)) { shortened_cc_target = tgt; }
                            state.entities[tgt] = effect_entity_5;
                            let dealt = min(tick_dmg, state.entities[tgt].hp);
                            state.entities[tgt].hp = max(0.0, state.entities[tgt].hp - tick_dmg);
                            if (spell.self_heal_ratio > 0.0) {
                                let old_hp = state.entities[src].hp;
                                state.entities[src].hp = min(state.entities[src].max_hp, old_hp + dealt * spell.self_heal_ratio * get_healing_received_multiplier(state.entities[src], state.now));
                                let healed = state.entities[src].hp - old_hp;
                                record_event(logging, state.now, src, src, ev.spell_id, 2u, healed);
                                if (state.entities[src].team == 0u) { damage_team0 += healed * time_weight; }
                                else { damage_team1 += healed * time_weight; }
                            }
                            record_event(logging, state.now, src, tgt, ev.spell_id, 1u, tick_dmg);
                            if (state.entities[src].team == 0u) {
                                damage_team0 += tick_dmg * time_weight;
                            } else {
                                damage_team1 += tick_dmg * time_weight;
                            }
                            if (state.entities[tgt].hp <= 0.0) {
                                state.entities[tgt].alive = 0u;
                            }
                        }
                        // Reschedule next tick if aura has not expired
                        let next_tick = state.now + spell.dot_tick_ms;
                        if (state.entities[tgt].alive == 1u && next_tick <= state.entities[tgt].auras[active_slot].expires_at) {
                            state.entities[tgt].auras[active_slot].next_tick_at = next_tick;
                            enqueue(&queue, Event(next_tick, 3u, src, tgt, ev.spell_id, ev.generation));
                        } else {
                            state.entities[tgt].auras[active_slot].next_tick_at = 0u;
                        }
                    }
                }
            }

            // 5: RHEA Decision Point (Action Execution from Plan)
            case 5u: {
                let step = decision_steps[src];
                {
                    let raw_gene = plan[src * 8u + min(step, horizon - 1u)];
                    var spell_id = raw_gene & 0xFFu;
                    if (!owns_spell(state.entities[src], spell_id)) { spell_id = 0u; }
                    let desired_range_u = (raw_gene >> 8u) & 0xFFu;
                    let desired_range = f32(desired_range_u);
                    var chosen_target = (raw_gene >> 16u) & 0xFFFFu;

                    // Resolve spell relationship before execution; beneficial spells cannot hit enemies.
                    let friendly_spell = spell_id > 0u && spellCatalog[spell_id].is_heal == 1u;
                    var valid_target = false;
                    if (chosen_target < num_units) {
                        valid_target = state.entities[chosen_target].alive == 1u &&
                            ((state.entities[chosen_target].team == state.entities[src].team) == friendly_spell);
                    }
                    if (spell_id > 0u && spellCatalog[spell_id].self_only == 1u) {
                        chosen_target = src;
                    } else if (!valid_target) {
                        chosen_target = src;
                        for (var candidate = 0u; candidate < num_units; candidate++) {
                            if (state.entities[candidate].alive == 1u &&
                                ((state.entities[candidate].team == state.entities[src].team) == friendly_spell)) {
                                chosen_target = candidate;
                                break;
                            }
                        }
                    }

                    // Utility and CC have an action target independent of attack focus.
                    if (spell_id > 0u && !friendly_spell && spellCatalog[spell_id].self_only == 0u &&
                        spellCatalog[spell_id].cc_type == 0u) {
                        state.entities[src].target_id = chosen_target;
                    }
                    let active_tgt = chosen_target;
                    decision_steps[src] = step + 1u;
                    state.entities[src].decision_count += 1u;

                    // Continuous time-proportional Mana Regeneration for casters (~80 mana/sec),
                    // independent of decision interval length or cast/stun duration.
                    let dt_mana_ms = state.now - min(state.now, state.entities[src].pad2);
                    state.entities[src].pad2 = state.now;
                    if (state.entities[src].power_type != 1u && dt_mana_ms > 0u) {
                        state.entities[src].power = min(state.entities[src].max_power, state.entities[src].power + f32(dt_mana_ms) * 0.08);
                    }

                    let is_stunned = state.now < incapacitated_until(state.entities[src]);
                    var may_cast = !is_stunned;
                    if (spell_id > 0u && spellCatalog[spell_id].blink_distance > 0.0) {
                        var unstunned = state.entities[src]; unstunned.controlled_stun_end = state.now;
                        if (unstunned.incapacitate_type == 1u) { unstunned.stun_end = state.now; }
                        may_cast = incapacitated_until(unstunned) <= state.now;
                    }
                    let is_silenced = state.now < state.entities[src].silence_end;
                    let is_casting = state.entities[src].cast_end > state.now || state.entities[src].dash_end > state.now;

                    let action_ready = spell_id > 0u && is_spell_valid(state.entities[src], spell_id) && !is_casting && may_cast && (!is_silenced || spellCatalog[spell_id].power_type == 1u) && state.now >= state.entities[src].gcd_end && state.now >= get_spell_cd_end(state.entities[src], spell_id);
                    let is_dash = spell_id > 0u && spellCatalog[spell_id].dash_speed > 0.0;
                    var dash_ready = false;
                    var dash_destination = vec2<f32>(0.0);
                    // Validate a dash at the decision's starting position. Only a
                    // successful activation replaces the independent range intent.
                    // Walking must not turn a rejected dash into a valid cast in
                    // this same decision by crossing its minimum/maximum range.
                    if (is_dash && action_ready) {
                        let spell = spellCatalog[spell_id];
                        let origin = vec2<f32>(state.entities[src].pos_x, state.entities[src].pos_y);
                        let recipient = vec2<f32>(state.entities[active_tgt].pos_x, state.entities[active_tgt].pos_y);
                        let delta = recipient - origin;
                        let dist = length(delta);
                        if (active_tgt != src && state.entities[active_tgt].alive == 1u && dist >= spell.min_range_yards && dist <= spell.range_yards && (spell.requires_out_of_combat == 0u || state.entities[src].combat_until <= state.now) && get_speed_multiplier(state.entities[src], state.now) > 0.0) {
                            dash_destination = recipient - delta / max(dist, 0.001) * 3.0;
                            dash_ready = has_line_of_sight(state.pillars, origin.x, origin.y, recipient.x, recipient.y) && dash_path_clear(state.pillars, origin, dash_destination);
                        }
                    }

                    // Online Learned Spatial Intent Execution:
                    // Unit smoothly tracks desired engagement distance relative to its enemy target
                    // (even when casting a friendly heal/shield on itself or an ally, so healers can kite enemies while healing!).
                    // Unit stands ground while channeling/casting spells; instant spells do not interrupt movement.
                    var move_ref_tgt = state.entities[src].target_id;
                    if (move_ref_tgt >= num_units || state.entities[move_ref_tgt].alive == 0u || state.entities[move_ref_tgt].team == state.entities[src].team) {
                        for (var cand_e = 0u; cand_e < num_units; cand_e = cand_e + 1u) {
                            if (state.entities[cand_e].alive == 1u && state.entities[cand_e].team != state.entities[src].team) {
                                move_ref_tgt = cand_e;
                                break;
                            }
                        }
                    }
                    if (!is_stunned && !is_casting && !dash_ready && move_ref_tgt < num_units && state.entities[move_ref_tgt].alive == 1u) {
                        let dx = state.entities[move_ref_tgt].pos_x - state.entities[src].pos_x;
                        let dy = state.entities[move_ref_tgt].pos_y - state.entities[src].pos_y;
                        let dist = sqrt(dx * dx + dy * dy);

                        if (dist > 0.1) {
                            var sign = 0.0;
                            if (dist > desired_range + 1.0) {
                                sign = 1.0; // Advance towards enemy reference to reach desired range
                            } else if (dist < desired_range - 1.0) {
                                sign = -1.0; // Kite / step back if closer than desired range
                            }

                            if (sign != 0.0) {
                                let nx = dx / dist;
                                let ny = dy / dist;
                                let dt_sec = 0.5; // ~500ms decision interval movement step
                                let speed_mult = get_speed_multiplier(state.entities[src], state.now);
                                let move_dist = state.entities[src].speed * speed_mult * dt_sec * sign;

                                let resolved_pos = resolve_pillar_collision(
                                    state.pillars,
                                    state.entities[src].pos_x + nx * move_dist,
                                    state.entities[src].pos_y + ny * move_dist
                                );
                                state.entities[src].pos_x = resolved_pos.x;
                                state.entities[src].pos_y = resolved_pos.y;
                            }
                        }
                    }

                    if (action_ready && (!is_dash || dash_ready)) {
                        let spell = spellCatalog[spell_id];
                        let cost = spell.cost;
                        
                        // Check range and pillar Line-of-Sight to active recipient
                        let dx = state.entities[active_tgt].pos_x - state.entities[src].pos_x;
                        let dy = state.entities[active_tgt].pos_y - state.entities[src].pos_y;
                        let dist = sqrt(dx * dx + dy * dy);
                        let in_los = spell.blink_distance > 0.0 || active_tgt == src || has_line_of_sight(state.pillars, state.entities[src].pos_x, state.entities[src].pos_y, state.entities[active_tgt].pos_x, state.entities[active_tgt].pos_y);

                        if (state.entities[src].power >= cost && (active_tgt == src || dist <= spell.range_yards) && in_los) {
                            if (state.entities[src].team != state.entities[active_tgt].team) {
                                state.entities[src].combat_until = state.now + 5000u;
                                state.entities[active_tgt].combat_until = state.now + 5000u;
                            } else if (state.entities[active_tgt].combat_until > state.now) {
                                state.entities[src].combat_until = state.now + 5000u;
                            }
                            // Universal GCD: 1500ms
                            state.entities[src].gcd_end = state.now + 1500u;

                            if (spell.cast_time_ms > 0u) {
                                // Cast-time spells deduct mana upon cast completion (case 2u)
                                state.entities[src].cast_spell_id = spell_id;
                                state.entities[src].cast_end = state.now + spell.cast_time_ms;
                                record_event(logging, state.now, src, active_tgt, spell_id, 3u, 0.0);
                                enqueue(&queue, Event(state.entities[src].cast_end, 2u, src, active_tgt, spell_id, 0u));
                            } else {
                                // Instant cast execution: deduct cost and record per-spell cooldown immediately
                                state.entities[src].power = min(state.entities[src].max_power, state.entities[src].power - cost + spell.power_gain);
                                if (spell.dash_speed > 0.0) {
                                    state.entities[src].dash_start = state.now;
                                    state.entities[src].dash_end = state.now + u32(ceil(max(0.0, dist - 3.0) / spell.dash_speed * 1000.0));
                                    state.entities[src].dash_origin_x = state.entities[src].pos_x;
                                    state.entities[src].dash_origin_y = state.entities[src].pos_y;
                                    state.entities[src].dash_dest_x = dash_destination.x;
                                    state.entities[src].dash_dest_y = dash_destination.y;
                                    state.pad0 |= 2u << src;
                                    enqueue(&queue, Event(state.entities[src].dash_end, 8u, src, active_tgt, spell_id, 0u));
                                    record_event(logging, state.now, src, active_tgt, spell_id, 6u, 0.0);
                                }
                                if (spell.cooldown_ms > 0u) {
                                    var cd_entity_inst = state.entities[src];
                                    set_spell_cd_end(&cd_entity_inst, spell_id, state.now + spell.cooldown_ms);
                                    state.entities[src] = cd_entity_inst;
                                }
                                if (spell.is_heal == 1u && spell.aura_type != 3u) {
                                    let heal_mult = get_healing_received_multiplier(state.entities[active_tgt], state.now);
                                    let heal = (spell.base_dmg_min + spell.scaling * state.entities[src].spell_power) * heal_mult;
                                    let old_hp = state.entities[active_tgt].hp;
                                    state.entities[active_tgt].hp = min(state.entities[active_tgt].max_hp, old_hp + heal);
                                    let eff_heal = state.entities[active_tgt].hp - old_hp;
                                    record_event(logging, state.now, src, active_tgt, spell_id, 2u, heal);
                                    if (state.entities[src].team == 0u) {
                                        damage_team0 += eff_heal * time_weight;
                                    } else {
                                        damage_team1 += eff_heal * time_weight;
                                    }
                                } else if (spell.is_heal == 0u && !is_dash) {
                                    // Physical abilities (power_type == 1u) are mitigated by Armor; magic spells ignore physical Armor.
                                    let armor_mul = select(1.0, 1000.0 / (1000.0 + state.entities[active_tgt].armor), spell.power_type == 1u);
                                    let dmg_red = get_damage_reduction_multiplier(state.entities[active_tgt], state.now);
                                    let power_stat = select(state.entities[src].spell_power, state.entities[src].attack_power, spell.power_type == 1u);
                                    let raw_dmg = (spell.base_dmg_min + select(spell.scaling, 0.0, spell.is_dot == 1u) * power_stat) * armor_mul * dmg_red;
                                    // Use a local pointer: Naga SPIR-V emission crashes on dynamic array-element pointer arguments.
                                    var effect_entity_6 = state.entities[active_tgt];
                                    let final_dmg = absorb_damage(&effect_entity_6, raw_dmg, state.now);
                                    if (break_cc_on_damage(&effect_entity_6, final_dmg, state.now)) { shortened_cc_target = active_tgt; }
                                    state.entities[active_tgt] = effect_entity_6;

                                    let damage_dealt = min(final_dmg, state.entities[active_tgt].hp);
                                    state.entities[active_tgt].hp = max(0.0, state.entities[active_tgt].hp - final_dmg);
                                    if (final_dmg > 0.0) { record_event(logging, state.now, src, active_tgt, spell_id, 1u, final_dmg); }
                                    if (state.entities[src].team == 0u) {
                                        damage_team0 += final_dmg * time_weight;
                                    } else {
                                        damage_team1 += final_dmg * time_weight;
                                    }
                                    if (state.entities[active_tgt].hp <= 0.0) {
                                        state.entities[active_tgt].alive = 0u;
                                    }

                                    if (spell.self_heal_ratio > 0.0 && state.entities[src].alive == 1u) {
                                        let healing = damage_dealt * spell.self_heal_ratio * get_healing_received_multiplier(state.entities[src], state.now);
                                        let previous_hp = state.entities[src].hp;
                                        state.entities[src].hp = min(state.entities[src].max_hp, previous_hp + healing);
                                        let effective_heal = state.entities[src].hp - previous_hp;
                                        record_event(logging, state.now, src, src, spell_id, 2u, effective_heal);
                                        if (state.entities[src].team == 0u) { damage_team0 += effective_heal * time_weight; }
                                        else { damage_team1 += effective_heal * time_weight; }
                                    }

                                    // Apply CC on instant hit
                                    if (spell.cc_type > 0u && spell.cc_duration_ms > 0u) {
                                        // Use a local pointer: Naga SPIR-V emission crashes on dynamic array-element pointer arguments.
                                        var effect_entity_7 = state.entities[active_tgt];
                                        let applied = apply_cc(&effect_entity_7, spell.cc_type, spell.cc_duration_ms, state.now);
                                        if (applied) { record_event(logging, state.now, src, active_tgt, spell_id, 4u, 0.0); }
                                        state.entities[active_tgt] = effect_entity_7;
                                        if (is_fleeing(state.entities[active_tgt], state.now) && state.entities[active_tgt].next_flee_at == 0u) {
                                            state.entities[active_tgt].next_flee_at = state.now + 500u;
                                            enqueue(&queue, Event(state.now + 500u, 6u, active_tgt, active_tgt, 0u, 0u));
                                        }
                                    }
                                }

                                if (spell.channel_ms > 0u) {
                                    state.entities[src].cast_spell_id = spell_id;
                                    state.entities[src].cast_end = state.now + spell.channel_ms;
                                    record_event(logging, state.now, src, active_tgt, spell_id, 3u, 0.0);
                                    // Restart the channel with exactly one tick chain, including
                                    // when switching targets. Rebuild the heap without stale ticks.
                                    var retained: SimQueue;
                                    retained.size = 0u;
                                    retained.overflow = queue.overflow;
                                    for (var q = 0u; q < queue.size; q++) {
                                        let pending = queue.events[q];
                                        if (pending.kind != 3u || pending.source_id != src || pending.spell_id != spell_id) {
                                            enqueue(&retained, pending);
                                        }
                                    }
                                    queue = retained;
                                    for (var target_idx = 0u; target_idx < num_units; target_idx++) {
                                        for (var a = 0u; a < 8u; a++) {
                                            if (state.entities[target_idx].auras[a].spell_id == spell_id && state.entities[target_idx].auras[a].source_id == src) {
                                                state.entities[target_idx].auras[a].expires_at = state.now;
                                                state.entities[target_idx].auras[a].next_tick_at = 0u;
                                            }
                                        }
                                    }
                                }
                                if (spell.blink_distance > 0.0) {
                                    var mover = state.entities[src];
                                    for (var a = 0u; a < 8u; a++) {
                                        if ((mover.auras[a].aura_type & 0xFFu) == 6u) { mover.auras[a].expires_at = state.now; }
                                    }
                                    mover.controlled_stun_end = state.now;
                                    if (mover.incapacitate_type == 1u) { mover.stun_end = state.now; }
                                    let length = max(0.001, dist);
                                    let direction = vec2<f32>(dx, dy) / length * select(1.0, -1.0, desired_range > dist);
                                    var position = vec2<f32>(mover.pos_x, mover.pos_y);
                                    for (var b = 0u; b < 40u; b++) {
                                        if (f32(b) * 0.5 >= spell.blink_distance) { break; }
                                        let next = clamp(position + direction * 0.5, vec2<f32>(2.0), vec2<f32>(58.0, 38.0));
                                        let resolved = resolve_pillar_collision(state.pillars, next.x, next.y);
                                        if (distance(next, resolved) > 0.001) { break; }
                                        position = next;
                                    }
                                    mover.pos_x = position.x; mover.pos_y = position.y;
                                    state.entities[src] = mover;
                                    record_event(logging, state.now, src, src, spell_id, 6u, 0.0);
                                }
                                // Apply aura (and periodic DoT/HoT tick chain via aura slot) on instant hit
                                let aura_t = select(spell.aura_type, 7u, spell.aura_type == 0u && spell.is_dot == 1u);
                                if (aura_t > 0u && state.entities[active_tgt].alive == 1u) {
                                    var aura_val = 0.0;
                                    if (aura_t == 3u) { // PW:Shield absorb
                                        aura_val = spell.absorb_base + state.entities[src].spell_power * spell.scaling;
                                    } else if (aura_t == 6u) { // Root break threshold
                                        aura_val = 300.0;
                                    }
                                    let aura_dur = select(15000u, spell.dot_duration_ms, spell.dot_duration_ms > 0u);
                                    // Use a local pointer: Naga SPIR-V emission crashes on dynamic array-element pointer arguments.
                                    var effect_entity_8 = state.entities[active_tgt];
                                    let tick_gen = apply_aura(&effect_entity_8, spell_id, aura_t, aura_dur, spell.dot_tick_ms, aura_val, src, state.now);
                                    state.entities[active_tgt] = effect_entity_8;
                                    if (spell.is_dot == 1u && tick_gen > 0u) {
                                        enqueue(&queue, Event(state.now + spell.dot_tick_ms, 3u, src, active_tgt, spell_id, tick_gen));
                                    }
                                }
                            }
                        }
                    }

                    // Schedule next decision: at least 500ms into the future, or after active GCD / cast / stun
                    let cast_busy_end = max(state.entities[src].gcd_end, state.entities[src].cast_end);
                    let before_cc = max(state.now + 500u, cast_busy_end + 50u);
                    let busy_end = max(cast_busy_end, incapacitated_until(state.entities[src]));
                    let next_decision = max(state.now + 500u, busy_end + 50u);
                    let cc_delay_origin = select(0u, before_cc, next_decision > before_cc);
                    enqueue(&queue, Event(next_decision, 5u, src, active_tgt, 0u, cc_delay_origin));
                }
            }

            case 8u: { // Gap-closer arrival; cancelled transit has dash_end = 0.
                let spell = spellCatalog[ev.spell_id];
                let origin = vec2<f32>(state.entities[src].pos_x, state.entities[src].pos_y);
                let recipient = vec2<f32>(state.entities[tgt].pos_x, state.entities[tgt].pos_y);
                if (state.entities[src].dash_end == state.now && state.entities[tgt].alive == 1u &&
                    incapacitated_until(state.entities[src]) <= state.now && get_speed_multiplier(state.entities[src], state.now) > 0.0 &&
                    state.entities[src].team != state.entities[tgt].team && distance(origin, recipient) <= 5.0 &&
                    has_line_of_sight(state.pillars, origin.x, origin.y, recipient.x, recipient.y)) {
                    var victim = state.entities[tgt];
                    let raw = spell.base_dmg_min * 1000.0 / (1000.0 + victim.armor) * get_damage_reduction_multiplier(victim, state.now);
                    let damage = absorb_damage(&victim, raw, state.now);
                    if (break_cc_on_damage(&victim, damage, state.now)) { shortened_cc_target = tgt; }
                    victim.hp = max(0.0, victim.hp - damage);
                    if (victim.hp <= 0.0) { victim.alive = 0u; }
                    if (damage > 0.0) { record_event(logging, state.now, src, tgt, ev.spell_id, 1u, damage); }
                    if (state.entities[src].team == 0u) { damage_team0 += damage * time_weight; }
                    else { damage_team1 += damage * time_weight; }
                    if (victim.alive == 1u && apply_cc(&victim, spell.cc_type, spell.cc_duration_ms, state.now)) {
                        record_event(logging, state.now, src, tgt, ev.spell_id, 4u, 0.0);
                    }
                    victim.combat_until = state.now + 5000u;
                    state.entities[tgt] = victim;
                    state.entities[src].combat_until = state.now + 5000u;
                }
            }

            case 7u: { // Polymorph regeneration follows its own aura generation.
                for (var a = 0u; a < 8u; a++) {
                    let aura = state.entities[src].auras[a];
                    if ((aura.aura_type & 0xFFu) == 8u && (aura.aura_type >> 8u) == ev.generation && aura.expires_at >= state.now && aura.next_tick_at == state.now) {
                        let old_hp = state.entities[src].hp;
                        // Temporary tuning: each active Polymorph tick fills HP,
                        // including through healing-reduction effects.
                        state.entities[src].hp = state.entities[src].max_hp;
                        let healed = state.entities[src].hp - old_hp;
                        record_event(logging, state.now, src, src, ev.spell_id, 2u, healed);
                        // Penalize the Polymorph caster's team (opposing src.team) for healing the enemy,
                        // and never credit src.team with active healing reward for being sheeped.
                        if (state.entities[src].team == 0u) { damage_team1 -= healed * time_weight; }
                        else { damage_team0 -= healed * time_weight; }
                        state.entities[src].auras[a].next_tick_at = state.now + 1000u;
                        if (state.now + 1000u <= aura.expires_at) { enqueue(&queue, Event(state.now + 1000u, 7u, src, src, ev.spell_id, ev.generation)); }
                    }
                }
            }

            // Independent of action selection: fleeing never consumes a plan gene.
            case 6u: {
                if (state.entities[src].next_flee_at != state.now) { continue; }
                state.entities[src].next_flee_at = 0u;
                if (is_fleeing(state.entities[src], state.now)) {
                    var hard_stun = state.entities[src].controlled_stun_end > state.now || (state.entities[src].stun_end > state.now && state.entities[src].incapacitate_type == 1u);
                    for (var a = 0u; a < 8u; a++) {
                        if ((state.entities[src].auras[a].aura_type & 0xFFu) == 8u && state.entities[src].auras[a].expires_at > state.now) { hard_stun = true; }
                    }
                    if (!hard_stun) {
                        let direction = flee_direction(src, state.now);
                        let distance = state.entities[src].speed * get_speed_multiplier(state.entities[src], state.now) * 0.5;
                        let position = resolve_pillar_collision(state.pillars,
                            state.entities[src].pos_x + direction.x * distance,
                            state.entities[src].pos_y + direction.y * distance);
                        state.entities[src].pos_x = position.x;
                        state.entities[src].pos_y = position.y;
                    }
                    state.entities[src].next_flee_at = state.now + 500u;
                    enqueue(&queue, Event(state.now + 500u, 6u, src, src, 0u, 0u));
                }
            }

            default: {}
        }
        if (shortened_cc_target < num_units) {
            // A hit may break Polymorph and then apply another CC (e.g. Horror).
            // Use the final state so remaining/new CC and GCDs still gate acting.
            resume_decision_after_cc_break(&queue, state.entities[shortened_cc_target], state.now);
        }
        update_dashes(&state, state.now);
        for (var u = 0u; u < num_units; u++) {
            if (was_alive[u] == 1u && state.entities[u].alive == 0u) {
                record_event(logging, state.now, src, u, ev.spell_id, 5u, 0.0);
            }
        }
    }

    state.pad1 = queue.overflow;
    // Never advance past unprocessed due events if the iteration budget was exhausted.
    var pending_due = false;
    if (queue.size > 0u) { pending_due = queue.events[0].at <= max_time_ms; }
    if (pending_due) { state.pad1 = 1u; }
    else { update_dashes(&state, max_time_ms); state.now = max_time_ms; }
    return CombatResult(state, queue, damage_team0, damage_team1);
}

@compute @workgroup_size(32)
fn simulate_candidate(@builtin(global_invocation_id) id: vec3<u32>) {
    let cand_idx = searchSlice.x + id.x;
    if (id.x >= searchSlice.y) { return; }
    if (cand_idx >= simParams.y) { return; }
    let half_pop = simParams.y / 2u;
    var plan: array<u32, 48>;
    for (var u = 0u; u < 6u; u++) {
        let mine = (liveState.entities[u].team == 0u) == (cand_idx < half_pop);
        for (var h = 0u; h < simParams.z; h++) {
            let offset = u * simParams.z + h;
            plan[u * 8u + h] = select(bestPlan[offset], candidatePlans[cand_idx * 6u * simParams.z + offset], mine);
        }
    }
    let result = advance_combat(liveState, liveQueue, plan, simParams.z, liveState.now + simParams.w, false);
    let state = result.state;
    let num_units = state.num_entities;
    let damage_team0 = result.damage0;
    let damage_team1 = result.damage1;

    // Objective Fitness Evaluation (Symmetric & Purely Outcome-Driven)
    // No artificial distance penalties or hardcoded positional shaping.
    // Includes terminal HP, alive unit bonus (eliminating enemy units), and fast-win bonus
    // so teams are strictly incentivized to secure kills quickly rather than farm damage/healing cycles.
    var team0_hp = 0.0;
    var team1_hp = 0.0;
    var team0_alive = 0.0;
    var team1_alive = 0.0;
    for (var u = 0u; u < num_units; u = u + 1u) {
        if (state.entities[u].max_hp > 0.0) {
            if (state.entities[u].team == 0u) {
                team0_hp += state.entities[u].hp;
                if (state.entities[u].alive == 1u && state.entities[u].hp > 0.0) {
                    team0_alive += 1.0;
                }
            } else {
                team1_hp += state.entities[u].hp;
                if (state.entities[u].alive == 1u && state.entities[u].hp > 0.0) {
                    team1_alive += 1.0;
                }
            }
        }
    }

    // Time-discounted urgency bonus when a team wipes out the opposition before rollout horizon end
    let horizon_end = liveState.now + simParams.w;
    let remaining_sec = f32(horizon_end - min(state.now, horizon_end)) * 0.001;
    let win_urgency_t0 = select(0.0, 2000.0 + remaining_sec * 500.0, team0_alive > 0.0 && team1_alive == 0.0);
    let win_urgency_t1 = select(0.0, 2000.0 + remaining_sec * 500.0, team1_alive > 0.0 && team0_alive == 0.0);
    let alive_diff_t0 = (team0_alive - team1_alive) * 4000.0;

    // Team 0 Population optimizes Team 0's objective
    // Team 1 Population optimizes Team 1's objective
    var fitness = 0.0;
    if (cand_idx < half_pop) {
        // Team 0 Fitness: preserve Team 0 HP & units, deal net time-weighted pressure, eliminate Team 1
        fitness = (team0_hp * 2.0 + damage_team0 * 0.25 + alive_diff_t0 + win_urgency_t0) - (team1_hp * 2.0);
    } else {
        // Team 1 Fitness: preserve Team 1 HP & units, deal net time-weighted pressure, eliminate Team 0
        fitness = (team1_hp * 2.0 + damage_team1 * 0.25 - alive_diff_t0 + win_urgency_t1) - (team0_hp * 2.0);
    }

    // Track spell-specific fitness for Mage (unit 2) across Team 1 candidates
    if (cand_idx >= half_pop && cand_idx < simParams.y && state.pad1 == 0u) {
        let mage_gene = candidatePlans[(cand_idx * 6u + 2u) * simParams.z];
        let mage_spell = mage_gene & 0xFFu;
        let mage_tgt = (mage_gene >> 16u) & 0xFFFFu;
        let quant_f = clamp(u32(max(0.0, fitness + 100000.0) * 0.25), 1u, 65535u);
        let packed_spell = (quant_f << 16u) | (mage_tgt & 0xFFFFu);
        if (mage_spell == 10u) {
            atomicMax(&bestCandidateResult[4], packed_spell);
        } else if (mage_spell == 11u) {
            atomicMax(&bestCandidateResult[5], packed_spell);
        } else if (mage_spell == 17u) {
            atomicMax(&bestCandidateResult[6], packed_spell);
        }
    }

    candidateFitness[cand_idx] = select(fitness, -999999.0, state.pad1 != 0u);
}

// Commit both teams' extracted actions using exactly the rollout mechanics.
@compute @workgroup_size(32)
fn advance_live(@builtin(global_invocation_id) id: vec3<u32>) {
    if (id.x != 0u) { return; }
    var plan: array<u32, 48>;
    for (var u = 0u; u < 6u; u++) {
        // Skip only actions whose decision events elapsed since this plan's snapshot,
        // and carry the remaining shifted horizon forward across multiple decisions if needed.
        let consumed = liveState.entities[u].decision_count - min(liveState.entities[u].decision_count, planOrigin[u + 1u]);
        for (var h = 0u; h < 8u; h++) {
            plan[u * 8u + h] = bestPlan[u * 8u + min(consumed + h, 7u)];
        }
    }
    let result = advance_combat(liveState, liveQueue, plan, 8u, liveParams.x, true);
    liveState = result.state;
    liveQueue = result.queue;
}

// Dynamic action masking: checks if spell is castable by entity given power and class resource
fn owns_spell(unit: EntityState, spell_id: u32) -> bool {
    if (spell_id >= arrayLength(&spellCatalog)) { return false; }
    return spell_id == 0u || spellCatalog[spell_id].class_id == unit.class_id;
}

fn is_spell_valid(input_unit: EntityState, spell_id: u32) -> bool {
    var unit = input_unit;
    if (spell_id == 0u) {
        return true; // Idle / Wait is always valid
    }
    if (!owns_spell(unit, spell_id)) { return false; }
    let spell = spellCatalog[spell_id];
    // Check power type match (e.g. Rage user cannot cast Mana spell, Mana user cannot cast Rage spell)
    if (spell.power_type != unit.power_type) {
        return false;
    }
    // Check cost
    if (unit.power < spell.cost) {
        return false;
    }
    return true;
}

// Compute Kernel: Mutate & Coordinate-Ascent / Crossover Population
@compute @workgroup_size(32)
fn mutate_population(@builtin(global_invocation_id) id: vec3<u32>) {
    let cand_idx = searchSlice.x + id.x;
    if (id.x >= searchSlice.y) { return; }
    let pop_size = simParams.y;
    let half_pop = pop_size / 2u;
    let horizon = simParams.z;
    if (cand_idx >= pop_size) {
        return;
    }

    var rng = simParams.x + cand_idx * 7919u + 55u;
    let num_units = liveState.num_entities;
    let is_team0_candidate = cand_idx < half_pop;
    let now = liveState.now;

    // 50% of candidates perform Coordinate-Ascent (mutating a single friendly unit's trajectory while
    // preserving teammates' elite plans) so independent unit improvements don't scramble teammates.
    let single_unit_mode = (cand_idx & 1u) == 1u;
    var focus_unit = 6u;
    if (single_unit_mode) {
        for (var t = 0u; t < 6u; t = t + 1u) {
            let pick = xorshift32(&rng) % num_units;
            if (liveState.entities[pick].alive == 1u && ((liveState.entities[pick].team == 0u) == is_team0_candidate)) {
                focus_unit = pick;
                break;
            }
        }
    }

    for (var u = 0u; u < 6u; u = u + 1u) {
        let unit = liveState.entities[u];
        let is_my_team = (unit.team == 0u && is_team0_candidate) || (unit.team == 1u && !is_team0_candidate);
        let skip_unit = single_unit_mode && focus_unit < 6u && u != focus_unit;

        for (var h = 0u; h < horizon; h = h + 1u) {
            let offset = (cand_idx * 6u + u) * horizon + h;
            
            // If this unit belongs to the opposing team, is skipped by coordinate ascent, or is candidate 0 / half_pop (elite baselines), preserve current league elite
            if (!is_my_team || skip_unit || cand_idx == 0u || cand_idx == half_pop) {
                candidatePlans[offset] = bestPlan[u * horizon + h];
                continue;
            }

            // Dynamic Mutation Rate: higher exploration (45%) on unassigned/idle genes to rapidly discover active abilities
            let current_gene = bestPlan[u * horizon + h];
            let current_spell = current_gene & 0xFFu;
            let mut_rate = select(0.30, 0.50, current_spell == 0u);

            if (rand_float(&rng) < mut_rate) {
                // Explore single coordinates as well as joint changes.
                let mutation_axis = xorshift32(&rng) % 4u;
                var chosen_spell = current_spell;
                if (mutation_axis == 0u || mutation_axis == 3u) {
                // Pick random spell across the catalog; rejection sample up to 8 times to find a valid active spell.
                // At h == 0, require current snapshot resource affordability AND off-cooldown; at future steps (h > 0),
                // allow any class-owned spell so RHEA can plan spenders after future rage/mana generation and cooldown expiry.
                chosen_spell = 0u;
                for (var trial = 0u; trial < 8u; trial = trial + 1u) {
                    // Bias slightly away from 0 (idle) during mutation so units actively test abilities
                    let cand_spell = (xorshift32(&rng) % (arrayLength(&spellCatalog) - 1u)) + 1u;
                    let valid_h0 = is_spell_valid(unit, cand_spell) && now >= get_spell_cd_end(unit, cand_spell);
                    let valid = select(owns_spell(unit, cand_spell), valid_h0, h == 0u);
                    if (valid) {
                        chosen_spell = cand_spell;
                        break;
                    }
                }

                // If no valid active spell found, 10% chance to stay idle, otherwise retry once
                if (chosen_spell == 0u && rand_float(&rng) > 0.10) {
                    let cand_spell = xorshift32(&rng) % arrayLength(&spellCatalog);
                    let valid_h0 = is_spell_valid(unit, cand_spell) && now >= get_spell_cd_end(unit, cand_spell);
                    let valid = select(owns_spell(unit, cand_spell), valid_h0, h == 0u);
                    if (valid) {
                        chosen_spell = cand_spell;
                    }
                }

                }

                // Emergent Target Search: pick any valid entity of matching relationship
                var chosen_target = (current_gene >> 16u) & 0xFFFFu;
                if (mutation_axis == 1u || mutation_axis == 3u) {
                let is_healing_spell = spellCatalog[chosen_spell].is_heal == 1u;
                
                // Sample random targets to find enemy for damage/movement or friendly for heal
                for (var trial = 0u; trial < 4u; trial = trial + 1u) {
                    let cand_t = xorshift32(&rng) % num_units;
                    let cand_ent = liveState.entities[cand_t];
                    if (cand_ent.alive == 1u) {
                        if (is_healing_spell && cand_ent.team == unit.team) {
                            chosen_target = cand_t;
                            break;
                        } else if (!is_healing_spell && cand_ent.team != unit.team) {
                            chosen_target = cand_t;
                            break;
                        }
                    }
                }

                }

                // Online Learned Spatial Intent Search:
                // Mutates desired engagement distance:
                // Melee units (rage users) desire 0y (point blank)
                // Mana casters / healers search optimal combat spacing among [5y, 15y, 25y, 30y]
                // so short-range CC (Psychic Scream 8y, Frost Nova 10y) and kiting can both emerge.
                var chosen_range = (current_gene >> 8u) & 0xFFu;
                if (mutation_axis == 2u || mutation_axis == 3u) {
                chosen_range = 0u;
                if (unit.power_type != 1u) {
                    let range_pick = xorshift32(&rng) % 4u;
                    if (range_pick == 0u) {
                        chosen_range = 5u;
                    } else if (range_pick == 1u) {
                        chosen_range = 15u;
                    } else if (range_pick == 2u) {
                        chosen_range = 25u;
                    } else {
                        chosen_range = 30u;
                    }
                }

                }

                // Pack tri-gene: bits 0..7 = spell_id, bits 8..15 = desired_range, bits 16..31 = target_id
                candidatePlans[offset] = (chosen_spell & 0xFFu) | ((chosen_range & 0xFFu) << 8u) | ((chosen_target & 0xFFFFu) << 16u);
            } else {
                candidatePlans[offset] = bestPlan[u * horizon + h];
            }
        }
    }
}

// Compute Kernel: Extract Elite Candidate Plans into bestPlan buffer
// Decode winning indices; telemetry retains the existing tenths-point format.
@compute @workgroup_size(1)
fn extract_elite_plan(@builtin(global_invocation_id) id: vec3<u32>) {
    let best_t0_idx = atomicLoad(&bestCandidateResult[1]) - 1u;
    let best_t1_idx = atomicLoad(&bestCandidateResult[3]) - 1u;
    let fit_t0 = u32(max(1.0, (candidateFitness[best_t0_idx] + 100000.0) * 10.0));
    let fit_t1 = u32(max(1.0, (candidateFitness[best_t1_idx] + 100000.0) * 10.0));
    atomicStore(&bestCandidateResult[0], best_t0_idx);
    atomicStore(&bestCandidateResult[1], fit_t0);
    atomicStore(&bestCandidateResult[2], best_t1_idx);
    atomicStore(&bestCandidateResult[3], fit_t1);
    let horizon = simParams.z;

    for (var u = 0u; u < 6u; u = u + 1u) {
        let is_t0 = liveState.entities[u].team == 0u;
        let source_idx = select(best_t1_idx, best_t0_idx, is_t0);
        for (var h = 0u; h < horizon; h = h + 1u) {
            let src_offset = (source_idx * 6u + u) * horizon + h;
            bestPlan[u * horizon + h] = candidatePlans[src_offset];
        }
    }
}

// Align the previous committed plan to the immutable search snapshot.
@compute @workgroup_size(32)
fn prepare_search(@builtin(global_invocation_id) id: vec3<u32>) {
    if (id.x != 0u) { return; }
    planOrigin[0] = liveState.now;
    for (var u = 0u; u < 6u; u++) {
        let count = liveState.entities[u].decision_count;
        let consumed = count - min(count, committedOrigin[u + 1u]);
        planOrigin[u + 1u] = count;
        for (var h = 0u; h < 8u; h++) {
            bestPlan[u * 8u + h] = committedPlan[u * 8u + min(consumed + h, 7u)];
        }
    }
}
`;
