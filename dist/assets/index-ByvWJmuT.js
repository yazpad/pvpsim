(function(){let e=document.createElement(`link`).relList;if(e&&e.supports&&e.supports(`modulepreload`))return;for(let e of document.querySelectorAll(`link[rel="modulepreload"]`))n(e);new MutationObserver(e=>{for(let t of e)if(t.type===`childList`)for(let e of t.addedNodes)e.tagName===`LINK`&&e.rel===`modulepreload`&&n(e)}).observe(document,{childList:!0,subtree:!0});function t(e){let t={};return e.integrity&&(t.integrity=e.integrity),e.referrerPolicy&&(t.referrerPolicy=e.referrerPolicy),t.credentials=e.crossOrigin===`use-credentials`?`include`:e.crossOrigin===`anonymous`?`omit`:`same-origin`,t}function n(e){if(e.ep)return;e.ep=!0;let n=t(e);fetch(e.href,n)}})();var e=32768,t=65536,n=1.5,r=[{x:18,y:15,r:2.8},{x:42,y:15,r:2.8},{x:18,y:25,r:2.8},{x:42,y:25,r:2.8}],i=2480,a=1924,o={uint:{id:0,team:1,alive:2,targetId:3,powerType:8,gcdEnd:9,castEnd:10,castSpellId:11,swingTimer:12,swingSpeedMs:13,stunEnd:21,silenceEnd:22,drStunCount:23,drStunResetAt:24,decisionCount:26,extraCooldowns:28,horrorEnd:29,incapacitateType:30,nextFleeAt:31,extraCooldowns2:32,extraCooldowns3:33,polymorphDrCount:34,polymorphDrResetAt:35},float:{hp:4,maxHp:5,power:6,maxPower:7,attackPower:14,spellPower:15,critChance:16,armor:17,posX:18,posY:19,speed:20}},s=[{id:0,classId:0,name:`Idle / Wait`,icon:`/icons/ability_meleedamage.png`,castTimeMs:0,cooldownMs:0,cost:0,powerType:0,rangeYards:0,baseDamageMin:0,baseDamageMax:0,scaling:0,isHeal:0,isDot:0,dotDurationMs:0,dotTickMs:0,dotDamagePerTick:0,ccType:0,ccDurationMs:0,auraType:0},{id:1,classId:1,name:`Mortal Strike`,icon:`/icons/ability_warrior_savageblow.png`,castTimeMs:0,cooldownMs:6e3,cost:30,powerType:1,rangeYards:5,baseDamageMin:220,baseDamageMax:260,scaling:1.1,isHeal:0,isDot:0,dotDurationMs:1e4,dotTickMs:0,dotDamagePerTick:0,ccType:0,ccDurationMs:0,auraType:1},{id:2,classId:1,name:`Rend`,icon:`/icons/ability_gouge.png`,castTimeMs:0,cooldownMs:0,cost:10,powerType:1,rangeYards:5,baseDamageMin:30,baseDamageMax:40,scaling:.2,isHeal:0,isDot:1,dotDurationMs:12e3,dotTickMs:3e3,dotDamagePerTick:75,ccType:0,ccDurationMs:0,auraType:7},{id:3,classId:1,name:`Hamstring`,icon:`/icons/ability_shockwave.png`,castTimeMs:0,cooldownMs:0,cost:10,powerType:1,rangeYards:5,baseDamageMin:45,baseDamageMax:55,scaling:.15,isHeal:0,isDot:0,dotDurationMs:8e3,dotTickMs:0,dotDamagePerTick:0,ccType:0,ccDurationMs:0,auraType:5},{id:4,classId:1,name:`Shield Wall`,icon:`/icons/ability_warrior_shieldwall.png`,castTimeMs:0,cooldownMs:3e4,cost:15,powerType:1,rangeYards:0,baseDamageMin:0,baseDamageMax:0,scaling:0,isHeal:1,isDot:0,dotDurationMs:8e3,dotTickMs:0,dotDamagePerTick:0,ccType:0,ccDurationMs:0,auraType:2},{id:5,classId:2,name:`Flash Heal`,icon:`/icons/spell_holy_heal02.png`,castTimeMs:1500,cooldownMs:0,cost:380,powerType:0,rangeYards:35,baseDamageMin:480,baseDamageMax:580,scaling:.85,isHeal:1,isDot:0,dotDurationMs:0,dotTickMs:0,dotDamagePerTick:0,ccType:0,ccDurationMs:0,auraType:0},{id:6,classId:2,name:`Renew`,icon:`/icons/spell_holy_renew.png`,castTimeMs:0,cooldownMs:0,cost:290,powerType:0,rangeYards:35,baseDamageMin:0,baseDamageMax:0,scaling:.3,isHeal:1,isDot:1,dotDurationMs:15e3,dotTickMs:3e3,dotDamagePerTick:110,ccType:0,ccDurationMs:0,auraType:4},{id:7,classId:2,name:`Power Word: Shield`,icon:`/icons/spell_holy_powerwordshield.png`,castTimeMs:0,cooldownMs:4e3,cost:420,powerType:0,rangeYards:35,baseDamageMin:0,baseDamageMax:0,scaling:1,isHeal:1,isDot:0,dotDurationMs:15e3,dotTickMs:0,dotDamagePerTick:0,ccType:0,ccDurationMs:0,auraType:3},{id:8,classId:2,name:`Shadow Word: Pain`,icon:`/icons/spell_shadow_shadowwordpain.png`,castTimeMs:0,cooldownMs:0,cost:260,powerType:0,rangeYards:35,baseDamageMin:0,baseDamageMax:0,scaling:.25,isHeal:0,isDot:1,dotDurationMs:18e3,dotTickMs:3e3,dotDamagePerTick:85,ccType:0,ccDurationMs:0,auraType:7},{id:9,classId:2,name:`Psychic Scream`,icon:`/icons/spell_shadow_psychicscream.png`,castTimeMs:0,cooldownMs:24e3,cost:320,powerType:0,rangeYards:8,baseDamageMin:0,baseDamageMax:0,scaling:0,isHeal:0,isDot:0,dotDurationMs:0,dotTickMs:0,dotDamagePerTick:0,ccType:4,ccDurationMs:4e3,auraType:0},{id:10,classId:3,name:`Frostbolt`,icon:`/icons/spell_frostbolt.png`,castTimeMs:2e3,cooldownMs:0,cost:290,powerType:0,rangeYards:35,baseDamageMin:320,baseDamageMax:380,scaling:.9,isHeal:0,isDot:0,dotDurationMs:5e3,dotTickMs:0,dotDamagePerTick:0,ccType:0,ccDurationMs:0,auraType:5},{id:11,classId:3,name:`Fire Blast`,icon:`/icons/spell_fire_fire.png`,castTimeMs:0,cooldownMs:8e3,cost:310,powerType:0,rangeYards:25,baseDamageMin:290,baseDamageMax:350,scaling:.65,isHeal:0,isDot:0,dotDurationMs:0,dotTickMs:0,dotDamagePerTick:0,ccType:0,ccDurationMs:0,auraType:0},{id:12,classId:3,name:`Frost Nova`,icon:`/icons/spell_frostnova.png`,castTimeMs:0,cooldownMs:2e4,cost:220,powerType:0,rangeYards:10,baseDamageMin:70,baseDamageMax:90,scaling:.2,isHeal:0,isDot:0,dotDurationMs:6e3,dotTickMs:0,dotDamagePerTick:0,ccType:5,ccDurationMs:6e3,auraType:6},{id:13,classId:4,name:`Corruption`,icon:`/icons/spell_corruption.png`,castTimeMs:0,cooldownMs:0,cost:240,powerType:0,rangeYards:35,baseDamageMin:0,baseDamageMax:0,scaling:.25,isHeal:0,isDot:1,dotDurationMs:15e3,dotTickMs:3e3,dotDamagePerTick:95,ccType:0,ccDurationMs:0,auraType:7},{id:14,classId:4,name:`Shadow Bolt`,icon:`/icons/spell_shadowbolt.png`,castTimeMs:2500,cooldownMs:0,cost:360,powerType:0,rangeYards:35,baseDamageMin:410,baseDamageMax:490,scaling:1,isHeal:0,isDot:0,dotDurationMs:0,dotTickMs:0,dotDamagePerTick:0,ccType:0,ccDurationMs:0,auraType:0},{id:15,classId:4,name:`Fear`,icon:`/icons/spell_shadow_possession.png`,castTimeMs:1500,cooldownMs:0,cost:300,powerType:0,rangeYards:25,baseDamageMin:0,baseDamageMax:0,scaling:0,isHeal:0,isDot:0,dotDurationMs:0,dotTickMs:0,dotDamagePerTick:0,ccType:4,ccDurationMs:5e3,auraType:0},{id:16,classId:4,name:`Death Coil`,icon:`/icons/spell_deathcoil.png`,castTimeMs:0,cooldownMs:12e4,cost:565,powerType:0,rangeYards:30,baseDamageMin:476,baseDamageMax:476,scaling:.214,isHeal:0,isDot:0,dotDurationMs:0,dotTickMs:0,dotDamagePerTick:0,ccType:6,ccDurationMs:3e3,auraType:0,selfHealRatio:1},{id:17,name:`Polymorph`,icon:`/icons/spell_polymorph.png`,castTimeMs:1500,cooldownMs:0,cost:150,powerType:0,rangeYards:30,baseDamageMin:0,baseDamageMax:0,scaling:0,isHeal:0,isDot:0,dotDurationMs:8e3,dotTickMs:0,dotDamagePerTick:0,ccType:7,ccDurationMs:8e3,auraType:0,classId:3},{id:18,name:`Ice Barrier`,icon:`/icons/spell_icebarrier.png`,castTimeMs:0,cooldownMs:3e4,cost:305,powerType:0,rangeYards:0,baseDamageMin:0,baseDamageMax:0,scaling:.1,isHeal:1,isDot:0,dotDurationMs:6e4,dotTickMs:0,dotDamagePerTick:0,ccType:0,ccDurationMs:0,auraType:3,classId:3,selfOnly:!0,absorbBase:818},{id:19,name:`Blink`,icon:`/icons/spell_blink.png`,castTimeMs:0,cooldownMs:15e3,cost:280,powerType:0,rangeYards:100,baseDamageMin:0,baseDamageMax:0,scaling:0,isHeal:0,isDot:0,dotDurationMs:0,dotTickMs:0,dotDamagePerTick:0,ccType:0,ccDurationMs:0,auraType:0,classId:3,blinkDistance:20},{id:20,name:`Drain Life`,icon:`/icons/spell_drainlife.png`,castTimeMs:0,cooldownMs:0,cost:300,powerType:0,rangeYards:30,baseDamageMin:0,baseDamageMax:0,scaling:.5,isHeal:0,isDot:1,dotDurationMs:5e3,dotTickMs:1e3,dotDamagePerTick:71,ccType:0,ccDurationMs:0,auraType:7,classId:4,channelMs:5e3,selfHealRatio:1}].map(e=>({...e,classId:e.classId??0,selfOnly:e.selfOnly??e.id===4,absorbBase:e.absorbBase??(e.auraType===3?500:0)})),c=new Map(s.map(e=>[e.name,e])),l={5:`#fde68a`,6:`#86efac`,7:`#fef08a`,8:`#c084fc`,9:`#e879f9`,10:`#7dd3fc`,11:`#fb923c`,13:`#c084fc`,14:`#a78bfa`,15:`#e879f9`,16:`#a3e635`},u=class{trails=[];lastEventId=0;reset(){this.trails=[],this.lastEventId=0}update(e,t,n){for(let e of this.trails)e.age+=n;this.trails=this.trails.filter(e=>e.age<e.duration+.14);let r=[];for(let t=e.length-1;t>=0&&e[t].id>this.lastEventId;t--)r.length<64&&r.push(e[t]);this.lastEventId=e.at(-1)?.id??this.lastEventId;for(let e of r.reverse()){let n=e.spellName?c.get(e.spellName):void 0;if(!n||n.rangeYards<=5||n.isDot||n.ccType===5||e.targetId===void 0||e.sourceId===e.targetId)continue;let r=n.baseDamageMin>0&&!n.isHeal,i=n.isHeal?`heal`:r?`damage`:`cc`;if(e.type!==i)continue;let a=t.get(e.sourceId),o=t.get(e.targetId);if(!a||!o)continue;let s=Math.hypot(o.x-a.x,o.y-a.y);this.trails.push({from:{...a},to:{...o},targetId:e.targetId,color:l[n.id]??`#c4b5fd`,age:0,duration:Math.max(.22,Math.min(.65,s/850))})}this.trails.length>96&&this.trails.splice(0,this.trails.length-96)}draw(e,t,n){e.save(),e.globalCompositeOperation=`lighter`;for(let r of this.trails){let i=t.get(r.targetId)??r.to,a=Math.min(1,r.age/r.duration),o=r.from.x+(i.x-r.from.x)*a,s=r.from.y+(i.y-r.from.y)*a;if(e.strokeStyle=r.color,e.fillStyle=r.color,a<1){let t=Math.max(0,a-.15);e.globalAlpha=.65,e.lineWidth=3,e.beginPath(),e.moveTo(r.from.x+(i.x-r.from.x)*t,r.from.y+(i.y-r.from.y)*t),e.lineTo(o,s),e.stroke(),e.globalAlpha=.18,e.beginPath(),e.arc(o,s,10,0,Math.PI*2),e.fill(),e.globalAlpha=.95,e.beginPath(),e.arc(o,s,3.5,0,Math.PI*2),e.fill()}else{let t=(r.age-r.duration)/.14;e.globalAlpha=Math.max(0,(1-t)*.7),e.lineWidth=2,e.beginPath(),e.arc(o,s,n+4+t*12,0,Math.PI*2),e.stroke()}}e.restore()}},d=class{beams=[];phase=0;reset(){this.beams=[],this.phase=0}update(e,t,n){this.phase=(this.phase+n)%100,this.beams=[];for(let n of e){let r=s[n.castSpellId];if(!n.alive||!r?.channelMs||!r.selfHealRatio||n.castEnd<=t)continue;let i=e.find(e=>e.alive&&e.auras.some(e=>e.spellId===r.id&&e.sourceId===n.id&&e.expiresAt>t));i&&this.beams.push({sourceId:n.id,targetId:i.id})}}draw(e,t,n){e.save(),e.globalCompositeOperation=`lighter`;for(let r of this.beams){let i=t.get(r.sourceId),a=t.get(r.targetId);if(!i||!a)continue;let o=i.x-a.x,s=i.y-a.y,c=Math.max(1,Math.hypot(o,s)),l=(e,t=0)=>{let n=Math.sin(e*Math.PI)*Math.sin(e*18-this.phase*9+t*Math.PI)*5;return{x:a.x+o*e-s/c*n,y:a.y+s*e+o/c*n}};for(let[t,n]of[[10,.1],[4,.28],[1.5,.85]]){e.lineWidth=t,e.globalAlpha=n,e.strokeStyle=`#86ef6b`;for(let t=0;t<2;t++){e.beginPath(),e.moveTo(a.x,a.y);for(let n=1;n<=24;n++){let r=l(n/24,t);e.lineTo(r.x,r.y)}e.stroke()}}e.fillStyle=`#d9f99d`,e.globalAlpha=.9;for(let t=0;t<7;t++){let n=(this.phase*.8+t/7)%1,r=l(n);e.beginPath(),e.arc(r.x,r.y,2+Math.sin(n*Math.PI),0,Math.PI*2),e.fill()}e.strokeStyle=`#a3e635`,e.lineWidth=2,e.globalAlpha=.45,e.beginPath(),e.arc(i.x,i.y,n+4+Math.sin(this.phase*7)*2,0,Math.PI*2),e.stroke()}e.restore()}},f={Warrior:1,Priest:2,Mage:3,Warlock:4};function p(e,t){return s.filter(t=>t.id>0&&t.classId===f[e.className]).map(n=>{let r=n.id,i=((r>=20?e.extraCooldowns3??0:r>=18?e.extraCooldowns2??0:r>=16?e.extraCooldowns??0:e.auras[r>>>1]?.pad??0)>>>(r&1)*16&65535)*100,a=Math.max(0,i-t);return{id:r,spell:n,remainingMs:a,fraction:n.cooldownMs>0?Math.min(1,a/n.cooldownMs):0}})}var m=new Set(s.filter(e=>e.ccType===1||e.ccType===4).map(e=>e.ccType));function h(e,t){if(!e.alive)return[];let n=[];if(e.stunEnd>t){let t=e.incapacitateType===4||!e.incapacitateType&&m.size===1&&m.has(4),r=e.incapacitateType===1||!e.incapacitateType&&m.size===1&&m.has(1);n.push({kind:t?`fear`:`stun`,label:t?`Feared`:r?`Stunned`:`Incapacitated`,detail:t?`Fleeing uncontrollably · unable to act`:`Unable to move or act`,color:t?`#c084fc`:`#fbbf24`,expiresAt:e.stunEnd})}(e.horrorEnd??0)>t&&n.push({kind:`horror`,label:`Horrified`,detail:`Death Coil · fleeing uncontrollably · unable to act`,color:`#a3e635`,expiresAt:e.horrorEnd}),e.silenceEnd>t&&n.push({kind:`silence`,label:`Silenced`,detail:`Spellcasting locked`,color:`#f9a8d4`,expiresAt:e.silenceEnd});for(let r of e.auras){if(r.auraType===8&&r.expiresAt>t&&n.push({kind:`polymorph`,label:`Polymorphed`,detail:`Unable to move or act · regenerating health · damage breaks effect`,color:`#f0abfc`,expiresAt:r.expiresAt}),r.expiresAt<=t||r.auraType!==5&&r.auraType!==6)continue;let e=s[r.spellId],i=r.auraType===6;n.push({kind:i?`root`:`slow`,label:i?`Rooted`:`Slowed`,detail:`${e?.name??`Movement effect`} · ${i?`Unable to move`:`Movement reduced 50%`}`,color:i?`#67e8f9`:`#93c5fd`,expiresAt:r.expiresAt})}return n}var g=`
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

    // Workgroup root updates global best atomically for respective team
    // Pack quantized 16-bit fitness (bits 16..31) and 16-bit inverted candidate index (bits 0..15)
    // so a single atomicMax updates both fitness and winning candidate index without race conditions.
    if (lane == 0u) {
        let best_f = wg_max_fitness[0];
        let best_i = wg_best_idx[0];
        let quant_f = clamp(u32(max(0.0, best_f + 100000.0) * 0.25), 1u, 65535u);
        let packed = (quant_f << 16u) | ((65535u - (best_i & 0xFFFFu)) & 0xFFFFu);
        
        if (best_i < half_pop) {
            atomicMax(&bestCandidateResult[1], packed);
        } else {
            atomicMax(&bestCandidateResult[3], packed);
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
        if (spell_id >= 20u) { packed = unit.extra_cooldowns3; }
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
        if (spell_id >= 20u) { (*unit).extra_cooldowns3 = ((*unit).extra_cooldowns3 & mask) | value; }
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
    } else if (cc_type == 1u || cc_type == 4u) { // Stun (1) or Fear (4) incapacitate with DR
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
    return (*recipient).stun_end != before.stun_end ||
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
    var until = max(unit.stun_end, unit.horror_end);
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

                    if (dist <= range_limit) {
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

                    if (!friendly_spell) { state.entities[src].target_id = chosen_target; }
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
                    if (spell_id > 0u && spellCatalog[spell_id].blink_distance > 0.0 && state.entities[src].incapacitate_type == 1u) {
                        var unstunned = state.entities[src]; unstunned.stun_end = state.now;
                        may_cast = incapacitated_until(unstunned) <= state.now;
                    }
                    let is_silenced = state.now < state.entities[src].silence_end;
                    let is_casting = state.entities[src].cast_spell_id > 0u && state.entities[src].cast_end > state.now;

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
                    if (!is_stunned && !is_casting && move_ref_tgt < num_units && state.entities[move_ref_tgt].alive == 1u) {
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

                    if (spell_id > 0u && is_spell_valid(state.entities[src], spell_id) && may_cast && (!is_silenced || spellCatalog[spell_id].power_type == 1u) && state.now >= state.entities[src].gcd_end && state.now >= state.entities[src].cast_end && state.now >= get_spell_cd_end(state.entities[src], spell_id)) {
                        let spell = spellCatalog[spell_id];
                        let cost = spell.cost;
                        
                        // Check range and pillar Line-of-Sight to active recipient
                        let dx = state.entities[active_tgt].pos_x - state.entities[src].pos_x;
                        let dy = state.entities[active_tgt].pos_y - state.entities[src].pos_y;
                        let dist = sqrt(dx * dx + dy * dy);
                        let in_los = spell.blink_distance > 0.0 || active_tgt == src || has_line_of_sight(state.pillars, state.entities[src].pos_x, state.entities[src].pos_y, state.entities[active_tgt].pos_x, state.entities[active_tgt].pos_y);

                        if (state.entities[src].power >= cost && (active_tgt == src || dist <= spell.range_yards) && in_los) {
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
                                state.entities[src].power -= cost;
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
                                } else if (spell.is_heal == 0u) {
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
                                    for (var a = 0u; a < 8u; a++) {
                                        if (state.entities[active_tgt].auras[a].spell_id == spell_id && state.entities[active_tgt].auras[a].source_id == src) {
                                            state.entities[active_tgt].auras[a].expires_at = state.now;
                                        }
                                    }
                                }
                                if (spell.blink_distance > 0.0) {
                                    var mover = state.entities[src];
                                    for (var a = 0u; a < 8u; a++) {
                                        if ((mover.auras[a].aura_type & 0xFFu) == 6u) { mover.auras[a].expires_at = state.now; }
                                    }
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
                    var hard_stun = state.entities[src].stun_end > state.now && state.entities[src].incapacitate_type == 1u;
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
    else { state.now = max_time_ms; }
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
                // Pick random spell across 16 abilities; rejection sample up to 8 times to find a valid active spell.
                // At h == 0, require current snapshot resource affordability AND off-cooldown; at future steps (h > 0),
                // allow any class-owned spell so RHEA can plan spenders after future rage/mana generation and cooldown expiry.
                var chosen_spell = 0u;
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

                // Emergent Target Search: pick any valid entity of matching relationship
                var chosen_target = unit.target_id;
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

                // Online Learned Spatial Intent Search:
                // Mutates desired engagement distance:
                // Melee units (rage users) desire 0y (point blank)
                // Mana casters / healers search optimal combat spacing among [5y, 15y, 25y, 30y]
                // so short-range CC (Psychic Scream 8y, Frost Nova 10y) and kiting can both emerge.
                var chosen_range = 0u;
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

                // Pack tri-gene: bits 0..7 = spell_id, bits 8..15 = desired_range, bits 16..31 = target_id
                candidatePlans[offset] = (chosen_spell & 0xFFu) | ((chosen_range & 0xFFu) << 8u) | ((chosen_target & 0xFFFFu) << 16u);
            } else {
                candidatePlans[offset] = bestPlan[u * horizon + h];
            }
        }
    }
}

// Compute Kernel: Extract Elite Candidate Plans into bestPlan buffer
// Unpacks the atomicMax (fitness << 16 | inv_idx) into bestCandidateResult[0..3] and bestPlan
@compute @workgroup_size(1)
fn extract_elite_plan(@builtin(global_invocation_id) id: vec3<u32>) {
    let packed_t0 = atomicLoad(&bestCandidateResult[1]);
    let packed_t1 = atomicLoad(&bestCandidateResult[3]);
    let best_t0_idx = select(0u, 65535u - (packed_t0 & 0xFFFFu), packed_t0 > 0u);
    let best_t1_idx = select(simParams.y / 2u, 65535u - (packed_t1 & 0xFFFFu), packed_t1 > 0u);
    let fit_t0 = (packed_t0 >> 16u) * 40u;
    let fit_t1 = (packed_t1 >> 16u) * 40u;
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
`,_=class{device;supportsSubgroups=!1;spellCatalogBuffer;liveStateBuffer;candidatePlansBuffer;candidateFitnessBuffer;bestPlanBuffer;simParamsBuffer;bestResultBuffer;liveQueueBuffer;liveParamsBuffer;combatEventsBuffer;searchStateBuffer;searchQueueBuffer;committedPlanBuffer;committedOriginBuffer;searchOriginBuffer;searchSliceBuffer;mageCandidateFitness={};stagingBestResultBuffer;stagingBestPlanBuffer;stagingOriginBuffer;advanceLivePipeline;prepareSearchPipeline;stateEpoch=0;arenaInitialized=0;submittedTimeMs=0;planOriginMs=0;lastSearchMs=0;lastSearchSliceMs=0;searchCandidatesPerSlice=2048;searchThroughput=0;adaptivePopulation(t=600,n=1024,r=e){if(this.searchThroughput<=0)return n;let i=Math.floor(this.searchThroughput*t/64)*64;return Math.max(n,Math.min(r,i))}search=null;maxSearchInFlight=1;searchInFlight=0;throughputWindowStart=0;throughputWindowMs=0;throughputWindowCount=0;searchReading=!1;benchmarking=!1;pending=new Set;readbackSequence=0;appliedSequence=0;lastEventSequence=0;planStability=[];get planStabilityText(){if(!this.planStability.length)return`Plan stability: waiting for search`;let e=[0,1].map(e=>{let t=0,n=0,r=0;for(let i of this.planStability){let a=i.teams[e];t+=Number(a.baselineKept),n+=a.changed,r+=a.compared}return`T${e}: ${r?`${Math.round(100*n/r)}% plan changes`:`no overlapping decisions`}, ${Math.round(100*t/this.planStability.length)}% baseline kept`});return`Plan stability (${this.planStability.length}/20 searches): ${e.join(` · `)}`}publishedPlan=new Uint32Array(48);publishedOrigin=new Uint32Array(8);snapshots=[];async whenIdle(){await Promise.all([...this.pending]),await this.device.queue.onSubmittedWorkDone(),await this.requestSnapshot()}eliteActions=[{spellId:0,targetId:2,desiredRange:0},{spellId:0,targetId:0,desiredRange:20},{spellId:0,targetId:0,desiredRange:30},{spellId:0,targetId:0,desiredRange:30},{spellId:0,targetId:0,desiredRange:0},{spellId:0,targetId:0,desiredRange:0}];elitePlanHorizon=[[],[],[],[],[],[]];mutatePipeline;simulatePipeline;extractElitePipeline;findBestPipeline;pipelineGroups=new Map;entities=[];pillars=r.map(e=>({...e}));simTimeMs=0;totalSimulationsRun=0;lastFpsSimsPerSec=0;bestFitnessScore=0;bestFitnessScoreTeam0=0;bestFitnessScoreTeam1=0;combatLog=[];gpuErrors=[];combatFailed=!1;maxLogEntries=80;logEntryId=0;addLogEntry(e){this.combatLog.push({...e,id:++this.logEntryId}),this.combatLog.length>this.maxLogEntries&&this.combatLog.shift()}diagnosticStage=async()=>{};async init(){if(!navigator.gpu)return console.error(`WebGPU is not supported in this browser.`),!1;await this.diagnosticStage(`requestAdapter`);let e=new URLSearchParams(location.search).get(`gpuAdapter`),t=await navigator.gpu.requestAdapter(e==="default"?{}:{powerPreference:e===`low-power`?`low-power`:`high-performance`});if(!t)return console.error(`No suitable WebGPU adapter found.`),!1;let n=t.info;await this.diagnosticStage(`adapter ${JSON.stringify({preference:e??`high-performance`,vendor:n.vendor,architecture:n.architecture,device:n.device,description:n.description})}`),await this.diagnosticStage(`requestDevice`),this.device=await t.requestDevice(),this.device.addEventListener(`uncapturederror`,e=>{this.combatFailed=!0,this.gpuErrors.push(e.error.message),this.gpuErrors.length>100&&this.gpuErrors.shift()}),this.device.lost.then(e=>{this.combatFailed=!0,this.gpuErrors.push(`GPU device lost: ${e.message}`)}),this.initDefaultEntities(),await this.diagnosticStage(`createBuffers`),this.createBuffers();try{await this.createPipelines()}catch(e){return this.gpuErrors.push(String(e)),console.error(e),!1}return await this.diagnosticStage(`initialization complete`),!0}initDefaultEntities(){this.entities=[{id:0,name:`Warrior`,className:`Warrior`,icon:`/icons/class_warrior.png`,team:0,alive:1,targetId:2,hp:3800,maxHp:3800,power:35,maxPower:100,powerType:1,gcdEnd:0,castEnd:0,castSpellId:0,swingTimer:0,swingSpeedMs:2600,attackPower:650,spellPower:0,critChance:.22,armor:3400,posX:18,posY:22,speed:7,stunEnd:0,silenceEnd:0,drStunCount:0,drStunResetAt:0,weaponSpeedSec:2.6,gearSummary:`2H Sword, Plate Mail`,auras:[]},{id:1,name:`Priest`,className:`Priest`,icon:`/icons/class_priest.png`,team:0,alive:1,targetId:0,hp:3100,maxHp:3100,power:4200,maxPower:4200,powerType:0,gcdEnd:0,castEnd:0,castSpellId:0,swingTimer:0,swingSpeedMs:2e3,attackPower:80,spellPower:380,critChance:.1,armor:950,posX:14,posY:16,speed:7,stunEnd:0,silenceEnd:0,drStunCount:0,drStunResetAt:0,weaponSpeedSec:2,gearSummary:`Staff of Discipline, Cloth`,auras:[]},{id:2,name:`Mage`,className:`Mage`,icon:`/icons/class_mage.png`,team:1,alive:1,targetId:0,hp:2900,maxHp:2900,power:4400,maxPower:4400,powerType:0,gcdEnd:0,castEnd:0,castSpellId:0,swingTimer:0,swingSpeedMs:2e3,attackPower:60,spellPower:420,critChance:.15,armor:850,posX:40,posY:18,speed:7,stunEnd:0,silenceEnd:0,drStunCount:0,drStunResetAt:0,weaponSpeedSec:2,gearSummary:`Frost Wand, Robes`,auras:[]},{id:3,name:`Warlock`,className:`Warlock`,icon:`/icons/class_warlock.png`,team:1,alive:1,targetId:0,hp:3500,maxHp:3500,power:3900,maxPower:3900,powerType:0,gcdEnd:0,castEnd:0,castSpellId:0,swingTimer:0,swingSpeedMs:2e3,attackPower:70,spellPower:410,critChance:.12,armor:1100,posX:42,posY:24,speed:7,stunEnd:0,silenceEnd:0,drStunCount:0,drStunResetAt:0,weaponSpeedSec:2,gearSummary:`Shadow Dagger, Felweave`,auras:[]},{id:4,name:`Empty 4`,className:`None`,icon:``,team:0,alive:0,targetId:0,hp:0,maxHp:0,power:0,maxPower:0,powerType:0,gcdEnd:0,castEnd:0,castSpellId:0,swingTimer:0,swingSpeedMs:2e3,attackPower:0,spellPower:0,critChance:0,armor:0,posX:0,posY:0,speed:0,stunEnd:0,silenceEnd:0,drStunCount:0,drStunResetAt:0,weaponSpeedSec:2,gearSummary:`None`,auras:[]},{id:5,name:`Empty 5`,className:`None`,icon:``,team:1,alive:0,targetId:0,hp:0,maxHp:0,power:0,maxPower:0,powerType:0,gcdEnd:0,castEnd:0,castSpellId:0,swingTimer:0,swingSpeedMs:2e3,attackPower:0,spellPower:0,critChance:0,armor:0,posX:0,posY:0,speed:0,stunEnd:0,silenceEnd:0,drStunCount:0,drStunResetAt:0,weaponSpeedSec:2,gearSummary:`None`,auras:[]}]}createBuffers(){let e=new ArrayBuffer(1848),n=new Uint32Array(e),r=new Float32Array(e);for(let e=0;e<s.length;e++){let t=s[e],i=e*22;n[i+0]=t.castTimeMs,n[i+1]=t.cooldownMs,r[i+2]=t.cost,n[i+3]=t.powerType,r[i+4]=t.rangeYards,r[i+5]=t.baseDamageMin,r[i+6]=t.baseDamageMax,r[i+7]=t.scaling,n[i+8]=t.isHeal,n[i+9]=t.isDot,n[i+10]=t.dotDurationMs,n[i+11]=t.dotTickMs,r[i+12]=t.dotDamagePerTick,n[i+13]=t.ccType,n[i+14]=t.ccDurationMs,n[i+15]=t.auraType,r[i+16]=t.selfHealRatio??0,n[i+17]=t.classId??0,n[i+18]=+!!t.selfOnly,r[i+19]=t.blinkDistance??0,n[i+20]=t.channelMs??0,r[i+21]=t.absorbBase??0}this.spellCatalogBuffer=this.device.createBuffer({size:e.byteLength,usage:GPUBufferUsage.STORAGE|GPUBufferUsage.COPY_DST}),this.device.queue.writeBuffer(this.spellCatalogBuffer,0,e);let o=i;this.liveStateBuffer=this.device.createBuffer({size:o,usage:GPUBufferUsage.STORAGE|GPUBufferUsage.COPY_DST|GPUBufferUsage.COPY_SRC}),this.liveQueueBuffer=this.device.createBuffer({size:968,usage:GPUBufferUsage.STORAGE|GPUBufferUsage.COPY_DST|GPUBufferUsage.COPY_SRC}),this.liveParamsBuffer=this.device.createBuffer({size:16,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST}),this.combatEventsBuffer=this.device.createBuffer({size:a,usage:GPUBufferUsage.STORAGE|GPUBufferUsage.COPY_SRC|GPUBufferUsage.COPY_DST}),this.searchStateBuffer=this.device.createBuffer({size:o,usage:GPUBufferUsage.STORAGE|GPUBufferUsage.COPY_DST}),this.searchQueueBuffer=this.device.createBuffer({size:968,usage:GPUBufferUsage.STORAGE|GPUBufferUsage.COPY_DST}),this.searchSliceBuffer=this.device.createBuffer({size:16,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST}),this.searchOriginBuffer=this.device.createBuffer({size:32,usage:GPUBufferUsage.STORAGE|GPUBufferUsage.COPY_SRC}),this.committedPlanBuffer=this.device.createBuffer({size:192,usage:GPUBufferUsage.STORAGE|GPUBufferUsage.COPY_DST|GPUBufferUsage.COPY_SRC}),this.committedOriginBuffer=this.device.createBuffer({size:32,usage:GPUBufferUsage.STORAGE|GPUBufferUsage.COPY_DST}),this.stagingOriginBuffer=this.device.createBuffer({size:32,usage:GPUBufferUsage.MAP_READ|GPUBufferUsage.COPY_DST}),this.snapshots=Array.from({length:2},()=>({busy:!1,state:this.device.createBuffer({size:o,usage:GPUBufferUsage.MAP_READ|GPUBufferUsage.COPY_DST}),events:this.device.createBuffer({size:a,usage:GPUBufferUsage.MAP_READ|GPUBufferUsage.COPY_DST})}));let c=t*6*8*4;this.candidatePlansBuffer=this.device.createBuffer({size:c,usage:GPUBufferUsage.STORAGE|GPUBufferUsage.COPY_DST}),this.candidateFitnessBuffer=this.device.createBuffer({size:t*4,usage:GPUBufferUsage.STORAGE|GPUBufferUsage.COPY_SRC}),this.bestResultBuffer=this.device.createBuffer({size:32,usage:GPUBufferUsage.STORAGE|GPUBufferUsage.COPY_SRC|GPUBufferUsage.COPY_DST}),this.stagingBestResultBuffer=this.device.createBuffer({size:32,usage:GPUBufferUsage.MAP_READ|GPUBufferUsage.COPY_DST}),this.bestPlanBuffer=this.device.createBuffer({size:192,usage:GPUBufferUsage.STORAGE|GPUBufferUsage.COPY_SRC|GPUBufferUsage.COPY_DST}),this.stagingBestPlanBuffer=this.device.createBuffer({size:192,usage:GPUBufferUsage.MAP_READ|GPUBufferUsage.COPY_DST}),this.seedInitialBestPlan(),this.simParamsBuffer=this.device.createBuffer({size:16,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST}),this.writeLiveStateToGPU()}writeLiveStateToGPU(){this.planStability=[],this.stateEpoch++,this.search=null,this.submittedTimeMs=this.simTimeMs;let e=new ArrayBuffer(i),t=new Uint32Array(e),n=new Float32Array(e);t[0]=this.simTimeMs,t[1]=6,t[2]=this.arenaInitialized;for(let e=0;e<6;e++){let r=this.entities[e],i=4+e*100;for(let[e,n]of Object.entries(o.uint))t[i+n]=r[e]??0;for(let[e,t]of Object.entries(o.float))n[i+t]=r[e]??0;t[i+25]={Warrior:1,Priest:2,Mage:3,Warlock:4}[r.className]??0,t[i+27]=this.simTimeMs;for(let e=0;e<8;e++){let a=i+36+e*8,o=r.auras&&r.auras[e];o&&o.expiresAt>this.simTimeMs?(t[a+0]=o.spellId,t[a+1]=o.auraType,t[a+2]=o.expiresAt,t[a+3]=o.tickIntervalMs,t[a+4]=o.nextTickAt,n[a+5]=o.value,t[a+6]=o.sourceId,t[a+7]=o.pad??0):(t[a+0]=0,t[a+1]=0,t[a+2]=0,t[a+3]=0,t[a+4]=0,n[a+5]=0,t[a+6]=0,t[a+7]=o?.pad??0)}}for(let e=0;e<4;e++){let t=604+e*4,r=this.pillars[e];n[t+0]=r?r.x:0,n[t+1]=r?r.y:0,n[t+2]=r?r.r:0,n[t+3]=0}this.device.queue.writeBuffer(this.liveStateBuffer,0,e)}async createPipelines(){await this.diagnosticStage(`createShaderModule`);let e=this.device.createShaderModule({code:g}),t=(await e.getCompilationInfo()).messages.filter(e=>e.type===`error`);if(t.length>0)throw Error(t.map(e=>`WGSL ${e.lineNum}:${e.linePos}: ${e.message}`).join(`
`));let n=new URLSearchParams(location.search).has(`gpuFreshModules`),r=async(t,r)=>{await this.diagnosticStage(`compile ${t} modules=${n?`fresh`:`shared`}`);let i=n?this.device.createShaderModule({code:g,label:r}):e,a=await this.device.createComputePipelineAsync({label:r,layout:`auto`,compute:{module:i,entryPoint:r}});return await this.diagnosticStage(`compiled ${t}`),a};this.mutatePipeline=await r(`mutate`,`mutate_population`),this.simulatePipeline=await r(`simulate`,`simulate_candidate`),this.findBestPipeline=await r(`findBest`,`find_best_candidate`),this.extractElitePipeline=await r(`extractElite`,`extract_elite_plan`),this.prepareSearchPipeline=await r(`prepareSearch`,`prepare_search`),this.advanceLivePipeline=await r(`advanceLive`,`advance_live`),await this.diagnosticStage(`createBindGroups`);let i=[this.spellCatalogBuffer,this.searchStateBuffer,this.candidatePlansBuffer,this.candidateFitnessBuffer,this.bestPlanBuffer,this.simParamsBuffer,this.bestResultBuffer,this.searchQueueBuffer,this.liveParamsBuffer,this.combatEventsBuffer,void 0,this.searchSliceBuffer,this.searchOriginBuffer,this.committedPlanBuffer,this.committedOriginBuffer],a=[[this.mutatePipeline,[0,1,2,4,5,11]],[this.simulatePipeline,[0,1,2,3,4,5,6,7,9,11]],[this.advanceLivePipeline,[0,1,4,7,8,9,12]],[this.findBestPipeline,[3,5,6]],[this.extractElitePipeline,[1,2,4,5,6]],[this.prepareSearchPipeline,[1,4,12,13,14]]];for(let[e,t]of a){let n=e===this.advanceLivePipeline;this.pipelineGroups.set(e,this.device.createBindGroup({layout:e.getBindGroupLayout(0),entries:t.map(e=>({binding:e,resource:{buffer:n&&e===1?this.liveStateBuffer:n&&e===4?this.committedPlanBuffer:n&&e===7?this.liveQueueBuffer:n&&e===12?this.committedOriginBuffer:i[e]}}))}))}}cancelPlanning(){this.search=null}get isPlanning(){return this.search!==null||this.searchInFlight>0||this.searchReading}get matchResult(){let e=this.entities.filter(e=>e.className!==`None`&&e.maxHp>0);if(!e.some(e=>e.team===0)||!e.some(e=>e.team===1))return null;let t=e.some(e=>e.team===0&&e.alive===1&&e.hp>0),n=e.some(e=>e.team===1&&e.alive===1&&e.hp>0);return t&&n?null:t?`team0`:n?`team1`:`draw`}dispatch(e,t,n=1){let r=e.beginComputePass();r.setPipeline(t),r.setBindGroup(0,this.pipelineGroups.get(t)),r.dispatchWorkgroups(n),r.end()}fail(e,t){t===this.stateEpoch&&(this.combatFailed=!0,this.gpuErrors.push(String(e)),console.error(`GPU simulation failed:`,e))}track(e){return this.pending.add(e),e.finally(()=>this.pending.delete(e)),e}advanceLiveAsync(e=50){if(this.combatFailed||this.benchmarking||this.matchResult!==null)return!1;this.submittedTimeMs+=e,this.device.queue.writeBuffer(this.liveParamsBuffer,0,new Uint32Array([this.submittedTimeMs,0,0,0]));let t=this.device.createCommandEncoder();return this.dispatch(t,this.advanceLivePipeline),this.device.queue.submit([t.finish()]),!0}stepRHEAAsync(t=e){if(this.combatFailed||this.benchmarking||this.matchResult!==null||this.searchInFlight>=this.maxSearchInFlight||this.searchReading)return!1;let n=this.device.createCommandEncoder();if(!this.search){if(t<64||t>65536||t%64!=0)throw Error(`Search population must be a multiple of 64 between 64 and the allocated capacity.`);this.search={offset:0,population:t,epoch:this.stateEpoch,started:performance.now()},n.copyBufferToBuffer(this.liveStateBuffer,0,this.searchStateBuffer,0,i),n.copyBufferToBuffer(this.liveQueueBuffer,0,this.searchQueueBuffer,0,968),this.device.queue.writeBuffer(this.simParamsBuffer,0,new Uint32Array([Math.floor(Math.random()*4294967295),t,8,1e4])),this.device.queue.writeBuffer(this.bestResultBuffer,0,new Uint32Array(8)),this.dispatch(n,this.prepareSearchPipeline)}let r=this.search,a=Math.min(this.searchCandidatesPerSlice,r.population-r.offset);this.device.queue.writeBuffer(this.searchSliceBuffer,0,new Uint32Array([r.offset,a,0,0]));let o=Math.ceil(a/32);this.dispatch(n,this.mutatePipeline,o),this.dispatch(n,this.simulatePipeline,o),r.offset+=a;let s=r.offset===r.population;s&&(this.dispatch(n,this.findBestPipeline,Math.ceil(r.population/32)),this.dispatch(n,this.extractElitePipeline),n.copyBufferToBuffer(this.bestPlanBuffer,0,this.committedPlanBuffer,0,192),n.copyBufferToBuffer(this.searchOriginBuffer,0,this.committedOriginBuffer,0,32),n.copyBufferToBuffer(this.bestResultBuffer,0,this.stagingBestResultBuffer,0,32),n.copyBufferToBuffer(this.bestPlanBuffer,0,this.stagingBestPlanBuffer,0,192),n.copyBufferToBuffer(this.searchOriginBuffer,0,this.stagingOriginBuffer,0,32)),this.device.queue.submit([n.finish()]),this.searchInFlight===0&&(this.throughputWindowStart=performance.now()),this.searchInFlight++;let c=performance.now();if(this.track(this.device.queue.onSubmittedWorkDone().then(()=>{if(r.epoch!==this.stateEpoch)return;let e=performance.now();this.throughputWindowMs+=e-this.throughputWindowStart,this.throughputWindowStart=e,this.throughputWindowCount+=a;let t=this.throughputWindowMs;if(t>=250){let e=this.throughputWindowCount/t;this.searchThroughput=this.searchThroughput>0?this.searchThroughput*.7+e*.3:e,this.throughputWindowMs=0,this.throughputWindowCount=0}this.lastSearchSliceMs=e-c,this.searchThroughput>0&&(this.searchCandidatesPerSlice=Math.max(1024,Math.min(8192,Math.round(this.searchThroughput*4/32)*32)))}).catch(e=>this.fail(e,r.epoch)).finally(()=>{this.searchInFlight=Math.max(0,this.searchInFlight-1)})),s){this.search=null,this.searchReading=!0;let e=[this.stagingBestResultBuffer,this.stagingBestPlanBuffer,this.stagingOriginBuffer];this.track(this.mapSnapshots(e,r.epoch,e=>{let t=new Uint32Array(e[0]);if(t[1]===0||t[3]===0)throw Error(`Search returned no valid fitness for one or both teams.`);this.bestFitnessScoreTeam0=t[1]/10-1e5,this.bestFitnessScoreTeam1=t[3]/10-1e5,this.bestFitnessScore=this.bestFitnessScoreTeam0;let n=e=>{if(e)return(e>>>16)*4-1e5};this.mageCandidateFitness={frostbolt:n(t[4]),fireblast:n(t[5]),polymorph:n(t[6])},this.lastSearchMs=performance.now()-r.started;let i=new Uint32Array(e[2]),a=new Uint32Array(e[1]),o=[0,1].map(e=>({baselineKept:t[e*2]===e*r.population/2,changed:0,compared:0}));for(let e=0;e<6;e++){if(!this.entities[e].alive)continue;let t=i[e+1]-this.publishedOrigin[e+1];if(t<0||t>=8)continue;let n=o[this.entities[e].team];for(let r=0;r<8-t;r++)n.compared++,n.changed+=Number(a[e*8+r]!==this.publishedPlan[e*8+r+t])}this.planStability.push({originMs:i[0],population:r.population,teams:o}),this.planStability.length>20&&this.planStability.shift(),this.publishedOrigin=i,this.publishedPlan=a,this.planOriginMs=this.publishedOrigin[0],this.refreshPlanPreview()}).finally(()=>{this.searchReading=!1}))}return this.totalSimulationsRun+=a,!0}async mapSnapshots(e,t,n){try{let r=(await Promise.allSettled(e.map(e=>e.mapAsync(GPUMapMode.READ)))).find(e=>e.status===`rejected`);if(r?.status===`rejected`)throw r.reason;t===this.stateEpoch&&n(e.map(e=>e.getMappedRange().slice(0)))}catch(e){this.fail(e,t)}finally{for(let t of e)t.mapState===`mapped`&&t.unmap()}}requestSnapshot(){let e=this.snapshots.find(e=>!e.busy);if(!e)return Promise.resolve();e.busy=!0;let t=++this.readbackSequence,n=this.stateEpoch,r=this.device.createCommandEncoder();return r.copyBufferToBuffer(this.liveStateBuffer,0,e.state,0,i),r.copyBufferToBuffer(this.combatEventsBuffer,0,e.events,0,a),this.device.queue.submit([r.finish()]),this.track(this.mapSnapshots([e.state,e.events],n,e=>{t<=this.appliedSequence||(this.appliedSequence=t,this.readGPUState(e[0]),this.readGPUEvents(e[1]))}).finally(()=>{e.busy=!1}))}refreshPlanPreview(){for(let e=0;e<6;e++){let t=Math.max(0,(this.entities[e].decisionCount??0)-this.publishedOrigin[e+1]);this.elitePlanHorizon[e]=Array.from({length:8},(n,r)=>{let i=this.publishedPlan[e*8+Math.min(t+r,7)];return{spellId:i&255,desiredRange:i>>>8&255,targetId:i>>>16}}),this.eliteActions[e]=this.elitePlanHorizon[e][0]}}readGPUState(e){let t=new Uint32Array(e),n=new Float32Array(e);if(this.simTimeMs=t[0],this.arenaInitialized=t[2],t[3])throw Error(`GPU combat queue capacity or iteration limit exceeded.`);for(let e=0;e<6;e++){let r=this.entities[e],i=4+e*100;for(let[e,n]of Object.entries(o.uint))r[e]=t[i+n];for(let[e,t]of Object.entries(o.float))r[e]=n[i+t];r.auras=Array.from({length:8},(e,r)=>{let a=i+36+r*8;return{spellId:t[a],auraType:t[a+1]&255,expiresAt:t[a+2],tickIntervalMs:t[a+3],nextTickAt:t[a+4],value:n[a+5],sourceId:t[a+6],pad:t[a+7]}})}this.pillars=Array.from({length:4},(e,t)=>{let r=604+t*4;return{x:n[r],y:n[r+1],r:n[r+2]}}).filter(e=>e.r>0),this.refreshPlanPreview()}readGPUEvents(e){let t=new Uint32Array(e),n=new Float32Array(e),r=t[0];for(let e=Math.max(this.lastEventSequence,r-80);e<r;e++){let r=1+e%80*6,i=this.entities[t[r+1]],a=this.entities[t[r+2]],o=s[t[r+3]]?.name,c={1:`damage`,2:`heal`,3:`cast_start`,4:`cc`,5:`death`,6:`move`}[t[r+4]];i&&a&&c&&this.addLogEntry({timeMs:t[r],sourceId:i.id,sourceName:i.name,sourceTeam:i.team,targetId:a.id,targetName:a.name,targetTeam:a.team,type:c,spellName:o,value:n[r+5],text:`${i.name}: ${o??`Attack`} → ${a.name}`})}this.lastEventSequence=r}async runBatchBenchmark(e=2e5,n=t){await this.whenIdle(),this.search=null,this.benchmarking=!0;let r=this.device.createCommandEncoder();r.copyBufferToBuffer(this.liveStateBuffer,0,this.searchStateBuffer,0,i),r.copyBufferToBuffer(this.liveQueueBuffer,0,this.searchQueueBuffer,0,968),this.device.queue.submit([r.finish()]),this.device.queue.writeBuffer(this.searchSliceBuffer,0,new Uint32Array([0,n,0,0]));let a=Math.ceil(e/n);try{let e=performance.now();for(let e=0;e<a;e++){let t=(e+1)*7919,r=new Uint32Array([t,n,8,1e4]);this.device.queue.writeBuffer(this.simParamsBuffer,0,r);let i=this.device.createCommandEncoder(),a=i.beginComputePass();a.setPipeline(this.simulatePipeline),a.setBindGroup(0,this.pipelineGroups.get(this.simulatePipeline)),a.dispatchWorkgroups(Math.ceil(n/32)),a.end(),this.device.queue.submit([i.finish()])}await this.device.queue.onSubmittedWorkDone();let t=performance.now()-e,r=Math.round(a*n/(t/1e3));return this.totalSimulationsRun+=a*n,{elapsedMs:t,fightsPerSec:r}}finally{this.benchmarking=!1}}seedInitialBestPlan(){if(!this.bestPlanBuffer)return;let e=new Uint32Array(48);for(let t=0;t<6;t++){let n=this.entities[t],r=n?n.targetId:0,i=n&&n.powerType===1?0:n&&n.className===`Priest`?20:30,a=0;n&&(n.className===`Warrior`?a=1:n.className===`Priest`?a=5:n.className===`Mage`?a=10:n.className===`Warlock`&&(a=13)),this.eliteActions[t]={spellId:a,targetId:r,desiredRange:i};for(let n=0;n<8;n++){let o=n===0?a:0;e[t*8+n]=o&255|(i&255)<<8|(r&65535)<<16}}this.device.queue.writeBuffer(this.bestPlanBuffer,0,e),this.device.queue.writeBuffer(this.committedPlanBuffer,0,e),this.publishedPlan=e,this.publishedOrigin=new Uint32Array([this.simTimeMs,...this.entities.map(e=>e.decisionCount??0),0]),this.device.queue.writeBuffer(this.committedOriginBuffer,0,this.publishedOrigin),this.planOriginMs=this.simTimeMs,this.refreshPlanPreview()}resetMatch(){this.simTimeMs=0,this.combatFailed=!1,this.arenaInitialized=0,this.device.queue.writeBuffer(this.liveQueueBuffer,0,new Uint32Array(242)),this.totalSimulationsRun=0,this.lastEventSequence=0,this.device.queue.writeBuffer(this.combatEventsBuffer,0,new Uint32Array(481)),this.combatLog=[],this.initDefaultEntities(),this.seedInitialBestPlan(),this.writeLiveStateToGPU()}},v=document.getElementById(`arenaCanvas`),y=v.getContext(`2d`),ee=document.getElementById(`showPlan`),te=new u,b=new d,x=new Map,ne=performance.now(),S=document.getElementById(`searchActBtn`),C=document.getElementById(`benchBtn`),w=document.getElementById(`stepBtn`),T=document.getElementById(`resetBtn`),E=document.getElementById(`statusLabel`),re=document.getElementById(`throughputLabel`),ie=document.getElementById(`fitnessLabel`),ae=document.getElementById(`stabilityLabel`),oe=document.getElementById(`matchTimeLabel`),se=document.getElementById(`unitFramesContainer`),D=document.getElementById(`combatLogList`),ce=document.getElementById(`logCountBadge`),le=document.getElementById(`toggleLogBtn`),ue=document.getElementById(`clearLogBtn`),O=document.createElement(`div`);O.className=`spell-tooltip`,O.id=`spellTooltip`,O.role=`tooltip`,O.hidden=!0,document.body.appendChild(O);var k=null;function A(){k=null,O.hidden=!0}document.addEventListener(`pointermove`,e=>{let t=e.target.closest(`[data-spell-id]`);t?(k={spellId:Number(t.dataset.spellId),unitId:Number(t.dataset.unitId),x:e.clientX,y:e.clientY,aura:t.dataset.aura===`true`},j()):A()}),window.addEventListener(`blur`,A),document.addEventListener(`scroll`,A,!0),document.addEventListener(`pointerleave`,A),document.addEventListener(`keydown`,e=>{e.key===`Escape`&&A()});function j(){if(!k)return;let{spellId:e,unitId:t,x:n,y:r,aura:i}=k,a=s[e],o=P.entities[t];if(!a||!o){A();return}let c=p(o,P.simTimeMs).find(t=>t.id===e),l=o.auras.find(t=>t.spellId===e&&t.expiresAt>P.simTimeMs),u=i?l?`${((l.expiresAt-P.simTimeMs)/1e3).toFixed(1)}s remaining`:`Effect expired`:c&&c.remainingMs>0?`Cooldown: ${(c.remainingMs/1e3).toFixed(1)}s remaining`:`Individual cooldown ready`,d={1:`Healing received reduced`,2:`Damage taken reduced`,3:`Absorbs damage`,4:`Healing over time`,5:`Movement slowed 50%`,6:`Root: unable to move`,7:`Damage over time`,8:`Polymorph: damage breaks effect`}[a.auraType],f={1:`Stun`,2:`Silence`,3:`Interrupt`,4:`Fear`,5:`Root`,6:`Horror`}[a.ccType],m=[d,a.selfHealRatio?`Heals caster for ${a.selfHealRatio*100}% of damage dealt`:``,f?`${f} · up to ${a.ccDurationMs/1e3}s`:``].filter(Boolean).join(` · `);O.innerHTML=`<strong>${a.name}</strong>
    <span class="spell-tooltip-status">${u}</span>
    <span>${a.cost} ${{0:`mana`,1:`rage`,2:`energy`}[a.powerType]} · ${a.rangeYards} yd range</span>
    <span>${a.channelMs?`${a.channelMs/1e3}s channel`:a.castTimeMs?`${a.castTimeMs/1e3}s cast`:`Instant`} · ${a.cooldownMs?`${a.cooldownMs/1e3}s cooldown`:`No individual cooldown`}</span>
    ${m?`<span>${m}</span>`:``}
    <small>${i?`Active effect on this unit.`:`Casting also requires resources, global cooldown, range and line of sight.`}</small>`,O.hidden=!1;let h=O.getBoundingClientRect();O.style.left=`${Math.max(8,Math.min(n+14,window.innerWidth-h.width-8))}px`,O.style.top=`${Math.max(8,r+h.height+20>window.innerHeight?r-h.height-12:r+18)}px`}var M=document.getElementById(`editorOverlay`),de=document.getElementById(`editorTitle`),fe=document.getElementById(`closeEditorBtn`),pe=document.getElementById(`saveEditorBtn`),me=document.getElementById(`editHp`),he=document.getElementById(`editAp`),ge=document.getElementById(`editSp`),_e=document.getElementById(`editArmor`),ve=document.getElementById(`editSpeed`),ye=document.getElementById(`editGear`),N=null,P=new _;P.maxSearchInFlight=3;var be=2e3;if(new URLSearchParams(location.search).has(`gpuDebug`)){let e=crypto.randomUUID();P.diagnosticStage=async t=>{if(E.textContent=`GPU diagnostic: ${t}`,!(await fetch(`/__gpu_diagnostic`,{method:`POST`,headers:{"Content-Type":`application/json`},body:JSON.stringify({runId:e,mode:`app-init`,stage:t,userAgent:navigator.userAgent})})).ok)throw Error(`Diagnostic logging unavailable; restart npm run dev.`)}}var F=[],I=[],L=-1e3;window.addEventListener(`error`,e=>I.push(e.message)),window.addEventListener(`unhandledrejection`,e=>I.push(String(e.reason))),document.getElementById(`exportLogBtn`).addEventListener(`click`,()=>{let e={exportedAt:new Date().toISOString(),simTimeMs:P.simTimeMs,combatLog:P.combatLog,entities:P.entities,actions:P.eliteActions,snapshots:F,errors:I,scheduling:{submittedTimeMs:P.submittedTimeMs,planOriginMs:P.planOriginMs,lastSearchMs:P.lastSearchMs,lastSearchSliceMs:P.lastSearchSliceMs,candidatesPerSlice:P.searchCandidatesPerSlice,searchThroughputPerMs:P.searchThroughput,livePopulation:P.adaptivePopulation(),planAgeMs:P.submittedTimeMs-P.planOriginMs},planStability:P.planStability,mageCandidateFitness:P.mageCandidateFitness,gpuErrors:P.gpuErrors},t=URL.createObjectURL(new Blob([JSON.stringify(e,null,2)],{type:`application/json`})),n=document.createElement(`a`);n.href=t,n.download=`battle-log.json`,n.click(),setTimeout(()=>URL.revokeObjectURL(t),1e3)});var R=document.getElementById(`playbackSpeed`),z=performance.now(),B=0;function V(){z=performance.now(),B=0}R.addEventListener(`change`,V),document.addEventListener(`visibilitychange`,V);var H=!1,U=!1,W=performance.now(),G=0,K=60,q=40,xe=new Map;function J(e){let t=xe.get(e);return t||(t=new Image,t.src=e,xe.set(e,t)),t}async function Se(){E.textContent=`Initializing WebGPU...`,await P.init()?(E.innerHTML=`<span style="color:#51cf66">WebGPU Pipeline Ready (32,768 Candidates)</span>`,S.addEventListener(`click`,()=>{V(),H=!H,H?(S.textContent=`Pause Search & Act`,S.classList.add(`active`)):(S.textContent=`Search & Act (RHEA)`,S.classList.remove(`active`))}),C.addEventListener(`click`,async()=>{let e=H;H=!1,U=!1,S.textContent=`Search & Act (RHEA)`,S.classList.remove(`active`),E.innerHTML=`<span style="color:#f59e0b">Running 200k GPU Fights Benchmark (fastsim profile)...</span>`,C.disabled=!0,setTimeout(async()=>{let n=await P.runBatchBenchmark(2e5,t);E.innerHTML=`<span style="color:#10b981">Benchmark: 200,000 fights in ${n.elapsedMs.toFixed(1)}ms (${n.fightsPerSec.toLocaleString()} fights/sec)</span>`,C.disabled=!1,e&&(V(),H=!0,S.textContent=`Pause Search & Act`,S.classList.add(`active`))},50)}),w.addEventListener(`click`,()=>{Oe(100),$(),U=P.isPlanning,P.requestSnapshot()}),T.addEventListener(`click`,()=>{U=!1,P.resetMatch(),V(),H=!1,x.clear(),te.reset(),b.reset(),S.disabled=!1,w.disabled=!1,S.textContent=`Search & Act (RHEA)`,S.classList.remove(`active`),E.textContent=`Ready for a new fight.`,G=0,je(),X(!0)}),De(),Z(),j(),Ce(),requestAnimationFrame(Ae)):(E.innerHTML=`<span style="color:#ff6b6b">WebGPU not supported or device init failed. Run on Chrome/Edge/Firefox with WebGPU enabled.</span>`,P.gpuErrors.length&&(E.textContent=`GPU initialization failed: ${P.gpuErrors.join(`; `)}`),S.disabled=!0,w.disabled=!0,C.disabled=!0)}function Ce(){fe.addEventListener(`click`,()=>{M.style.display=`none`}),pe.addEventListener(`click`,async()=>{let e=H;if(H=!1,U=!1,await P.whenIdle(),N!==null){let e=P.entities[N];e.maxHp=parseFloat(me.value)||e.maxHp,e.hp=Math.min(e.hp,e.maxHp),e.attackPower=parseFloat(he.value)||e.attackPower,e.spellPower=parseFloat(ge.value)||e.spellPower,e.armor=parseFloat(_e.value)||e.armor,e.weaponSpeedSec=parseFloat(ve.value)||e.weaponSpeedSec,e.swingSpeedMs=Math.round(e.weaponSpeedSec*1e3),e.gearSummary=ye.value||e.gearSummary,P.writeLiveStateToGPU(),Z(),j()}M.style.display=`none`,V(),H=e})}function we(e){N=e;let t=P.entities[e];de.textContent=`Edit ${t.name} (${t.className})`,me.value=t.maxHp.toString(),he.value=t.attackPower.toString(),ge.value=t.spellPower.toString(),_e.value=t.armor.toString(),ve.value=t.weaponSpeedSec.toString(),ye.value=t.gearSummary,M.style.display=`flex`}var Y=!1,Te=0,Ee=0;function De(){le.addEventListener(`click`,()=>{Y=!Y,D.style.display=Y?`none`:`flex`,le.textContent=Y?`Expand`:`Collapse`}),ue.addEventListener(`click`,()=>{P.combatLog=[],X(!0)})}function X(e=!1){if(Y&&!e)return;let t=P.combatLog.length,n=P.combatLog.at(-1)?.id??0;if(t===Te&&n===Ee&&!e)return;if(Te=t,Ee=n,ce.textContent=`(${t} events)`,t===0){D.innerHTML=`<div style="color: #64748b; font-style: italic;">Awaiting match action...</div>`;return}let r=P.combatLog.slice(-40),i=document.createDocumentFragment();for(let e=0;e<r.length;e++){let t=r[e],n=document.createElement(`div`);n.className=`log-entry`;let a=(t.timeMs/1e3).toFixed(2),o=t.text;if(t.sourceName){let e=t.sourceTeam===0?`team-0-name`:`team-1-name`;o=o.replace(t.sourceName,`<span class="${e}">${t.sourceName}</span>`)}if(t.targetName){let e=t.targetTeam===0?`team-0-name`:`team-1-name`;o=o.replace(t.targetName,`<span class="${e}">${t.targetName}</span>`)}t.type===`damage`?t.value!==void 0&&Number.isFinite(t.value)&&(o+=` · <span class="val-dmg">${Math.round(t.value)} damage</span>`):t.type===`heal`?t.value!==void 0&&Number.isFinite(t.value)&&(o+=` · <span class="val-heal">+${Math.round(t.value)} HP</span>`):t.type===`cc`?o=o.replace(/(stunned|silenced|interrupted)/,`<span class="val-cc">$1</span>`):t.type===`death`&&(o=`<span class="val-death">${o}</span>`),n.innerHTML=`
      <span class="log-time">[${a}s]</span>
      <span class="log-text">${o}</span>
    `,i.appendChild(n)}D.replaceChildren(i),D.scrollTop=D.scrollHeight}function Z(){se.innerHTML=``,P.entities.filter(e=>e.className!==`None`&&e.maxHp>0).forEach(e=>{let t=document.createElement(`div`);t.className=`unit-frame-card team-${e.team}`,t.addEventListener(`click`,()=>we(e.id));let n=Math.max(0,Math.min(100,e.hp/e.maxHp*100)),r=Math.max(0,Math.min(100,e.power/e.maxPower*100)),i=e.powerType===1?`power-rage`:``,a=P.entities[e.targetId],o=a?Math.hypot(a.posX-e.posX,a.posY-e.posY).toFixed(1):`0`,c=P.eliteActions[e.id],l=c?c.desiredRange:e.powerType===1?0:30,u=l<=5?`⚔ Melee (0y)`:`🏹 Range (${l}y)`,d=c&&c.spellId>0?s[c.spellId]?.name:`Auto/Idle`,f=``;if(e.auras&&e.auras.length>0){let t=e.auras.filter(e=>e.expiresAt>P.simTimeMs);if(t.length>0){f=`<div class="unit-auras-row" style="display: flex; gap: 4px; margin-top: 4px; flex-wrap: wrap;">`;for(let n of t){let t=s[n.spellId],r=t?t.icon:`/icons/ability_meleedamage.png`,i=((n.expiresAt-P.simTimeMs)/1e3).toFixed(0);f+=`
            <div style="position: relative; width: 18px; height: 18px; border: 1px solid #475569; border-radius: 2px; overflow: hidden;" data-spell-id="${n.spellId}" data-unit-id="${e.id}" data-aura="true" aria-describedby="spellTooltip">
              <img src="${r}" style="width: 100%; height: 100%; object-fit: cover;" />
              <span style="position: absolute; bottom: 0; right: 1px; font-size: 8px; color: #fff; text-shadow: 1px 1px 1px #000; font-weight: bold;">${i}</span>
            </div>
          `}f+=`</div>`}}let m=``;e.className===`Mage`&&P.mageCandidateFitness&&(m=`<div class="unit-meta-stats" style="color: #cbd5e1; font-size: 10px; margin-top: 2px;">
        <span>Cands: FB: ${P.mageCandidateFitness.frostbolt===void 0?`—`:P.mageCandidateFitness.frostbolt.toFixed(0)} | Blast: ${P.mageCandidateFitness.fireblast===void 0?`—`:P.mageCandidateFitness.fireblast.toFixed(0)} | Poly: ${P.mageCandidateFitness.polymorph===void 0?`—`:P.mageCandidateFitness.polymorph.toFixed(0)}</span>
      </div>`),t.innerHTML=`
      <div class="unit-frame-header">
        <img class="unit-icon" src="${e.icon}" alt="${e.name}" />
        <div class="unit-info-text">
          <span class="unit-name">${e.name} ${e.alive===0?`(Dead)`:``}</span>
          <span class="unit-class-sub">${e.gearSummary}</span>
        </div>
      </div>
      <div class="bar-container">
        <div class="hp-bar-fill" style="width: ${n}%"></div>
      </div>
      <div class="bar-container" style="height: 5px;">
        <div class="power-bar-fill ${i}" style="width: ${r}%"></div>
      </div>
      <div class="unit-effects">${h(e,P.simTimeMs).map(e=>`
        <span class="effect-badge" style="--effect-color: ${e.color}" title="${e.detail}">
          ${e.label} <b>${((e.expiresAt-P.simTimeMs)/1e3).toFixed(1)}s</b>
        </span>`).join(``)}</div>
      <div class="unit-aura-slot">${f}</div>
      <div class="unit-abilities" aria-label="Ability cooldowns">${p(e,P.simTimeMs).map(({spell:t,remainingMs:n,fraction:r})=>{let i=n>0,a=i?`${(n/1e3).toFixed(1)}s remaining`:`Cooldown ready`;return`<div class="ability-slot${i?` on-cooldown`:``}${e.alive?``:` inactive`}" tabindex="0"
          aria-label="${t.name}: ${a}" data-spell-id="${t.id}" data-unit-id="${e.id}" aria-describedby="spellTooltip">
          <img src="${t.icon}" alt="${t.name}" />
          ${i?`<span class="cooldown-sweep" style="background: conic-gradient(rgba(8,12,24,.82) ${r*360}deg, transparent 0deg)"></span>
          <span class="cooldown-time">${n>=1e4?Math.ceil(n/1e3):(n/1e3).toFixed(1)}</span>`:``}
        </div>`}).join(``)}</div>
      <div class="unit-meta-stats">
        <span>HP: ${Math.round(e.hp)} / ${e.maxHp}</span>
        <span>Pos: (${e.posX.toFixed(1)}, ${e.posY.toFixed(1)})</span>
      </div>
      <div class="unit-meta-stats" style="color: #a5b4fc; margin-top: 2px;">
        <span>Tgt: ${a?a.name:`None`} (${o}y)</span>
        <span>${u} | ${d}</span>
      </div>
      ${m}
    `,se.appendChild(t)})}function Q(){let e=P.matchResult;return e!==null&&(H=!1,U=!1,P.cancelPlanning(),S.classList.remove(`active`),S.textContent=`Fight finished`,S.disabled=!0,w.disabled=!0,E.textContent=`${e===`draw`?`Draw`:e===`team0`?`Team 0 wins`:`Team 1 wins`} at ${(P.simTimeMs/1e3).toFixed(1)}s. Reset to fight again.`,!0)}function Oe(e){return Q()||!P.advanceLiveAsync(e)?!1:(Q(),P.simTimeMs<L&&(F.length=0,L=-1e3),P.simTimeMs-L>=1e3&&(L=P.simTimeMs,F.push(structuredClone({timeMs:P.simTimeMs,entities:P.entities,actions:P.eliteActions,plan:P.elitePlanHorizon})),F.length>300&&F.shift()),!0)}function ke(){let e=P.planStability;if(!e.length)return`Waiting for search
T0  —
T1  —`;let t=[0,1].map(t=>{let n=0,r=0,i=0;for(let a of e){let e=a.teams[t];n+=e.changed,r+=e.compared,i+=Number(e.baselineKept)}return`T${t}  ${r?`${Math.round(100*n/r)}% changed`:`No overlap`} · ${Math.round(100*i/e.length)}% kept`});return[`Last ${e.length}/20 searches`,...t].join(`
`)}function $(){let e=P.totalSimulationsRun;for(let e=0;e<P.maxSearchInFlight&&P.stepRHEAAsync(P.adaptivePopulation());e++);G+=P.totalSimulationsRun-e}async function Ae(e){if(e-W>=1e3){let t=(e-W)/1e3,n=Math.round(G/t),r=P.submittedTimeMs-P.planOriginMs,i=H&&r>be;re.textContent=`${n.toLocaleString()} rollouts/s\nPopulation ${P.adaptivePopulation().toLocaleString()} · Total ${P.totalSimulationsRun.toLocaleString()}\nPlan age ${(r/1e3).toFixed(1)}s${i?` · Falling behind`:``}`,re.style.color=i?`#f87171`:``,i&&console.warn(`Stale plan: ${r}ms old (throughput ${P.searchThroughput.toFixed(1)}/ms, pop ${P.adaptivePopulation()})`),G=0,W=e}let t=Math.max(0,Math.min(250,e-z));if(z=e,H&&!document.hidden)for(B+=t*Number(R.value),B=Math.min(B,250);B>=50&&Oe(50);)B-=50;else B=0;H&&!document.hidden?$():U&&!document.hidden&&(P.isPlanning?$():U=!1),!P.combatFailed&&!P.matchResult&&(H||P.isPlanning||P.submittedTimeMs>P.simTimeMs)&&P.requestSnapshot(),P.combatFailed&&(H=!1,U=!1,E.textContent=P.gpuErrors.at(-1)??`GPU combat failed.`),Q(),ie.textContent=`T0  ${P.bestFitnessScoreTeam0.toFixed(0)}\nT1  ${P.bestFitnessScoreTeam1.toFixed(0)}`,ae.textContent=ke(),oe.textContent=`${(P.simTimeMs/1e3).toFixed(1)}s`,je(),Z(),j(),X(),requestAnimationFrame(Ae)}function je(){y.clearRect(0,0,v.width,v.height);let e=v.width-40,t=v.height-40;y.fillStyle=`#08090f`,y.fillRect(20,20,e,t),y.strokeStyle=`#4338ca`,y.lineWidth=3,y.strokeRect(20,20,e,t),y.strokeStyle=`#161928`,y.lineWidth=1;let r=e/12;for(let n=20+r;n<20+e;n+=r)y.beginPath(),y.moveTo(n,20),y.lineTo(n,20+t),y.stroke();let i=t/8;for(let n=20+i;n<20+t;n+=i)y.beginPath(),y.moveTo(20,n),y.lineTo(20+e,n),y.stroke();y.beginPath(),y.arc(v.width/2,v.height/2,50,0,Math.PI*2),y.strokeStyle=`rgba(99, 102, 241, 0.15)`,y.lineWidth=2,y.stroke(),P.pillars.forEach(n=>{let r=20+n.x/K*e,i=20+n.y/q*t,a=n.r/K*e;y.beginPath(),y.arc(r,i,a,0,Math.PI*2),y.fillStyle=`#1e1b4b`,y.fill(),y.strokeStyle=`#3730a3`,y.lineWidth=2,y.stroke()});let a=P.entities.filter(e=>e.className!==`None`&&e.maxHp>0),o=performance.now(),c=Math.min(.25,(o-ne)/1e3);ne=o;let l=Math.max(.1,Number(R.value)),u=new Map;a.forEach(r=>{let i=x.get(r.id),a=i?Math.hypot(r.posX-i.x,r.posY-i.y):1/0;if(!i||a>10||!H)i={x:r.posX,y:r.posY};else{let e=r.alive===1,t=Math.max(r.stunEnd,r.horrorEnd??0)>P.simTimeMs||r.auras.some(e=>e.auraType===8&&e.expiresAt>P.simTimeMs),a=r.castSpellId>0&&r.castEnd>P.simTimeMs,o=1;if(r.auras){for(let e of r.auras)if(e.expiresAt>P.simTimeMs){if(e.auraType===6){o=0;break}e.auraType===5&&(o=Math.min(o,.5))}}let s=r.targetId;if(s>=P.entities.length||P.entities[s].alive===0||P.entities[s].team===r.team){for(let e of P.entities)if(e.alive===1&&e.team!==r.team&&e.className!==`None`&&e.maxHp>0){s=e.id;break}}let u=P.entities[s],d=!1,f=0,p=0;if(e&&!t&&!a&&u&&u.alive===1&&o>0){let e=u.posX-i.x,t=u.posY-i.y,n=Math.hypot(e,t);if(n>.1){let i=P.eliteActions[r.id],a=i?i.desiredRange:r.powerType===1?0:30,o=0;n>a+1?o=1:n<a-1&&(o=-1),o!==0&&(d=!0,f=e/n*o,p=t/n*o)}}let m=r.posX-i.x,h=r.posY-i.y,g=Math.hypot(m,h),_=(r.speed||7)*o*l,v=_*c;if(!e)i={x:r.posX,y:r.posY};else if(!d){if(g>.001){let e=Math.min(g,Math.max(_,5)*c);i={x:i.x+m/g*e,y:i.y+h/g*e}}else i={x:r.posX,y:r.posY}}else if(g>v){let e=_*Math.max(1,g/3.5),t=Math.min(g,e*c);i={x:i.x+m/g*t,y:i.y+h/g*t}}else{let e=v-g;i={x:r.posX+f*e,y:r.posY+p*e}}for(let e of P.pillars){if(!e||e.r<=0)continue;let t=e.r+n,r=i.x-e.x,a=i.y-e.y,o=Math.hypot(r,a);if(o<t){let n=t/Math.max(.001,o);i={x:e.x+r*n,y:e.y+a*n}}}i.x=Math.max(n,Math.min(K-n,i.x)),i.y=Math.max(n,Math.min(q-n,i.y))}x.set(r.id,i),u.set(r.id,{x:20+i.x/K*e,y:20+i.y/q*t})});let d=n/K*e;a.forEach(e=>{if(e.alive===1&&e.targetId<a.length&&a[e.targetId].alive===1){let t=a[e.targetId],{x:n,y:r}=u.get(e.id),{x:i,y:o}=u.get(t.id);y.beginPath(),y.moveTo(n,r),y.lineTo(i,o),y.strokeStyle=e.team===0?`rgba(16, 185, 129, 0.35)`:`rgba(239, 68, 68, 0.35)`,y.lineWidth=1.5,y.stroke()}}),te.update(P.combatLog,u,c*l),te.draw(y,u,d),b.update(a,P.simTimeMs,c*l),b.draw(y,u,d),a.forEach(e=>{let{x:t,y:n}=u.get(e.id),r=e.alive===1;if(y.beginPath(),y.arc(t,n,d,0,Math.PI*2),y.fillStyle=r?e.team===0?`#064e3b`:`#7f1d1d`:`#18181b`,y.fill(),y.lineWidth=2.5,y.strokeStyle=r?e.team===0?`#10b981`:`#ef4444`:`#52525b`,y.stroke(),e.icon){let r=J(e.icon);r.complete&&r.naturalWidth>0&&(y.save(),y.beginPath(),y.arc(t,n,d-2,0,Math.PI*2),y.clip(),y.drawImage(r,t-(d-2),n-(d-2),(d-2)*2,(d-2)*2),y.restore())}y.font=`bold 11px sans-serif`,y.fillStyle=r?`#fff`:`#71717a`,y.textAlign=`center`,y.fillText(e.name,t,n-26);let i=h(e,P.simTimeMs),a=i.some(e=>e.kind===`root`),o=i.some(e=>e.kind===`fear`);if(a||o){if(y.save(),y.strokeStyle=a?`#67e8f9`:`#c084fc`,y.fillStyle=a?`rgba(103,232,249,0.14)`:`rgba(192,132,252,0.12)`,y.lineWidth=2,y.beginPath(),a){for(let e=0;e<6;e++){let r=Math.PI/3*e-Math.PI/2,i=t+Math.cos(r)*(d+7),a=n+Math.sin(r)*(d+7);e===0?y.moveTo(i,a):y.lineTo(i,a)}y.closePath()}else y.setLineDash([4,4]),y.arc(t,n,d+6,0,Math.PI*2);y.fill(),y.stroke(),y.restore()}i.forEach((e,r)=>{let i=`${e.label.toUpperCase()} ${((e.expiresAt-P.simTimeMs)/1e3).toFixed(1)}s`;y.font=`bold 10px sans-serif`;let a=y.measureText(i).width+12,o=Math.max(a/2+2,Math.min(v.width-a/2-2,t)),s=Math.max(12,n-44-r*17);y.fillStyle=`#111521`,y.fillRect(o-a/2,s-11,a,15),y.fillStyle=e.color,y.fillText(i,o,s)});let c=Math.max(0,e.hp/e.maxHp);y.fillStyle=`#000`,y.fillRect(t-22,n+24,44,5),y.fillStyle=e.team===0?`#10b981`:`#ef4444`,y.fillRect(t-22,n+24,44*c,5),y.strokeStyle=`#27272a`,y.strokeRect(t-22,n+24,44,5);let l=P.simTimeMs;if(e.castSpellId>0&&e.castEnd>l){let r=s[e.castSpellId],i=Math.max(0,Math.min(1,1-(e.castEnd-l)/r.castTimeMs));if(y.fillStyle=`#111`,y.fillRect(t-22,n+32,44,4),y.fillStyle=`#f59e0b`,y.fillRect(t-22,n+32,44*i,4),r.icon){let e=J(r.icon);e.complete&&e.naturalWidth>0&&y.drawImage(e,t+22+2,n+26,14,14)}}let f=P.elitePlanHorizon[e.id];if(ee?.checked&&r&&f&&f.length>0){let r=t-f.length*12/2,i=n+(e.castSpellId>0&&e.castEnd>l?40:33);for(let e=0;e<f.length;e++){let t=f[e],n=t.spellId,a=r+e*12,o=s[n];if(o&&o.icon){let e=J(o.icon);e.complete&&e.naturalWidth>0?y.drawImage(e,a,i,10,10):(y.fillStyle=n===0?`#3f3f46`:`#6366f1`,y.fillRect(a,i,10,10))}else y.fillStyle=`#3f3f46`,y.fillRect(a,i,10,10);y.strokeStyle=e===0?`#f59e0b`:`#27272a`,y.lineWidth=1,y.strokeRect(a,i,10,10),t.desiredRange<=5?(y.fillStyle=`#10b981`,y.beginPath(),y.arc(a+5,i-3,2,0,Math.PI*2),y.fill()):(y.fillStyle=`#38bdf8`,y.beginPath(),y.arc(a+5,i-3,2,0,Math.PI*2),y.fill())}}})}E.textContent=`GPU paused. Click Initialize GPU to enable the simulator.`,S.textContent=`Initialize GPU`,w.disabled=!0,C.disabled=!0,T.disabled=!0,S.addEventListener(`click`,async()=>{S.disabled=!0;try{await Se(),P.gpuErrors.length===0&&(S.disabled=!1,S.textContent=`Search & Act (RHEA)`,w.disabled=!1,C.disabled=!1,T.disabled=!1)}catch(e){E.textContent=`GPU initialization failed: ${String(e)}`}},{once:!0});