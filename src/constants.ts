// Unified combat constants and action definitions

export const MAX_ENTITIES = 6; // up to 3v3
export const MAX_AURAS = 8;
export const MAX_PILLARS = 4;
export const HORIZON_LENGTH = 8; // RHEA plan steps
export const POPULATION_SIZE = 32768;
export const BENCHMARK_BATCH_SIZE = 65536;
export const WORKGROUP_SIZE = 32; // Native Wave32/Warp32 alignment

export interface ArenaPillar {
  x: number;
  y: number;
  r: number;
}

// Physical radius of a unit token (yards). Pillar collision is inflated by this so
// tokens never visually overlap obstacles; the renderer draws tokens at this size.
export const UNIT_RADIUS_YARDS = 1.5;

export const DEFAULT_ARENA_PILLARS: ArenaPillar[] = [
  { x: 18, y: 15, r: 2.8 },
  { x: 42, y: 15, r: 2.8 },
  { x: 18, y: 25, r: 2.8 },
  { x: 42, y: 25, r: 2.8 },
];

// Shared GPU/CPU memory layout constants for ArenaState & EntityState
export const ARENA_HEADER_WORDS = 4;
export const ENTITY_BASE_WORDS = 47;
export const AURA_SLOT_WORDS = 8;
export const ENTITY_WORDS = ENTITY_BASE_WORDS + MAX_AURAS * AURA_SLOT_WORDS;
export const PILLAR_WORDS = 4; // x, y, r, pad
export const ARENA_PILLARS_OFFSET_WORDS = ARENA_HEADER_WORDS + MAX_ENTITIES * ENTITY_WORDS;
export const ARENA_WORDS = ARENA_PILLARS_OFFSET_WORDS + MAX_PILLARS * PILLAR_WORDS;
export const ARENA_BYTES = ARENA_WORDS * 4;
export const SIM_QUEUE_WORDS = 2 + 40 * 6; // 242 words
export const SIM_QUEUE_BYTES = SIM_QUEUE_WORDS * 4; // 968 bytes
export const COMBAT_EVENTS_WORDS = 1 + 80 * 6; // 481 words
export const COMBAT_EVENTS_BYTES = COMBAT_EVENTS_WORDS * 4; // 1924 bytes
export const BEST_PLAN_WORDS = MAX_ENTITIES * HORIZON_LENGTH; // 48 words
export const BEST_PLAN_BYTES = BEST_PLAN_WORDS * 4; // 192 bytes

export const ENTITY_FIELD_OFFSETS = {
  uint: {
    id: 0,
    team: 1,
    alive: 2,
    targetId: 3,
    powerType: 8,
    gcdEnd: 9,
    castEnd: 10,
    castSpellId: 11,
    swingTimer: 12,
    swingSpeedMs: 13,
    stunEnd: 21,
    silenceEnd: 22,
    drStunCount: 23,
    drStunResetAt: 24,
    decisionCount: 26,
    extraCooldowns: 28,
    horrorEnd: 29,
    incapacitateType: 30,
    nextFleeAt: 31,
    extraCooldowns2: 32,
    extraCooldowns3: 33,
    polymorphDrCount: 34,
    polymorphDrResetAt: 35,
    extraCooldowns4: 36,
    combatUntil: 37,
    dashStart: 38,
    dashEnd: 39,
    controlledStunCount: 44,
    controlledStunResetAt: 45,
    controlledStunEnd: 46,
  },
  float: {
    hp: 4,
    maxHp: 5,
    power: 6,
    maxPower: 7,
    attackPower: 14,
    spellPower: 15,
    critChance: 16,
    armor: 17,
    posX: 18,
    posY: 19,
    speed: 20,
    dashOriginX: 40,
    dashOriginY: 41,
    dashDestX: 42,
    dashDestY: 43,
  },
} as const;

export const POWER_TYPE_MANA = 0;
export const POWER_TYPE_RAGE = 1;
export const POWER_TYPE_ENERGY = 2;

export const EVENT_KIND_NONE = 0;
export const EVENT_KIND_SWING = 1;
export const EVENT_KIND_CAST_COMPLETE = 2;
export const EVENT_KIND_DOT_TICK = 3;
export const EVENT_KIND_GCD = 4;
export const EVENT_KIND_DECISION = 5;

export interface CombatLogEntry {
  id: number;
  timeMs: number;
  sourceId: number;
  sourceName: string;
  sourceTeam: number;
  targetId?: number;
  targetName?: string;
  targetTeam?: number;
  type: 'damage' | 'heal' | 'cast_start' | 'cc' | 'death' | 'move';
  spellName?: string;
  value?: number;
  text: string;
}

export const MAX_SPELLS = 23;

export interface AuraDef {
  id: number;
  name: string;
  icon: string;
  isDebuff: boolean;
  durationMs: number;
  tickIntervalMs: number;
  tickValue: number;
  healingReceivedMod: number; // e.g. 0.5 for -50% healing (Mortal Strike)
  damageReductionMod: number; // e.g. 0.4 for -60% damage taken (Shield Wall)
  speedMod: number;           // e.g. 0.5 for 50% slow (Hamstring/Frostbolt)
  absorbRemaining: number;    // e.g. 500 for PW:Shield
}

export interface SpellDef {
  id: number;
  name: string;
  icon: string;
  castTimeMs: number;
  cooldownMs: number;
  cost: number;
  powerType: number;
  rangeYards: number;
  baseDamageMin: number;
  baseDamageMax: number;
  scaling: number; // AP or SP scaling
  isHeal: number;
  isDot: number;
  dotDurationMs: number;
  dotTickMs: number;
  dotDamagePerTick: number;
  ccType: number; // 0: None, 1: Stun, 2: Silence, 3: Interrupt, 4: Fear, 5: Root, 6: Horror
  ccDurationMs: number;
  classId?: number;
  selfOnly?: boolean;
  blinkDistance?: number;
  channelMs?: number;
  absorbBase?: number;
  minRangeYards?: number;
  requiresOutOfCombat?: boolean;
  powerGain?: number;
  dashSpeed?: number;
  selfHealRatio?: number; // fraction of damage dealt restored to caster
  auraType: number; // 0: None, 1: MortalWounds, 2: ShieldWall, 3: PWShield, 4: Renew, 5: Slow, 6: Root
}

const spellDefinitions: SpellDef[] = [
  {
    id: 0, classId: 0,
    name: "Idle / Wait",
    icon: "/icons/ability_meleedamage.png",
    castTimeMs: 0,
    cooldownMs: 0,
    cost: 0,
    powerType: 0,
    rangeYards: 0,
    baseDamageMin: 0,
    baseDamageMax: 0,
    scaling: 0,
    isHeal: 0,
    isDot: 0,
    dotDurationMs: 0,
    dotTickMs: 0,
    dotDamagePerTick: 0,
    ccType: 0,
    ccDurationMs: 0,
    auraType: 0,
  },
  // --- Warrior (Rage: 1) ---
  {
    id: 1, classId: 1,
    name: "Mortal Strike",
    icon: "/icons/ability_warrior_savageblow.png",
    castTimeMs: 0,
    cooldownMs: 6000,
    cost: 30,
    powerType: POWER_TYPE_RAGE,
    rangeYards: 5,
    baseDamageMin: 220,
    baseDamageMax: 260,
    scaling: 1.1,
    isHeal: 0,
    isDot: 0,
    dotDurationMs: 10000, // 10s Mortal Wounds debuff
    dotTickMs: 0,
    dotDamagePerTick: 0,
    ccType: 0,
    ccDurationMs: 0,
    auraType: 1, // Mortal Wounds (-50% healing taken)
  },
  {
    id: 2, classId: 1,
    name: "Rend",
    icon: "/icons/ability_gouge.png",
    castTimeMs: 0,
    cooldownMs: 0,
    cost: 10,
    powerType: POWER_TYPE_RAGE,
    rangeYards: 5,
    baseDamageMin: 30,
    baseDamageMax: 40,
    scaling: 0.2,
    isHeal: 0,
    isDot: 1,
    dotDurationMs: 12000,
    dotTickMs: 3000,
    dotDamagePerTick: 75,
    ccType: 0,
    ccDurationMs: 0,
    auraType: 7, // Periodic DoT aura
  },
  {
    id: 3, classId: 1,
    name: "Hamstring",
    icon: "/icons/ability_shockwave.png",
    castTimeMs: 0,
    cooldownMs: 0,
    cost: 10,
    powerType: POWER_TYPE_RAGE,
    rangeYards: 5,
    baseDamageMin: 45,
    baseDamageMax: 55,
    scaling: 0.15,
    isHeal: 0,
    isDot: 0,
    dotDurationMs: 8000, // 8s slow
    dotTickMs: 0,
    dotDamagePerTick: 0,
    ccType: 0,
    ccDurationMs: 0,
    auraType: 5, // 50% slow for 8s
  },
  {
    id: 4, classId: 1,
    name: "Shield Wall",
    icon: "/icons/ability_warrior_shieldwall.png",
    castTimeMs: 0,
    cooldownMs: 30000,
    cost: 15,
    powerType: POWER_TYPE_RAGE,
    rangeYards: 0,
    baseDamageMin: 0,
    baseDamageMax: 0,
    scaling: 0,
    isHeal: 1, // Self defensive buff
    isDot: 0,
    dotDurationMs: 8000, // 8s defensive wall
    dotTickMs: 0,
    dotDamagePerTick: 0,
    ccType: 0,
    ccDurationMs: 0,
    auraType: 2, // Shield Wall (-60% damage taken for 8s)
  },
  // --- Priest (Mana: 0) ---
  {
    id: 5, classId: 2,
    name: "Flash Heal",
    icon: "/icons/spell_holy_heal02.png",
    castTimeMs: 1500,
    cooldownMs: 0,
    cost: 380,
    powerType: POWER_TYPE_MANA,
    rangeYards: 35,
    baseDamageMin: 480,
    baseDamageMax: 580,
    scaling: 0.85,
    isHeal: 1,
    isDot: 0,
    dotDurationMs: 0,
    dotTickMs: 0,
    dotDamagePerTick: 0,
    ccType: 0,
    ccDurationMs: 0,
    auraType: 0,
  },
  {
    id: 6, classId: 2,
    name: "Renew",
    icon: "/icons/spell_holy_renew.png",
    castTimeMs: 0,
    cooldownMs: 0,
    cost: 290,
    powerType: POWER_TYPE_MANA,
    rangeYards: 35,
    baseDamageMin: 0,
    baseDamageMax: 0,
    scaling: 0.3,
    isHeal: 1,
    isDot: 1, // HoT
    dotDurationMs: 15000,
    dotTickMs: 3000,
    dotDamagePerTick: 110,
    ccType: 0,
    ccDurationMs: 0,
    auraType: 4, // Renew HoT aura
  },
  {
    id: 7, classId: 2,
    name: "Power Word: Shield",
    icon: "/icons/spell_holy_powerwordshield.png",
    castTimeMs: 0,
    cooldownMs: 4000,
    cost: 420,
    powerType: POWER_TYPE_MANA,
    rangeYards: 35,
    baseDamageMin: 0,
    baseDamageMax: 0,
    scaling: 1.0,
    isHeal: 1,
    isDot: 0,
    dotDurationMs: 15000, // 15s absorb shield
    dotTickMs: 0,
    dotDamagePerTick: 0,
    ccType: 0,
    ccDurationMs: 0,
    auraType: 3, // Absorb shield (absorbs ~600 dmg)
  },
  {
    id: 8, classId: 2,
    name: "Shadow Word: Pain",
    icon: "/icons/spell_shadow_shadowwordpain.png",
    castTimeMs: 0,
    cooldownMs: 0,
    cost: 260,
    powerType: POWER_TYPE_MANA,
    rangeYards: 35,
    baseDamageMin: 0,
    baseDamageMax: 0,
    scaling: 0.25,
    isHeal: 0,
    isDot: 1,
    dotDurationMs: 18000,
    dotTickMs: 3000,
    dotDamagePerTick: 85,
    ccType: 0,
    ccDurationMs: 0,
    auraType: 7, // Periodic DoT aura
  },
  {
    id: 9, classId: 2,
    name: "Psychic Scream",
    icon: "/icons/spell_shadow_psychicscream.png",
    castTimeMs: 0,
    cooldownMs: 24000,
    cost: 320,
    powerType: POWER_TYPE_MANA,
    rangeYards: 8,
    baseDamageMin: 0,
    baseDamageMax: 0,
    scaling: 0,
    isHeal: 0,
    isDot: 0,
    dotDurationMs: 0,
    dotTickMs: 0,
    dotDamagePerTick: 0,
    ccType: 4, // Fear CC for 4s
    ccDurationMs: 4000,
    auraType: 0,
  },
  // --- Mage (Mana: 0) ---
  {
    id: 10, classId: 3,
    name: "Frostbolt",
    icon: "/icons/spell_frostbolt.png",
    castTimeMs: 2000,
    cooldownMs: 0,
    cost: 290,
    powerType: POWER_TYPE_MANA,
    rangeYards: 35,
    baseDamageMin: 320,
    baseDamageMax: 380,
    scaling: 0.9,
    isHeal: 0,
    isDot: 0,
    dotDurationMs: 5000, // 5s chill slow
    dotTickMs: 0,
    dotDamagePerTick: 0,
    ccType: 0,
    ccDurationMs: 0,
    auraType: 5, // 50% slow chill for 5s
  },
  {
    id: 11, classId: 3,
    name: "Fire Blast",
    icon: "/icons/spell_fire_fire.png",
    castTimeMs: 0,
    cooldownMs: 8000,
    cost: 310,
    powerType: POWER_TYPE_MANA,
    rangeYards: 25,
    baseDamageMin: 290,
    baseDamageMax: 350,
    scaling: 0.65,
    isHeal: 0,
    isDot: 0,
    dotDurationMs: 0,
    dotTickMs: 0,
    dotDamagePerTick: 0,
    ccType: 0,
    ccDurationMs: 0,
    auraType: 0,
  },
  {
    id: 12, classId: 3,
    name: "Frost Nova",
    icon: "/icons/spell_frostnova.png",
    castTimeMs: 0,
    cooldownMs: 20000,
    cost: 220,
    powerType: POWER_TYPE_MANA,
    rangeYards: 10,
    baseDamageMin: 70,
    baseDamageMax: 90,
    scaling: 0.2,
    isHeal: 0,
    isDot: 0,
    dotDurationMs: 6000, // 6s root
    dotTickMs: 0,
    dotDamagePerTick: 0,
    ccType: 5, // Root for 6s
    ccDurationMs: 6000,
    auraType: 6,
  },
  // --- Warlock (Mana: 0) ---
  {
    id: 13, classId: 4,
    name: "Corruption",
    icon: "/icons/spell_corruption.png",
    castTimeMs: 0,
    cooldownMs: 0,
    cost: 240,
    powerType: POWER_TYPE_MANA,
    rangeYards: 35,
    baseDamageMin: 0,
    baseDamageMax: 0,
    scaling: 0.25,
    isHeal: 0,
    isDot: 1,
    dotDurationMs: 15000,
    dotTickMs: 3000,
    dotDamagePerTick: 95,
    ccType: 0,
    ccDurationMs: 0,
    auraType: 7, // Periodic DoT aura
  },
  {
    id: 14, classId: 4,
    name: "Shadow Bolt",
    icon: "/icons/spell_shadowbolt.png",
    castTimeMs: 2500,
    cooldownMs: 0,
    cost: 360,
    powerType: POWER_TYPE_MANA,
    rangeYards: 35,
    baseDamageMin: 410,
    baseDamageMax: 490,
    scaling: 1.0,
    isHeal: 0,
    isDot: 0,
    dotDurationMs: 0,
    dotTickMs: 0,
    dotDamagePerTick: 0,
    ccType: 0,
    ccDurationMs: 0,
    auraType: 0,
  },
  {
    id: 15, classId: 4,
    name: "Fear",
    icon: "/icons/spell_shadow_possession.png",
    castTimeMs: 1500,
    cooldownMs: 0,
    cost: 300,
    powerType: POWER_TYPE_MANA,
    rangeYards: 25,
    baseDamageMin: 0,
    baseDamageMax: 0,
    scaling: 0,
    isHeal: 0,
    isDot: 0,
    dotDurationMs: 0,
    dotTickMs: 0,
    dotDamagePerTick: 0,
    ccType: 4, // Fear CC for 5s
    ccDurationMs: 5000,
    auraType: 0,
  },
  {
    id: 16, classId: 4, name: "Death Coil", icon: "/icons/spell_deathcoil.png",
    castTimeMs: 0, cooldownMs: 120000, cost: 565, powerType: POWER_TYPE_MANA,
    rangeYards: 30, baseDamageMin: 476, baseDamageMax: 476, scaling: 0.214,
    isHeal: 0, isDot: 0, dotDurationMs: 0, dotTickMs: 0, dotDamagePerTick: 0,
    ccType: 6, ccDurationMs: 3000, auraType: 0, selfHealRatio: 1,
  },
  {
    id: 17, name: "Polymorph", icon: "/icons/spell_polymorph.png",
    castTimeMs: 1500, cooldownMs: 0, cost: 150, powerType: POWER_TYPE_MANA,
    rangeYards: 30, baseDamageMin: 0, baseDamageMax: 0, scaling: 0,
    isHeal: 0, isDot: 0, dotDurationMs: 8000, dotTickMs: 0, dotDamagePerTick: 0,
    ccType: 7, ccDurationMs: 8000, auraType: 0, classId: 3,
  },
  {
    id: 18, name: "Ice Barrier", icon: "/icons/spell_icebarrier.png",
    castTimeMs: 0, cooldownMs: 30000, cost: 305, powerType: POWER_TYPE_MANA,
    rangeYards: 0, baseDamageMin: 0, baseDamageMax: 0, scaling: 0.1,
    isHeal: 1, isDot: 0, dotDurationMs: 60000, dotTickMs: 0, dotDamagePerTick: 0,
    ccType: 0, ccDurationMs: 0, auraType: 3, classId: 3, selfOnly: true, absorbBase: 818,
  },
  {
    id: 19, name: "Blink", icon: "/icons/spell_blink.png",
    castTimeMs: 0, cooldownMs: 15000, cost: 280, powerType: POWER_TYPE_MANA,
    rangeYards: 100, baseDamageMin: 0, baseDamageMax: 0, scaling: 0,
    isHeal: 0, isDot: 0, dotDurationMs: 0, dotTickMs: 0, dotDamagePerTick: 0,
    ccType: 0, ccDurationMs: 0, auraType: 0, classId: 3, blinkDistance: 20,
  },
  {
    id: 20, name: "Drain Life", icon: "/icons/spell_drainlife.png",
    castTimeMs: 0, cooldownMs: 0, cost: 300, powerType: POWER_TYPE_MANA,
    rangeYards: 30, baseDamageMin: 0, baseDamageMax: 0, scaling: 0.5,
    isHeal: 0, isDot: 1, dotDurationMs: 5000, dotTickMs: 1000, dotDamagePerTick: 71,
    ccType: 0, ccDurationMs: 0, auraType: 7, classId: 4, channelMs: 5000, selfHealRatio: 1,
  },
  {
    id: 21, classId: 1, name: "Charge", icon: "/icons/ability_warrior_charge.png",
    castTimeMs: 0, cooldownMs: 15000, cost: 0, powerType: POWER_TYPE_RAGE,
    rangeYards: 25, minRangeYards: 8, baseDamageMin: 0, baseDamageMax: 0, scaling: 0,
    isHeal: 0, isDot: 0, dotDurationMs: 0, dotTickMs: 0, dotDamagePerTick: 0,
    ccType: 1, ccDurationMs: 1000, auraType: 0,
    requiresOutOfCombat: true, powerGain: 15, dashSpeed: 42,
  },
  {
    id: 22, classId: 1, name: "Intercept", icon: "/icons/ability_rogue_sprint.png",
    castTimeMs: 0, cooldownMs: 30000, cost: 10, powerType: POWER_TYPE_RAGE,
    rangeYards: 25, minRangeYards: 8, baseDamageMin: 65, baseDamageMax: 65, scaling: 0,
    isHeal: 0, isDot: 0, dotDurationMs: 0, dotTickMs: 0, dotDamagePerTick: 0,
    ccType: 1, ccDurationMs: 3000, auraType: 0, dashSpeed: 42,
  }
];

// Ownership is catalog data shared by the GPU and presentation.
export const SPELL_CATALOG: SpellDef[] = spellDefinitions.map(spell => ({
  ...spell,
  classId: spell.classId ?? 0,
  selfOnly: spell.selfOnly ?? spell.id === 4,
  absorbBase: spell.absorbBase ?? (spell.auraType === 3 ? 500 : 0),
}));
export const SPELL_WORDS = 26;
