import { SIMULATION_WGSL } from './shaders/sim.wgsl';
import {
  MAX_ENTITIES,
  MAX_AURAS,
  MAX_PILLARS,
  ArenaPillar,
  DEFAULT_ARENA_PILLARS,
  HORIZON_LENGTH,
  POPULATION_SIZE,
  BENCHMARK_BATCH_SIZE,
  WORKGROUP_SIZE,
  SPELL_CATALOG,
  SPELL_WORDS,
  MAX_SPELLS,
  POWER_TYPE_RAGE,
  POWER_TYPE_MANA,
  ARENA_HEADER_WORDS,
  ENTITY_BASE_WORDS,
  AURA_SLOT_WORDS,
  ENTITY_WORDS,
  PILLAR_WORDS,
  ARENA_PILLARS_OFFSET_WORDS,
  ARENA_BYTES,
  SIM_QUEUE_WORDS,
  SIM_QUEUE_BYTES,
  COMBAT_EVENTS_WORDS,
  COMBAT_EVENTS_BYTES,
  BEST_PLAN_BYTES,
  ENTITY_FIELD_OFFSETS,
  CombatLogEntry
} from './constants';

export interface ActionGene {
  spellId: number;
  targetId: number;
  desiredRange: number; // 0: melee range (<=5y), 15: mid range, 30: max caster range
}

export interface LiveAura {
  spellId: number;
  auraType: number;
  expiresAt: number;
  tickIntervalMs: number;
  nextTickAt: number;
  value: number;
  sourceId: number;
  pad?: number;
}

export interface EntityModel {
  id: number;
  name: string;
  className: string;
  icon: string;
  team: number;
  alive: number;
  targetId: number;
  hp: number;
  maxHp: number;
  power: number;
  maxPower: number;
  powerType: number;
  gcdEnd: number;
  castEnd: number;
  castSpellId: number;
  castTargetId?: number;
  decisionCount?: number;
  swingTimer: number;
  swingSpeedMs: number;
  attackPower: number;
  spellPower: number;
  critChance: number;
  armor: number;
  posX: number;
  posY: number;
  speed: number;
  // Crowd Control & Diminishing Returns
  stunEnd: number;
  extraCooldowns?: number;
  extraCooldowns2?: number;
  extraCooldowns3?: number;
  polymorphDrCount?: number;
  polymorphDrResetAt?: number;
  horrorEnd?: number;
  incapacitateType?: number;
  nextFleeAt?: number;
  silenceEnd: number;
  drStunCount: number;
  drStunResetAt: number;
  // Gear / Build Tuning
  weaponSpeedSec: number;
  gearSummary: string;
  // Persistent 8-slot Aura storage
  auras: LiveAura[];
}

export class WebGPURHEASimulator {
  public device!: GPUDevice;
  public supportsSubgroups: boolean = false;
  private spellCatalogBuffer!: GPUBuffer;
  private liveStateBuffer!: GPUBuffer;
  private candidatePlansBuffer!: GPUBuffer;
  private candidateFitnessBuffer!: GPUBuffer;
  private bestPlanBuffer!: GPUBuffer;
  private simParamsBuffer!: GPUBuffer;
  private bestResultBuffer!: GPUBuffer;

  private liveQueueBuffer!: GPUBuffer;
  private liveParamsBuffer!: GPUBuffer;
  private combatEventsBuffer!: GPUBuffer;
  private searchStateBuffer!: GPUBuffer;
  private searchQueueBuffer!: GPUBuffer;
  private committedPlanBuffer!: GPUBuffer;
  private committedOriginBuffer!: GPUBuffer;
  private searchOriginBuffer!: GPUBuffer;
  private searchSliceBuffer!: GPUBuffer;
  public mageCandidateFitness: {frostbolt?: number; fireblast?: number; polymorph?: number} = {};

  private stagingBestResultBuffer!: GPUBuffer;
  private stagingBestPlanBuffer!: GPUBuffer;
  private stagingOriginBuffer!: GPUBuffer;
  private advanceLivePipeline!: GPUComputePipeline;
  private prepareSearchPipeline!: GPUComputePipeline;
  private stateEpoch = 0;
  private arenaInitialized = 0;
  public submittedTimeMs = 0;
  public planOriginMs = 0;
  public lastSearchMs = 0;
  public lastSearchSliceMs = 0;
  public searchCandidatesPerSlice = 2048;
  public searchThroughput = 0; // candidates per wall-clock ms (EMA)

  // Population size whose generation completes within targetMs of wall time, so live
  // plans stay fresh. Falls back to `max` until throughput has been measured.
  public adaptivePopulation(targetMs = 600, min = 1024, max = POPULATION_SIZE): number {
    if (this.searchThroughput <= 0) return min;
    const n = Math.floor((this.searchThroughput * targetMs) / 64) * 64;
    return Math.max(min, Math.min(max, n));
  }
  private search: {offset: number; population: number; epoch: number; started: number} | null = null;
  // Search batches allowed in flight at once. 1 = strict ping-pong (fixed round-trip
  // overhead per batch); 2-3 keeps the GPU fed while the CPU awaits completions.
  public maxSearchInFlight = 1;
  private searchInFlight = 0;
  private throughputWindowStart = 0;
  private throughputWindowCount = 0;
  private searchReading = false;
  private benchmarking = false;
  private pending = new Set<Promise<void>>();
  private readbackSequence = 0;
  private appliedSequence = 0;
  private lastEventSequence = 0;
  // Bounded telemetry from existing readbacks; no additional GPU dispatch or mapping.
  public planStability: {originMs: number; population: number; teams: {
    baselineKept: boolean; changed: number; compared: number;
  }[]}[] = [];

  public get planStabilityText(): string {
    if (!this.planStability.length) return 'Plan stability: waiting for search';
    const summaries = [0, 1].map(team => {
      let kept = 0, changed = 0, compared = 0;
      for (const sample of this.planStability) {
        const t = sample.teams[team];
        kept += Number(t.baselineKept); changed += t.changed; compared += t.compared;
      }
      const churn = compared ? `${Math.round(100 * changed / compared)}% plan changes` : 'no overlapping decisions';
      return `T${team}: ${churn}, ${Math.round(100 * kept / this.planStability.length)}% baseline kept`;
    });
    return `Plan stability (${this.planStability.length}/20 searches): ${summaries.join(' · ')}`;
  }

  private publishedPlan = new Uint32Array(48);
  private publishedOrigin = new Uint32Array(8);
  private snapshots: {state: GPUBuffer; events: GPUBuffer; busy: boolean}[] = [];

  // Configuration edits call this while playback is paused. Capture the latest
  // authoritative GPU state even if earlier render readbacks were skipped.
  public async whenIdle(): Promise<void> {
    await Promise.all([...this.pending]);
    await this.device.queue.onSubmittedWorkDone();
    await this.requestSnapshot();
  }

  public eliteActions: ActionGene[] = [
    { spellId: 0, targetId: 2, desiredRange: 0 },
    { spellId: 0, targetId: 0, desiredRange: 20 },
    { spellId: 0, targetId: 0, desiredRange: 30 },
    { spellId: 0, targetId: 0, desiredRange: 30 },
    { spellId: 0, targetId: 0, desiredRange: 0 },
    { spellId: 0, targetId: 0, desiredRange: 0 }
  ];
  public elitePlanHorizon: ActionGene[][] = [[], [], [], [], [], []];

  private mutatePipeline!: GPUComputePipeline;
  private simulatePipeline!: GPUComputePipeline;
  private extractElitePipeline!: GPUComputePipeline;
  private findBestPipeline!: GPUComputePipeline;
  private pipelineGroups = new Map<GPUComputePipeline, GPUBindGroup>();

  public entities: EntityModel[] = [];
  public pillars: ArenaPillar[] = DEFAULT_ARENA_PILLARS.map(p => ({ ...p }));
  public simTimeMs: number = 0;
  public totalSimulationsRun: number = 0;
  public lastFpsSimsPerSec: number = 0;
  public bestFitnessScore: number = 0;
  public bestFitnessScoreTeam0: number = 0;
  public bestFitnessScoreTeam1: number = 0;

  // Combat Log circular buffer (fixed max capacity, 0 GPU impact)
  public combatLog: CombatLogEntry[] = [];
  public gpuErrors: string[] = [];
  public combatFailed = false;
  public readonly maxLogEntries: number = 80;
  private logEntryId: number = 0;

  public addLogEntry(entry: Omit<CombatLogEntry, 'id'>) {
    this.combatLog.push({ ...entry, id: ++this.logEntryId });
    if (this.combatLog.length > this.maxLogEntries) {
      this.combatLog.shift();
    }
  }

  public diagnosticStage: (stage: string) => Promise<void> = async () => {};

  async init(): Promise<boolean> {
    if (!navigator.gpu) {
      console.error("WebGPU is not supported in this browser.");
      return false;
    }

    await this.diagnosticStage("requestAdapter");
    const preference = new URLSearchParams(location.search).get('gpuAdapter');
    const adapter = await navigator.gpu.requestAdapter(
      preference === 'default' ? {} : {
        powerPreference: preference === 'low-power' ? 'low-power' : 'high-performance',
      }
    );
    if (!adapter) {
      console.error("No suitable WebGPU adapter found.");
      return false;
    }

    const adapterInfo = adapter.info;
    await this.diagnosticStage(`adapter ${JSON.stringify({
      preference: preference ?? 'high-performance',
      vendor: adapterInfo.vendor, architecture: adapterInfo.architecture,
      device: adapterInfo.device, description: adapterInfo.description,
    })}`);
    await this.diagnosticStage("requestDevice");
    this.device = await adapter.requestDevice();

    this.device.addEventListener("uncapturederror", event => {
      this.combatFailed = true;
      this.gpuErrors.push(event.error.message);
      if (this.gpuErrors.length > 100) this.gpuErrors.shift();
    });
    this.device.lost.then(info => {
      this.combatFailed = true;
      this.gpuErrors.push(`GPU device lost: ${info.message}`);
    });

    this.initDefaultEntities();
    await this.diagnosticStage("createBuffers");
    this.createBuffers();
    try {
      await this.createPipelines();
    } catch (error) {
      this.gpuErrors.push(String(error));
      console.error(error);
      return false;
    }

    await this.diagnosticStage("initialization complete");
    return true;
  }

  private initDefaultEntities() {
    // Standard 2v2 setup:
    // Team 0: Warrior (0), Priest (1)
    // Team 1: Mage (2), Warlock (3)
    this.entities = [
      {
        id: 0,
        name: "Warrior",
        className: "Warrior",
        icon: "/icons/class_warrior.png",
        team: 0,
        alive: 1,
        targetId: 2, // attacks Mage
        hp: 3800,
        maxHp: 3800,
        power: 35, // starting rage to allow immediate Strike/Rend
        maxPower: 100,
        powerType: POWER_TYPE_RAGE,
        gcdEnd: 0,
        castEnd: 0,
        castSpellId: 0,
        swingTimer: 0,
        swingSpeedMs: 2600, // 2.6s two-hander
        attackPower: 650,
        spellPower: 0,
        critChance: 0.22,
        armor: 3400,
        posX: 18,
        posY: 22,
        speed: 7.0,
        stunEnd: 0,
        silenceEnd: 0,
        drStunCount: 0,
        drStunResetAt: 0,
        weaponSpeedSec: 2.6,
        gearSummary: "2H Sword, Plate Mail",
        auras: [],
      },
      {
        id: 1,
        name: "Priest",
        className: "Priest",
        icon: "/icons/class_priest.png",
        team: 0,
        alive: 1,
        targetId: 0, // heals Warrior or dots Mage
        hp: 3100,
        maxHp: 3100,
        power: 4200,
        maxPower: 4200,
        powerType: POWER_TYPE_MANA,
        gcdEnd: 0,
        castEnd: 0,
        castSpellId: 0,
        swingTimer: 0,
        swingSpeedMs: 2000,
        attackPower: 80,
        spellPower: 380,
        critChance: 0.10,
        armor: 950,
        posX: 14,
        posY: 16,
        speed: 7.0,
        stunEnd: 0,
        silenceEnd: 0,
        drStunCount: 0,
        drStunResetAt: 0,
        weaponSpeedSec: 2.0,
        gearSummary: "Staff of Discipline, Cloth",
        auras: [],
      },
      {
        id: 2,
        name: "Mage",
        className: "Mage",
        icon: "/icons/class_mage.png",
        team: 1,
        alive: 1,
        targetId: 0, // targets Warrior
        hp: 2900,
        maxHp: 2900,
        power: 4400,
        maxPower: 4400,
        powerType: POWER_TYPE_MANA,
        gcdEnd: 0,
        castEnd: 0,
        castSpellId: 0,
        swingTimer: 0,
        swingSpeedMs: 2000,
        attackPower: 60,
        spellPower: 420,
        critChance: 0.15,
        armor: 850,
        posX: 40,
        posY: 18,
        speed: 7.0,
        stunEnd: 0,
        silenceEnd: 0,
        drStunCount: 0,
        drStunResetAt: 0,
        weaponSpeedSec: 2.0,
        gearSummary: "Frost Wand, Robes",
        auras: [],
      },
      {
        id: 3,
        name: "Warlock",
        className: "Warlock",
        icon: "/icons/class_warlock.png",
        team: 1,
        alive: 1,
        targetId: 0, // targets Warrior
        hp: 3500,
        maxHp: 3500,
        power: 3900,
        maxPower: 3900,
        powerType: POWER_TYPE_MANA,
        gcdEnd: 0,
        castEnd: 0,
        castSpellId: 0,
        swingTimer: 0,
        swingSpeedMs: 2000,
        attackPower: 70,
        spellPower: 410,
        critChance: 0.12,
        armor: 1100,
        posX: 42,
        posY: 24,
        speed: 7.0,
        stunEnd: 0,
        silenceEnd: 0,
        drStunCount: 0,
        drStunResetAt: 0,
        weaponSpeedSec: 2.0,
        gearSummary: "Shadow Dagger, Felweave",
        auras: [],
      },
      {
        id: 4,
        name: "Empty 4",
        className: "None",
        icon: "",
        team: 0,
        alive: 0,
        targetId: 0,
        hp: 0,
        maxHp: 0,
        power: 0,
        maxPower: 0,
        powerType: 0,
        gcdEnd: 0,
        castEnd: 0,
        castSpellId: 0,
        swingTimer: 0,
        swingSpeedMs: 2000,
        attackPower: 0,
        spellPower: 0,
        critChance: 0,
        armor: 0,
        posX: 0,
        posY: 0,
        speed: 0,
        stunEnd: 0,
        silenceEnd: 0,
        drStunCount: 0,
        drStunResetAt: 0,
        weaponSpeedSec: 2.0,
        gearSummary: "None",
        auras: [],
      },
      {
        id: 5,
        name: "Empty 5",
        className: "None",
        icon: "",
        team: 1,
        alive: 0,
        targetId: 0,
        hp: 0,
        maxHp: 0,
        power: 0,
        maxPower: 0,
        powerType: 0,
        gcdEnd: 0,
        castEnd: 0,
        castSpellId: 0,
        swingTimer: 0,
        swingSpeedMs: 2000,
        attackPower: 0,
        spellPower: 0,
        critChance: 0,
        armor: 0,
        posX: 0,
        posY: 0,
        speed: 0,
        stunEnd: 0,
        silenceEnd: 0,
        drStunCount: 0,
        drStunResetAt: 0,
        weaponSpeedSec: 2.0,
        gearSummary: "None",
        auras: [],
      }
    ];
  }

  private createBuffers() {
    // Spell catalog layout matches WGSL SpellDef (SPELL_WORDS words).
    const spellData = new ArrayBuffer(MAX_SPELLS * SPELL_WORDS * 4);
    const spellU32 = new Uint32Array(spellData);
    const spellF32 = new Float32Array(spellData);

    for (let i = 0; i < SPELL_CATALOG.length; i++) {
      const s = SPELL_CATALOG[i];
      const o = i * SPELL_WORDS;
      spellU32[o + 0] = s.castTimeMs;
      spellU32[o + 1] = s.cooldownMs;
      spellF32[o + 2] = s.cost;
      spellU32[o + 3] = s.powerType;
      spellF32[o + 4] = s.rangeYards;
      spellF32[o + 5] = s.baseDamageMin;
      spellF32[o + 6] = s.baseDamageMax;
      spellF32[o + 7] = s.scaling;
      spellU32[o + 8] = s.isHeal;
      spellU32[o + 9] = s.isDot;
      spellU32[o + 10] = s.dotDurationMs;
      spellU32[o + 11] = s.dotTickMs;
      spellF32[o + 12] = s.dotDamagePerTick;
      spellU32[o + 13] = s.ccType;
      spellU32[o + 14] = s.ccDurationMs;
      spellU32[o + 15] = s.auraType;
      spellF32[o + 16] = s.selfHealRatio ?? 0;
      spellU32[o + 17] = s.classId ?? 0;
      spellU32[o + 18] = s.selfOnly ? 1 : 0;
      spellF32[o + 19] = s.blinkDistance ?? 0;
      spellU32[o + 20] = s.channelMs ?? 0;
      spellF32[o + 21] = s.absorbBase ?? 0;
    }

    this.spellCatalogBuffer = this.device.createBuffer({
      size: spellData.byteLength,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    });
    this.device.queue.writeBuffer(this.spellCatalogBuffer, 0, spellData);

    // 2. Live Arena State Buffer
    // ArenaState sizes and entity/aura strides are defined by shared layout constants.
    const arenaBytes = ARENA_BYTES;
    this.liveStateBuffer = this.device.createBuffer({
      size: arenaBytes,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST | GPUBufferUsage.COPY_SRC,
    });

    this.liveQueueBuffer = this.device.createBuffer({size: SIM_QUEUE_BYTES,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST | GPUBufferUsage.COPY_SRC});
    this.liveParamsBuffer = this.device.createBuffer({size: 16,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST});
    this.combatEventsBuffer = this.device.createBuffer({size: COMBAT_EVENTS_BYTES,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC | GPUBufferUsage.COPY_DST});
    this.searchStateBuffer = this.device.createBuffer({size: arenaBytes,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST});
    this.searchQueueBuffer = this.device.createBuffer({size: SIM_QUEUE_BYTES,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST});
    this.searchSliceBuffer = this.device.createBuffer({size: 16,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST});
    this.searchOriginBuffer = this.device.createBuffer({size: 32,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC});
    this.committedPlanBuffer = this.device.createBuffer({size: BEST_PLAN_BYTES,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST | GPUBufferUsage.COPY_SRC});
    this.committedOriginBuffer = this.device.createBuffer({size: 32,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST});
    this.stagingOriginBuffer = this.device.createBuffer({size: 32,
      usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST});
    this.snapshots = Array.from({length: 2}, () => ({busy: false,
      state: this.device.createBuffer({size: arenaBytes, usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST}),
      events: this.device.createBuffer({size: COMBAT_EVENTS_BYTES, usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST}),
    }));

    // 3. Candidate Plans Buffer: POPULATION * 6 * HORIZON * 4 bytes
    const candBytes = BENCHMARK_BATCH_SIZE * MAX_ENTITIES * HORIZON_LENGTH * 4;
    this.candidatePlansBuffer = this.device.createBuffer({
      size: candBytes,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    });

    // 4. Candidate Fitness Buffer: POPULATION * 4 bytes
    this.candidateFitnessBuffer = this.device.createBuffer({
      size: BENCHMARK_BATCH_SIZE * 4,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC,
    });

    // 5. Best Candidate Result Buffer: [best_idx, fixed_point_fitness, done, pad, mage_spells...]
    this.bestResultBuffer = this.device.createBuffer({
      size: 32,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC | GPUBufferUsage.COPY_DST,
    });
    this.stagingBestResultBuffer = this.device.createBuffer({
      size: 32,
      usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST,
    });

    // 6. Best Plan Buffer: 6 * HORIZON * 4 bytes
    const bestPlanBytes = MAX_ENTITIES * HORIZON_LENGTH * 4;
    this.bestPlanBuffer = this.device.createBuffer({
      size: bestPlanBytes,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC | GPUBufferUsage.COPY_DST,
    });
    this.stagingBestPlanBuffer = this.device.createBuffer({
      size: bestPlanBytes,
      usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST,
    });

    // Seed bestPlanBuffer with initial advance exploration genes
    this.seedInitialBestPlan();

    // 7. Sim Params Uniform Buffer: 4 * 4 bytes = 16 bytes
    this.simParamsBuffer = this.device.createBuffer({
      size: 16,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    this.writeLiveStateToGPU();
  }

  public writeLiveStateToGPU() {
    this.planStability = [];
    this.stateEpoch++;
    this.search = null;
    this.submittedTimeMs = this.simTimeMs;
    const buffer = new ArrayBuffer(ARENA_BYTES);
    const u32 = new Uint32Array(buffer);
    const f32 = new Float32Array(buffer);

    u32[0] = this.simTimeMs;
    // Count active entities (N up to MAX_ENTITIES)
    u32[1] = MAX_ENTITIES; // Keep entity IDs stable, including empty roster slots.
    u32[2] = this.arenaInitialized;

    for (let u = 0; u < MAX_ENTITIES; u++) {
      const e = this.entities[u];
      const base = ARENA_HEADER_WORDS + u * ENTITY_WORDS;

      for (const [key, offset] of Object.entries(ENTITY_FIELD_OFFSETS.uint)) {
        u32[base + offset] = (e[key as keyof typeof ENTITY_FIELD_OFFSETS.uint] as number) ?? 0;
      }
      for (const [key, offset] of Object.entries(ENTITY_FIELD_OFFSETS.float)) {
        f32[base + offset] = (e[key as keyof typeof ENTITY_FIELD_OFFSETS.float] as number) ?? 0;
      }
      u32[base + 25] = ({Warrior: 1, Priest: 2, Mage: 3, Warlock: 4} as Record<string, number>)[e.className] ?? 0; // class ID
      u32[base + 27] = this.simTimeMs; // pad2: last mana regen timestamp

      // Pack 8 aura slots: each slot is 8 words = 32 bytes
      for (let a = 0; a < MAX_AURAS; a++) {
        const auraBase = base + ENTITY_BASE_WORDS + a * AURA_SLOT_WORDS;
        const aura = e.auras && e.auras[a];
        if (aura && aura.expiresAt > this.simTimeMs) {
          u32[auraBase + 0] = aura.spellId;
          u32[auraBase + 1] = aura.auraType;
          u32[auraBase + 2] = aura.expiresAt;
          u32[auraBase + 3] = aura.tickIntervalMs;
          u32[auraBase + 4] = aura.nextTickAt;
          f32[auraBase + 5] = aura.value;
          u32[auraBase + 6] = aura.sourceId;
          u32[auraBase + 7] = aura.pad ?? 0; // packed spell cooldowns
        } else {
          u32[auraBase + 0] = 0;
          u32[auraBase + 1] = 0;
          u32[auraBase + 2] = 0;
          u32[auraBase + 3] = 0;
          u32[auraBase + 4] = 0;
          f32[auraBase + 5] = 0;
          u32[auraBase + 6] = 0;
          u32[auraBase + 7] = aura?.pad ?? 0;
        }
      }
    }

    // Pack data-driven 2D Arena Pillars (up to MAX_PILLARS)
    for (let p = 0; p < MAX_PILLARS; p++) {
      const pBase = ARENA_PILLARS_OFFSET_WORDS + p * PILLAR_WORDS;
      const pillar = this.pillars[p];
      f32[pBase + 0] = pillar ? pillar.x : 0;
      f32[pBase + 1] = pillar ? pillar.y : 0;
      f32[pBase + 2] = pillar ? pillar.r : 0;
      f32[pBase + 3] = 0;
    }

    this.device.queue.writeBuffer(this.liveStateBuffer, 0, buffer);
  }

  private async createPipelines() {
    await this.diagnosticStage("createShaderModule");
    const shaderModule = this.device.createShaderModule({
      code: SIMULATION_WGSL,
    });

    const info = await shaderModule.getCompilationInfo();
    const errors = info.messages.filter(message => message.type === "error");
    if (errors.length > 0) {
      throw new Error(errors.map(message =>
        `WGSL ${message.lineNum}:${message.linePos}: ${message.message}`
      ).join("\n"));
    }

    const freshModules = new URLSearchParams(location.search).has('gpuFreshModules');
    const compile = async (name: string, entryPoint: string) => {
      await this.diagnosticStage(`compile ${name} modules=${freshModules ? 'fresh' : 'shared'}`);
      const module = freshModules
        ? this.device.createShaderModule({code: SIMULATION_WGSL, label: entryPoint})
        : shaderModule;
      const pipeline = await this.device.createComputePipelineAsync({
        label: entryPoint,
        layout: "auto",
        compute: {module, entryPoint},
      });
      await this.diagnosticStage(`compiled ${name}`);
      return pipeline;
    };
    this.mutatePipeline = await compile('mutate', 'mutate_population');
    this.simulatePipeline = await compile('simulate', 'simulate_candidate');
    this.findBestPipeline = await compile('findBest', 'find_best_candidate');
    this.extractElitePipeline = await compile('extractElite', 'extract_elite_plan');
    this.prepareSearchPipeline = await compile('prepareSearch', 'prepare_search');
    this.advanceLivePipeline = await compile('advanceLive', 'advance_live');

    await this.diagnosticStage("createBindGroups");
    const buffers = [this.spellCatalogBuffer, this.searchStateBuffer,
      this.candidatePlansBuffer, this.candidateFitnessBuffer, this.bestPlanBuffer,
      this.simParamsBuffer, this.bestResultBuffer, this.searchQueueBuffer,
      this.liveParamsBuffer, this.combatEventsBuffer, undefined, this.searchSliceBuffer,
      this.searchOriginBuffer, this.committedPlanBuffer, this.committedOriginBuffer];
    const layouts: [GPUComputePipeline, number[]][] = [
      [this.mutatePipeline, [0, 1, 2, 4, 5, 11]],
      [this.simulatePipeline, [0, 1, 2, 3, 4, 5, 6, 7, 9, 11]],
      [this.advanceLivePipeline, [0, 1, 4, 7, 8, 9, 12]],
      [this.findBestPipeline, [3, 5, 6]],
      [this.extractElitePipeline, [1, 2, 4, 5, 6]],
      [this.prepareSearchPipeline, [1, 4, 12, 13, 14]],
    ];
    for (const [pipeline, bindings] of layouts) {
      const live = pipeline === this.advanceLivePipeline;
      this.pipelineGroups.set(pipeline, this.device.createBindGroup({
        layout: pipeline.getBindGroupLayout(0),
        entries: bindings.map(binding => ({binding, resource: {buffer:
          live && binding === 1 ? this.liveStateBuffer :
          live && binding === 4 ? this.committedPlanBuffer :
          live && binding === 7 ? this.liveQueueBuffer :
          live && binding === 12 ? this.committedOriginBuffer : buffers[binding]!}})),
      }));
    }
  }

  public cancelPlanning(): void { this.search = null; }

  public get isPlanning(): boolean { return this.search !== null || this.searchInFlight > 0 || this.searchReading; }

  public get matchResult(): 'team0' | 'team1' | 'draw' | null {
    const active = this.entities.filter(entity => entity.className !== 'None' && entity.maxHp > 0);
    if (!active.some(entity => entity.team === 0) || !active.some(entity => entity.team === 1)) return null;
    const team0Alive = active.some(entity => entity.team === 0 && entity.alive === 1 && entity.hp > 0);
    const team1Alive = active.some(entity => entity.team === 1 && entity.alive === 1 && entity.hp > 0);
    if (team0Alive && team1Alive) return null;
    return team0Alive ? 'team0' : team1Alive ? 'team1' : 'draw';
  }

  private dispatch(encoder: GPUCommandEncoder, pipeline: GPUComputePipeline, groups = 1) {
    const pass = encoder.beginComputePass();
    pass.setPipeline(pipeline);
    pass.setBindGroup(0, this.pipelineGroups.get(pipeline)!);
    pass.dispatchWorkgroups(groups);
    pass.end();
  }

  private fail(error: unknown, epoch: number) {
    if (epoch !== this.stateEpoch) return;
    this.combatFailed = true;
    this.gpuErrors.push(String(error));
    console.error('GPU simulation failed:', error);
  }

  private track(promise: Promise<void>) {
    this.pending.add(promise);
    void promise.finally(() => this.pending.delete(promise));
    return promise;
  }

  // Live time does not wait for planning, mapping, or rendering. The GPU uses
  // the latest committed plan and revalidates each action in advance_combat.
  public advanceLiveAsync(deltaMs = 50): boolean {
    if (this.combatFailed || this.benchmarking || this.matchResult !== null) return false;
    this.submittedTimeMs += deltaMs;
    this.device.queue.writeBuffer(this.liveParamsBuffer, 0,
      new Uint32Array([this.submittedTimeMs, 0, 0, 0]));
    const encoder = this.device.createCommandEncoder();
    this.dispatch(encoder, this.advanceLivePipeline);
    this.device.queue.submit([encoder.finish()]);
    return true;
  }

  // A generation still evaluates the full population against a single immutable
  // snapshot. At most one short search batch is in flight, allowing live work
  // between batches instead of placing a full generation ahead of every tick.
  public stepRHEAAsync(population = POPULATION_SIZE): boolean {
    if (this.combatFailed || this.benchmarking || this.matchResult !== null || this.searchInFlight >= this.maxSearchInFlight || this.searchReading) return false;
    const encoder = this.device.createCommandEncoder();
    if (!this.search) {
      if (population < 64 || population > BENCHMARK_BATCH_SIZE || population % 64 !== 0) {
        throw new Error('Search population must be a multiple of 64 between 64 and the allocated capacity.');
      }
      this.search = {offset: 0, population, epoch: this.stateEpoch, started: performance.now()};
      encoder.copyBufferToBuffer(this.liveStateBuffer, 0, this.searchStateBuffer, 0, ARENA_BYTES);
      encoder.copyBufferToBuffer(this.liveQueueBuffer, 0, this.searchQueueBuffer, 0, SIM_QUEUE_BYTES);
      this.device.queue.writeBuffer(this.simParamsBuffer, 0, new Uint32Array([
        Math.floor(Math.random() * 0xffffffff), population, HORIZON_LENGTH, 10000,
      ]));
      this.device.queue.writeBuffer(this.bestResultBuffer, 0, new Uint32Array(8));
      this.dispatch(encoder, this.prepareSearchPipeline);
    }
    const generation = this.search;
    const count = Math.min(this.searchCandidatesPerSlice, generation.population - generation.offset);
    this.device.queue.writeBuffer(this.searchSliceBuffer, 0, new Uint32Array([generation.offset, count, 0, 0]));
    const groups = Math.ceil(count / WORKGROUP_SIZE);
    this.dispatch(encoder, this.mutatePipeline, groups);
    this.dispatch(encoder, this.simulatePipeline, groups);
    generation.offset += count;
    const complete = generation.offset === generation.population;
    if (complete) {
      this.dispatch(encoder, this.findBestPipeline, Math.ceil(generation.population / WORKGROUP_SIZE));
      this.dispatch(encoder, this.extractElitePipeline);
      // Publication stays on the GPU; telemetry readback cannot delay it.
      encoder.copyBufferToBuffer(this.bestPlanBuffer, 0, this.committedPlanBuffer, 0, BEST_PLAN_BYTES);
      encoder.copyBufferToBuffer(this.searchOriginBuffer, 0, this.committedOriginBuffer, 0, 32);
      encoder.copyBufferToBuffer(this.bestResultBuffer, 0, this.stagingBestResultBuffer, 0, 32);
      encoder.copyBufferToBuffer(this.bestPlanBuffer, 0, this.stagingBestPlanBuffer, 0, BEST_PLAN_BYTES);
      encoder.copyBufferToBuffer(this.searchOriginBuffer, 0, this.stagingOriginBuffer, 0, 32);
    }
    this.device.queue.submit([encoder.finish()]);
    this.searchInFlight++;
    const started = performance.now();
    this.track(this.device.queue.onSubmittedWorkDone().then(() => {
      if (generation.epoch !== this.stateEpoch) return;
      // With batches pipelined, per-batch latency includes queue wait, so measure
      // throughput as completed candidates over wall time across a ~250 ms window.
      const now = performance.now();
      if (this.throughputWindowStart === 0) this.throughputWindowStart = now - Math.max(1, this.lastSearchSliceMs);
      this.throughputWindowCount += count;
      const windowMs = now - this.throughputWindowStart;
      if (windowMs >= 250) {
        const rate = this.throughputWindowCount / windowMs;
        this.searchThroughput = this.searchThroughput > 0 ? this.searchThroughput * 0.7 + rate * 0.3 : rate;
        this.throughputWindowStart = now;
        this.throughputWindowCount = 0;
      }
      this.lastSearchSliceMs = now - started;
      // Size batches so each holds ~4 ms of GPU work at measured throughput. Never
      // shrink on latency alone: latency is dominated by fixed round-trip overhead.
      if (this.searchThroughput > 0) {
        this.searchCandidatesPerSlice = Math.max(1024, Math.min(8192,
          Math.round(this.searchThroughput * 4 / 32) * 32));
      }
    }).catch(error => this.fail(error, generation.epoch)).finally(() => {
      this.searchInFlight = Math.max(0, this.searchInFlight - 1);
      // Idle gap (nothing queued): restart the window so it doesn't count idle time.
      if (this.searchInFlight === 0) { this.throughputWindowStart = 0; this.throughputWindowCount = 0; }
    }));
    if (complete) {
      this.search = null;
      this.searchReading = true;
      const staging = [this.stagingBestResultBuffer, this.stagingBestPlanBuffer, this.stagingOriginBuffer];
      this.track(this.mapSnapshots(staging, generation.epoch, snapshots => {
        const res = new Uint32Array(snapshots[0]);
        if (res[1] === 0 || res[3] === 0) throw new Error('Search returned no valid fitness for one or both teams.');
        this.bestFitnessScoreTeam0 = res[1] / 10 - 100000;
        this.bestFitnessScoreTeam1 = res[3] / 10 - 100000;
        this.bestFitnessScore = this.bestFitnessScoreTeam0;
        const unpackSpellFit = (packed: number) => {
          if (!packed) return undefined;
          const quant = packed >>> 16;
          return quant * 4 - 100000;
        };
        this.mageCandidateFitness = {
          frostbolt: unpackSpellFit(res[4]),
          fireblast: unpackSpellFit(res[5]),
          polymorph: unpackSpellFit(res[6]),
        };
        this.lastSearchMs = performance.now() - generation.started;
        const origin = new Uint32Array(snapshots[2]);
        const plan = new Uint32Array(snapshots[1]);
        const teams = [0, 1].map(team => ({baselineKept: res[team * 2] === team * generation.population / 2,
          changed: 0, compared: 0}));
        for (let u = 0; u < MAX_ENTITIES; u++) {
          if (!this.entities[u].alive) continue;
          const shift = origin[u + 1] - this.publishedOrigin[u + 1];
          if (shift < 0 || shift >= HORIZON_LENGTH) continue;
          const team = teams[this.entities[u].team];
          // Compare the same decision indices; omit the newly appended horizon tail.
          for (let h = 0; h < HORIZON_LENGTH - shift; h++) {
            team.compared++;
            team.changed += Number(plan[u * HORIZON_LENGTH + h] !== this.publishedPlan[u * HORIZON_LENGTH + h + shift]);
          }
        }
        this.planStability.push({originMs: origin[0], population: generation.population, teams});
        if (this.planStability.length > 20) this.planStability.shift();
        this.publishedOrigin = origin;
        this.publishedPlan = plan;
        this.planOriginMs = this.publishedOrigin[0];
        this.refreshPlanPreview();
      }).finally(() => { this.searchReading = false; }));
    }
    this.totalSimulationsRun += count;
    return true;
  }

  private async mapSnapshots(staging: GPUBuffer[], epoch: number, consume: (snapshots: ArrayBuffer[]) => void) {
    try {
      const results = await Promise.allSettled(staging.map(buffer => buffer.mapAsync(GPUMapMode.READ)));
      const failure = results.find(result => result.status === 'rejected');
      if (failure?.status === 'rejected') throw failure.reason;
      if (epoch === this.stateEpoch) consume(staging.map(buffer => buffer.getMappedRange().slice(0)));
    } catch (error) { this.fail(error, epoch); }
    finally { for (const buffer of staging) if (buffer.mapState === 'mapped') buffer.unmap(); }
  }

  // Render readbacks use two slots and may be skipped without skipping combat.
  public requestSnapshot(): Promise<void> {
    const slot = this.snapshots.find(snapshot => !snapshot.busy);
    if (!slot) return Promise.resolve();
    slot.busy = true;
    const sequence = ++this.readbackSequence;
    const epoch = this.stateEpoch;
    const encoder = this.device.createCommandEncoder();
    encoder.copyBufferToBuffer(this.liveStateBuffer, 0, slot.state, 0, ARENA_BYTES);
    encoder.copyBufferToBuffer(this.combatEventsBuffer, 0, slot.events, 0, COMBAT_EVENTS_BYTES);
    this.device.queue.submit([encoder.finish()]);
    return this.track(this.mapSnapshots([slot.state, slot.events], epoch, snapshots => {
      if (sequence <= this.appliedSequence) return;
      this.appliedSequence = sequence;
      this.readGPUState(snapshots[0]);
      this.readGPUEvents(snapshots[1]);
    }).finally(() => { slot.busy = false; }));
  }

  private refreshPlanPreview() {
    for (let u = 0; u < MAX_ENTITIES; u++) {
      const consumed = Math.max(0, (this.entities[u].decisionCount ?? 0) - this.publishedOrigin[u + 1]);
      this.elitePlanHorizon[u] = Array.from({length: HORIZON_LENGTH}, (_, h) => {
        const gene = this.publishedPlan[u * HORIZON_LENGTH + Math.min(consumed + h, HORIZON_LENGTH - 1)];
        return {spellId: gene & 255, desiredRange: (gene >>> 8) & 255, targetId: gene >>> 16};
      });
      this.eliteActions[u] = this.elitePlanHorizon[u][0];
    }
  }

  // Decode presentation snapshots. All combat state changes originate in WGSL.
  private readGPUState(buffer: ArrayBuffer) {
    const u32 = new Uint32Array(buffer), f32 = new Float32Array(buffer);
    this.simTimeMs = u32[0];
    this.arenaInitialized = u32[2];
    if (u32[3]) throw new Error('GPU combat queue capacity or iteration limit exceeded.');
    for (let u = 0; u < MAX_ENTITIES; u++) {
      const entity = this.entities[u], base = ARENA_HEADER_WORDS + u * ENTITY_WORDS;
      for (const [key, offset] of Object.entries(ENTITY_FIELD_OFFSETS.uint)) entity[key as keyof typeof ENTITY_FIELD_OFFSETS.uint] = u32[base + offset];
      for (const [key, offset] of Object.entries(ENTITY_FIELD_OFFSETS.float)) entity[key as keyof typeof ENTITY_FIELD_OFFSETS.float] = f32[base + offset];
      entity.auras = Array.from({length: MAX_AURAS}, (_, a) => {
        const o = base + ENTITY_BASE_WORDS + a * AURA_SLOT_WORDS;
        return {spellId: u32[o], auraType: u32[o + 1] & 0xFF, expiresAt: u32[o + 2],
          tickIntervalMs: u32[o + 3], nextTickAt: u32[o + 4], value: f32[o + 5], sourceId: u32[o + 6], pad: u32[o + 7]};
      });
    }
    this.pillars = Array.from({length: MAX_PILLARS}, (_, p) => {
      const o = ARENA_PILLARS_OFFSET_WORDS + p * PILLAR_WORDS;
      return {x: f32[o], y: f32[o + 1], r: f32[o + 2]};
    }).filter(p => p.r > 0);
    this.refreshPlanPreview();
  }

  private readGPUEvents(buffer: ArrayBuffer) {
    const u32 = new Uint32Array(buffer), f32 = new Float32Array(buffer);
    const end = u32[0];
    for (let i = Math.max(this.lastEventSequence, end - 80); i < end; i++) {
      const o = 1 + (i % 80) * 6;
      const source = this.entities[u32[o + 1]], target = this.entities[u32[o + 2]];
      const spellName = SPELL_CATALOG[u32[o + 3]]?.name;
      const type = ({1: 'damage', 2: 'heal', 3: 'cast_start', 4: 'cc', 5: 'death', 6: 'move'} as const)[u32[o + 4] as 1 | 2 | 3 | 4 | 5 | 6];
      if (!source || !target || !type) continue;
      this.addLogEntry({timeMs: u32[o], sourceId: source.id, sourceName: source.name,
        sourceTeam: source.team, targetId: target.id, targetName: target.name, targetTeam: target.team,
        type, spellName, value: f32[o + 5], text: `${source.name}: ${spellName ?? 'Attack'} → ${target.name}`});
    }
    this.lastEventSequence = end;
  }

  // High-throughput raw benchmark without UI stalls
  public async runBatchBenchmark(totalFights: number = 200000, batchSize: number = BENCHMARK_BATCH_SIZE): Promise<{ elapsedMs: number; fightsPerSec: number }> {
    await this.whenIdle();
    this.search = null;
    this.benchmarking = true;
    const snapshot = this.device.createCommandEncoder();
    snapshot.copyBufferToBuffer(this.liveStateBuffer, 0, this.searchStateBuffer, 0, ARENA_BYTES);
    snapshot.copyBufferToBuffer(this.liveQueueBuffer, 0, this.searchQueueBuffer, 0, SIM_QUEUE_BYTES);
    this.device.queue.submit([snapshot.finish()]);
    this.device.queue.writeBuffer(this.searchSliceBuffer, 0, new Uint32Array([0, batchSize, 0, 0]));
    const batches = Math.ceil(totalFights / batchSize);
    try {
      const start = performance.now();

      for (let b = 0; b < batches; b++) {
        const seed = (b + 1) * 7919;
        const params = new Uint32Array([
          seed,
          batchSize,
          HORIZON_LENGTH,
          10000,
        ]);
        this.device.queue.writeBuffer(this.simParamsBuffer, 0, params);

        const commandEncoder = this.device.createCommandEncoder();

        const simPass = commandEncoder.beginComputePass();
        simPass.setPipeline(this.simulatePipeline);
        simPass.setBindGroup(0, this.pipelineGroups.get(this.simulatePipeline)!);
        simPass.dispatchWorkgroups(Math.ceil(batchSize / WORKGROUP_SIZE));
        simPass.end();

        this.device.queue.submit([commandEncoder.finish()]);
      }

      // Wait for GPU to finish all submitted command buffers
      await this.device.queue.onSubmittedWorkDone();

      const elapsedMs = performance.now() - start;
      const fightsPerSec = Math.round((batches * batchSize) / (elapsedMs / 1000));
      this.totalSimulationsRun += batches * batchSize;

      return { elapsedMs, fightsPerSec };
    } finally { this.benchmarking = false; }
  }

  public seedInitialBestPlan() {
    if (!this.bestPlanBuffer) return;
    const plan = new Uint32Array(MAX_ENTITIES * HORIZON_LENGTH);
    for (let u = 0; u < MAX_ENTITIES; u++) {
      const e = this.entities[u];
      const tgt = e ? e.targetId : 0;
      // Melee desires 0y engagement; Casters desire 30y; Healer desires 20y
      const desiredRange = (e && e.powerType === POWER_TYPE_RAGE) ? 0 : (e && e.className === "Priest" ? 20 : 30);
      
      // Seed initial valid signature spell for each unit class
      let initialSpell = 0;
      if (e) {
        if (e.className === "Warrior") initialSpell = 1; // Mortal Strike
        else if (e.className === "Priest") initialSpell = 5; // Flash Heal
        else if (e.className === "Mage") initialSpell = 10; // Frostbolt
        else if (e.className === "Warlock") initialSpell = 13; // Corruption
      }

      this.eliteActions[u] = { spellId: initialSpell, targetId: tgt, desiredRange };

      for (let h = 0; h < HORIZON_LENGTH; h++) {
        // Gene format: bits 0..7: spell_id, bits 8..15: desired_range, bits 16..31: target_id
        const spellId = h === 0 ? initialSpell : 0;
        plan[u * HORIZON_LENGTH + h] = (spellId & 0xff) | ((desiredRange & 0xff) << 8) | ((tgt & 0xffff) << 16);
      }
    }
    this.device.queue.writeBuffer(this.bestPlanBuffer, 0, plan);
    this.device.queue.writeBuffer(this.committedPlanBuffer, 0, plan);
    this.publishedPlan = plan;
    this.publishedOrigin = new Uint32Array([
      this.simTimeMs, ...this.entities.map(entity => entity.decisionCount ?? 0), 0,
    ]);
    this.device.queue.writeBuffer(this.committedOriginBuffer, 0, this.publishedOrigin);
    this.planOriginMs = this.simTimeMs;
    this.refreshPlanPreview();
  }

  public resetMatch() {
    this.simTimeMs = 0;
    this.combatFailed = false;
    this.arenaInitialized = 0;
    this.device.queue.writeBuffer(this.liveQueueBuffer, 0, new Uint32Array(SIM_QUEUE_WORDS));
    this.totalSimulationsRun = 0;
    this.lastEventSequence = 0;
    this.device.queue.writeBuffer(this.combatEventsBuffer, 0, new Uint32Array(COMBAT_EVENTS_WORDS));
    this.combatLog = [];
    this.initDefaultEntities();
    this.seedInitialBestPlan();
    this.writeLiveStateToGPU();
  }
}
