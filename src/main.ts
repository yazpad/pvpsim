import { SpellProjectiles, DrainLifeBeams } from './projectiles';
import { unitCooldowns } from './cooldowns';
import { visibleEffects } from './effects';
import { WebGPURHEASimulator } from './simulator';
import { SPELL_CATALOG, BENCHMARK_BATCH_SIZE, UNIT_RADIUS_YARDS } from './constants';

const canvas = document.getElementById('arenaCanvas') as HTMLCanvasElement;
const ctx = canvas.getContext('2d')!;
const showPlanToggle = document.getElementById('showPlan') as HTMLInputElement;

// Visual-only smoothing of unit positions. The sim moves units in discrete ~0.5s steps;
// the renderer glides a display position toward the authoritative one each frame.
const spellProjectiles = new SpellProjectiles();
const drainLifeBeams = new DrainLifeBeams();
const displayPos = new Map<number, { x: number; y: number }>();
let lastRenderMs = performance.now();

const searchActBtn = document.getElementById('searchActBtn') as HTMLButtonElement;
const benchBtn = document.getElementById('benchBtn') as HTMLButtonElement;
const stepBtn = document.getElementById('stepBtn') as HTMLButtonElement;
const resetBtn = document.getElementById('resetBtn') as HTMLButtonElement;
const statusLabel = document.getElementById('statusLabel') as HTMLSpanElement;
const throughputLabel = document.getElementById('throughputLabel') as HTMLSpanElement;
const fitnessLabel = document.getElementById('fitnessLabel') as HTMLSpanElement;
const stabilityLabel = document.getElementById('stabilityLabel') as HTMLSpanElement;
const matchTimeLabel = document.getElementById('matchTimeLabel') as HTMLSpanElement;
const unitFramesContainer = document.getElementById('unitFramesContainer') as HTMLDivElement;
const combatLogList = document.getElementById('combatLogList') as HTMLDivElement;
const logCountBadge = document.getElementById('logCountBadge') as HTMLSpanElement;
const toggleLogBtn = document.getElementById('toggleLogBtn') as HTMLButtonElement;
const clearLogBtn = document.getElementById('clearLogBtn') as HTMLButtonElement;

// Keep the tooltip outside unit cards: card contents are refreshed each frame.
const spellTooltip = document.createElement('div');
spellTooltip.className = 'spell-tooltip';
spellTooltip.id = 'spellTooltip';
spellTooltip.role = 'tooltip';
spellTooltip.hidden = true;
document.body.appendChild(spellTooltip);
let hoveredSpell: {spellId: number; unitId: number; x: number; y: number; aura: boolean} | null = null;
function hideSpellTooltip() {
  hoveredSpell = null;
  spellTooltip.hidden = true;
}
document.addEventListener('pointermove', event => {
  const icon = (event.target as Element).closest<HTMLElement>('[data-spell-id]');
  if (!icon) { hideSpellTooltip(); return; }
  hoveredSpell = {spellId: Number(icon.dataset.spellId), unitId: Number(icon.dataset.unitId),
    x: event.clientX, y: event.clientY, aura: icon.dataset.aura === 'true'};
  updateSpellTooltip();
});
window.addEventListener('blur', hideSpellTooltip);
document.addEventListener('scroll', hideSpellTooltip, true);
document.addEventListener('pointerleave', hideSpellTooltip);
document.addEventListener('keydown', event => { if (event.key === 'Escape') hideSpellTooltip(); });

function updateSpellTooltip() {
  if (!hoveredSpell) return;
  const {spellId, unitId, x, y, aura} = hoveredSpell;
  const spell = SPELL_CATALOG[spellId];
  const unit = sim.entities[unitId];
  if (!spell || !unit) { hideSpellTooltip(); return; }
  const cooldown = unitCooldowns(unit, sim.simTimeMs).find(cd => cd.id === spellId);
  const activeAura = unit.auras.find(a => a.spellId === spellId && a.expiresAt > sim.simTimeMs);
  const status = aura ? (activeAura ? `${((activeAura.expiresAt - sim.simTimeMs) / 1000).toFixed(1)}s remaining` : 'Effect expired')
    : cooldown && cooldown.remainingMs > 0 ? `Cooldown: ${(cooldown.remainingMs / 1000).toFixed(1)}s remaining` : 'Individual cooldown ready';
  const effect = ({1: 'Healing received reduced', 2: 'Damage taken reduced', 3: 'Absorbs damage',
    4: 'Healing over time', 5: 'Movement slowed 50%', 6: 'Root: unable to move', 7: 'Damage over time', 8: 'Polymorph: damage breaks effect'} as Record<number, string>)[spell.auraType];
  const cc = ({1: 'Stun', 2: 'Silence', 3: 'Interrupt', 4: 'Fear', 5: 'Root', 6: 'Horror'} as Record<number, string>)[spell.ccType];
  const details = [effect, spell.requiresOutOfCombat ? 'Requires out of combat' : '', spell.powerGain ? `Generates ${spell.powerGain} rage` : '', spell.selfHealRatio ? `Heals caster for ${spell.selfHealRatio * 100}% of damage dealt` : '', cc ? `${cc} · up to ${spell.ccDurationMs / 1000}s` : ''].filter(Boolean).join(' · ');
  spellTooltip.innerHTML = `<strong>${spell.name}</strong>
    <span class="spell-tooltip-status">${status}</span>
    <span>${spell.cost} ${({0: 'mana', 1: 'rage', 2: 'energy'} as Record<number, string>)[spell.powerType]} · ${spell.minRangeYards ? `${spell.minRangeYards}–` : ""}${spell.rangeYards} yd range</span>
    <span>${spell.channelMs ? `${spell.channelMs / 1000}s channel` : spell.castTimeMs ? `${spell.castTimeMs / 1000}s cast` : 'Instant'} · ${spell.cooldownMs ? `${spell.cooldownMs / 1000}s cooldown` : 'No individual cooldown'}</span>
    ${details ? `<span>${details}</span>` : ''}
    <small>${aura ? 'Active effect on this unit.' : 'Casting also requires resources, global cooldown, range and line of sight.'}</small>`;
  spellTooltip.hidden = false;
  const rect = spellTooltip.getBoundingClientRect();
  spellTooltip.style.left = `${Math.max(8, Math.min(x + 14, window.innerWidth - rect.width - 8))}px`;
  spellTooltip.style.top = `${Math.max(8, y + rect.height + 20 > window.innerHeight ? y - rect.height - 12 : y + 18)}px`;
}

// Modal elements
const editorOverlay = document.getElementById('editorOverlay') as HTMLDivElement;
const editorTitle = document.getElementById('editorTitle') as HTMLHeadingElement;
const closeEditorBtn = document.getElementById('closeEditorBtn') as HTMLButtonElement;
const saveEditorBtn = document.getElementById('saveEditorBtn') as HTMLButtonElement;
const editHp = document.getElementById('editHp') as HTMLInputElement;
const editAp = document.getElementById('editAp') as HTMLInputElement;
const editSp = document.getElementById('editSp') as HTMLInputElement;
const editArmor = document.getElementById('editArmor') as HTMLInputElement;
const editSpeed = document.getElementById('editSpeed') as HTMLInputElement;
const editGear = document.getElementById('editGear') as HTMLInputElement;

let selectedEntityId: number | null = null;
const sim = new WebGPURHEASimulator();
sim.maxSearchInFlight = 3;
// Plans older than this (sim-time) mean the planner isn't keeping up.
const STALE_PLAN_MS = 2000;
if (new URLSearchParams(location.search).has('gpuDebug')) {
  const runId = crypto.randomUUID();
  sim.diagnosticStage = async stage => {
    statusLabel.textContent = `GPU diagnostic: ${stage}`;
    const response = await fetch('/__gpu_diagnostic', {
      method: 'POST', headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({runId, mode: 'app-init', stage, userAgent: navigator.userAgent}),
    });
    if (!response.ok) throw Error('Diagnostic logging unavailable; restart npm run dev.');
  };
}

// Include planner intent and live state alongside combat events for diagnosis.
const battleSnapshots: object[] = [];
const battleErrors: string[] = [];
let lastSnapshotMs = -1000;
window.addEventListener('error', event => battleErrors.push(event.message));
window.addEventListener('unhandledrejection', event => battleErrors.push(String(event.reason)));
document.getElementById('exportLogBtn')!.addEventListener('click', () => {
  const report = {
    exportedAt: new Date().toISOString(),
    simTimeMs: sim.simTimeMs,
    combatLog: sim.combatLog,
    entities: sim.entities,
    actions: sim.eliteActions,
    snapshots: battleSnapshots,
    errors: battleErrors,
    scheduling: {submittedTimeMs: sim.submittedTimeMs, planOriginMs: sim.planOriginMs,
      lastSearchMs: sim.lastSearchMs, lastSearchSliceMs: sim.lastSearchSliceMs,
      candidatesPerSlice: sim.searchCandidatesPerSlice,
      searchThroughputPerMs: sim.searchThroughput, livePopulation: sim.adaptivePopulation(),
      planAgeMs: sim.submittedTimeMs - sim.planOriginMs},
    planStability: sim.planStability,
    mageCandidateFitness: sim.mageCandidateFitness,
    gpuErrors: sim.gpuErrors,
  };
  const url = URL.createObjectURL(new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = 'battle-log.json';
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
});

const playbackSpeed = document.getElementById('playbackSpeed') as HTMLSelectElement;
let previousFrameMs = performance.now();
let playbackAccumulatorMs = 0;
function resetPlaybackClock() {
  previousFrameMs = performance.now();
  playbackAccumulatorMs = 0;
}
playbackSpeed.addEventListener('change', resetPlaybackClock);
document.addEventListener('visibilitychange', resetPlaybackClock);
let isRunning = false;
let manualPlanning = false;
let lastThroughputCalc = performance.now();
let simsAccumulator = 0;

// Arena dimensions in yards
const ARENA_WIDTH_YARDS = 60.0;
const ARENA_HEIGHT_YARDS = 40.0;

// Image caching for icons
const iconImageCache = new Map<string, HTMLImageElement>();
function getIconImage(src: string): HTMLImageElement {
  let img = iconImageCache.get(src);
  if (!img) {
    img = new Image();
    img.src = src;
    iconImageCache.set(src, img);
  }
  return img;
}

async function bootstrap() {
  statusLabel.textContent = "Initializing WebGPU...";
  const success = await sim.init();
  if (!success) {
    statusLabel.innerHTML = `<span style="color:#ff6b6b">WebGPU not supported or device init failed. Run on Chrome/Edge/Firefox with WebGPU enabled.</span>`;
    if (sim.gpuErrors.length) statusLabel.textContent = `GPU initialization failed: ${sim.gpuErrors.join("; ")}`;
    searchActBtn.disabled = true;
    stepBtn.disabled = true;
    benchBtn.disabled = true;
    return;
  }

  statusLabel.innerHTML = `<span style="color:#51cf66">WebGPU Pipeline Ready (32,768 Candidates)</span>`;

  searchActBtn.addEventListener('click', () => {
    resetPlaybackClock();
    isRunning = !isRunning;
    if (isRunning) {
      searchActBtn.textContent = "Pause Search & Act";
      searchActBtn.classList.add("active");
    } else {
      searchActBtn.textContent = "Search & Act (RHEA)";
      searchActBtn.classList.remove("active");
    }
  });

  benchBtn.addEventListener('click', async () => {
    const wasRunning = isRunning;
    isRunning = false;
    manualPlanning = false;
    searchActBtn.textContent = "Search & Act (RHEA)";
    searchActBtn.classList.remove("active");

    statusLabel.innerHTML = `<span style="color:#f59e0b">Running 200k GPU Fights Benchmark (fastsim profile)...</span>`;
    benchBtn.disabled = true;

    // Small timeout to allow browser UI paint
    setTimeout(async () => {
      const result = await sim.runBatchBenchmark(200000, BENCHMARK_BATCH_SIZE);
      statusLabel.innerHTML = `<span style="color:#10b981">Benchmark: 200,000 fights in ${result.elapsedMs.toFixed(1)}ms (${result.fightsPerSec.toLocaleString()} fights/sec)</span>`;
      benchBtn.disabled = false;
      if (wasRunning) {
        resetPlaybackClock();
        isRunning = true;
        searchActBtn.textContent = "Pause Search & Act";
        searchActBtn.classList.add("active");
      }
    }, 50);
  });

  stepBtn.addEventListener('click', () => {
    performRHEAStep(100);
    advancePlanning();
    manualPlanning = sim.isPlanning;
    void sim.requestSnapshot();
  });

  resetBtn.addEventListener('click', () => {
    manualPlanning = false;
    sim.resetMatch();
    resetPlaybackClock();
    isRunning = false;
    displayPos.clear();
    spellProjectiles.reset();
    drainLifeBeams.reset();
    searchActBtn.disabled = false;
    stepBtn.disabled = false;
    searchActBtn.textContent = "Search & Act (RHEA)";
    searchActBtn.classList.remove('active');
    statusLabel.textContent = "Ready for a new fight.";
    simsAccumulator = 0;
    render();
    renderCombatLog(true);
  });

  setupCombatLogUI();
  renderUnitFrames();
  updateSpellTooltip();
  setupEditorModal();

  requestAnimationFrame(loop);
}

function setupEditorModal() {
  closeEditorBtn.addEventListener('click', () => {
    editorOverlay.style.display = 'none';
  });

  saveEditorBtn.addEventListener('click', async () => {
    const resume = isRunning;
    isRunning = false;
    manualPlanning = false;
    await sim.whenIdle();
    if (selectedEntityId !== null) {
      const e = sim.entities[selectedEntityId];
      e.maxHp = parseFloat(editHp.value) || e.maxHp;
      e.hp = Math.min(e.hp, e.maxHp);
      e.attackPower = parseFloat(editAp.value) || e.attackPower;
      e.spellPower = parseFloat(editSp.value) || e.spellPower;
      e.armor = parseFloat(editArmor.value) || e.armor;
      e.weaponSpeedSec = parseFloat(editSpeed.value) || e.weaponSpeedSec;
      e.swingSpeedMs = Math.round(e.weaponSpeedSec * 1000);
      e.gearSummary = editGear.value || e.gearSummary;

      sim.writeLiveStateToGPU();
      renderUnitFrames();
  updateSpellTooltip();
    }
    editorOverlay.style.display = 'none';
    resetPlaybackClock();
    isRunning = resume;
  });
}

function openEditor(id: number) {
  selectedEntityId = id;
  const e = sim.entities[id];
  editorTitle.textContent = `Edit ${e.name} (${e.className})`;
  editHp.value = e.maxHp.toString();
  editAp.value = e.attackPower.toString();
  editSp.value = e.spellPower.toString();
  editArmor.value = e.armor.toString();
  editSpeed.value = e.weaponSpeedSec.toString();
  editGear.value = e.gearSummary;
  editorOverlay.style.display = 'flex';
}

let isLogCollapsed = false;
let lastRenderedLogCount = 0;
let lastRenderedLogId = 0;

function setupCombatLogUI() {
  toggleLogBtn.addEventListener('click', () => {
    isLogCollapsed = !isLogCollapsed;
    combatLogList.style.display = isLogCollapsed ? 'none' : 'flex';
    toggleLogBtn.textContent = isLogCollapsed ? 'Expand' : 'Collapse';
  });

  clearLogBtn.addEventListener('click', () => {
    sim.combatLog = [];
    renderCombatLog(true);
  });
}

function renderCombatLog(force: boolean = false) {
  if (isLogCollapsed && !force) return;

  const currentCount = sim.combatLog.length;
  const latestId = sim.combatLog.at(-1)?.id ?? 0;
  if (currentCount === lastRenderedLogCount && latestId === lastRenderedLogId && !force) return;
  lastRenderedLogCount = currentCount;
  lastRenderedLogId = latestId;

  logCountBadge.textContent = `(${currentCount} events)`;

  if (currentCount === 0) {
    combatLogList.innerHTML = `<div style="color: #64748b; font-style: italic;">Awaiting match action...</div>`;
    return;
  }

  // Render recent entries from ring buffer (up to 40 most recent)
  const recent = sim.combatLog.slice(-40);
  const frag = document.createDocumentFragment();

  for (let i = 0; i < recent.length; i++) {
    const entry = recent[i];
    const row = document.createElement('div');
    row.className = 'log-entry';

    const timeSec = (entry.timeMs / 1000).toFixed(2);
    
    // Colorize message
    let styledText = entry.text;
    if (entry.sourceName) {
      const cls = entry.sourceTeam === 0 ? 'team-0-name' : 'team-1-name';
      styledText = styledText.replace(entry.sourceName, `<span class="${cls}">${entry.sourceName}</span>`);
    }
    if (entry.targetName) {
      const cls = entry.targetTeam === 0 ? 'team-0-name' : 'team-1-name';
      styledText = styledText.replace(entry.targetName, `<span class="${cls}">${entry.targetName}</span>`);
    }

    if (entry.type === 'damage') {
      if (entry.value !== undefined && Number.isFinite(entry.value)) {
        styledText += ` · <span class="val-dmg">${Math.round(entry.value)} damage</span>`;
      }
    } else if (entry.type === 'heal') {
      if (entry.value !== undefined && Number.isFinite(entry.value)) {
        styledText += ` · <span class="val-heal">+${Math.round(entry.value)} HP</span>`;
      }
    } else if (entry.type === 'cc') {
      styledText = styledText.replace(/(stunned|silenced|interrupted)/, `<span class="val-cc">$1</span>`);
    } else if (entry.type === 'death') {
      styledText = `<span class="val-death">${styledText}</span>`;
    }

    row.innerHTML = `
      <span class="log-time">[${timeSec}s]</span>
      <span class="log-text">${styledText}</span>
    `;
    frag.appendChild(row);
  }

  combatLogList.replaceChildren(frag);
  combatLogList.scrollTop = combatLogList.scrollHeight;
}

function renderUnitFrames() {
  unitFramesContainer.innerHTML = '';
  const units = sim.entities.filter(e => e.className !== "None" && e.maxHp > 0);

  units.forEach((u) => {
    const card = document.createElement('div');
    card.className = `unit-frame-card team-${u.team}`;
    card.addEventListener('click', () => openEditor(u.id));

    const hpPercent = Math.max(0, Math.min(100, (u.hp / u.maxHp) * 100));
    const powerPercent = Math.max(0, Math.min(100, (u.power / u.maxPower) * 100));
    const powerClass = u.powerType === 1 ? 'power-rage' : '';

    const targetEntity = sim.entities[u.targetId];
    const targetDist = targetEntity ? Math.hypot(targetEntity.posX - u.posX, targetEntity.posY - u.posY).toFixed(1) : '0';
    const eliteAct = sim.eliteActions[u.id];
    const desiredRange = eliteAct ? eliteAct.desiredRange : (u.powerType === 1 ? 0 : 30);
    const rangeStr = desiredRange <= 5 ? '⚔ Melee (0y)' : `🏹 Range (${desiredRange}y)`;
    const spellName = eliteAct && eliteAct.spellId > 0 ? SPELL_CATALOG[eliteAct.spellId]?.name : 'Auto/Idle';

    // Render active auras
    let aurasHtml = '';
    if (u.auras && u.auras.length > 0) {
      const activeAuras = u.auras.filter(a => a.expiresAt > sim.simTimeMs);
      if (activeAuras.length > 0) {
        aurasHtml = `<div class="unit-auras-row" style="display: flex; gap: 4px; margin-top: 4px; flex-wrap: wrap;">`;
        for (const a of activeAuras) {
          const sp = SPELL_CATALOG[a.spellId];
          const icon = sp ? sp.icon : '/icons/ability_meleedamage.png';
          const remSec = ((a.expiresAt - sim.simTimeMs) / 1000).toFixed(0);
          aurasHtml += `
            <div style="position: relative; width: 18px; height: 18px; border: 1px solid #475569; border-radius: 2px; overflow: hidden;" data-spell-id="${a.spellId}" data-unit-id="${u.id}" data-aura="true" aria-describedby="spellTooltip">
              <img src="${icon}" style="width: 100%; height: 100%; object-fit: cover;" />
              <span style="position: absolute; bottom: 0; right: 1px; font-size: 8px; color: #fff; text-shadow: 1px 1px 1px #000; font-weight: bold;">${remSec}</span>
            </div>
          `;
        }
        aurasHtml += `</div>`;
      }
    }

    let candidateDebugHtml = '';
    if (u.className === 'Mage' && sim.mageCandidateFitness) {
      const fb = sim.mageCandidateFitness.frostbolt !== undefined ? sim.mageCandidateFitness.frostbolt.toFixed(0) : '—';
      const fblast = sim.mageCandidateFitness.fireblast !== undefined ? sim.mageCandidateFitness.fireblast.toFixed(0) : '—';
      const poly = sim.mageCandidateFitness.polymorph !== undefined ? sim.mageCandidateFitness.polymorph.toFixed(0) : '—';
      candidateDebugHtml = `<div class="unit-meta-stats" style="color: #cbd5e1; font-size: 10px; margin-top: 2px;">
        <span>Cands: FB: ${fb} | Blast: ${fblast} | Poly: ${poly}</span>
      </div>`;
    }

    card.innerHTML = `
      <div class="unit-frame-header">
        <img class="unit-icon" src="${u.icon}" alt="${u.name}" />
        <div class="unit-info-text">
          <span class="unit-name">${u.name} ${u.alive === 0 ? '(Dead)' : ''}</span>
          <span class="unit-class-sub">${u.gearSummary}</span>
        </div>
      </div>
      <div class="bar-container">
        <div class="hp-bar-fill" style="width: ${hpPercent}%"></div>
      </div>
      <div class="bar-container" style="height: 5px;">
        <div class="power-bar-fill ${powerClass}" style="width: ${powerPercent}%"></div>
      </div>
      <div class="unit-effects">${visibleEffects(u, sim.simTimeMs).map(effect => `
        <span class="effect-badge" style="--effect-color: ${effect.color}" title="${effect.detail}">
          ${effect.label} <b>${((effect.expiresAt - sim.simTimeMs) / 1000).toFixed(1)}s</b>
        </span>`).join('')}</div>
      <div class="unit-aura-slot">${aurasHtml}</div>
      <div class="unit-abilities" aria-label="Ability cooldowns">${unitCooldowns(u, sim.simTimeMs).map(({spell, remainingMs, fraction}) => {
        const cooling = remainingMs > 0;
        const label = cooling ? `${(remainingMs / 1000).toFixed(1)}s remaining` : 'Cooldown ready';
        return `<div class="ability-slot${cooling ? ' on-cooldown' : ''}${u.alive ? '' : ' inactive'}" tabindex="0"
          aria-label="${spell.name}: ${label}" data-spell-id="${spell.id}" data-unit-id="${u.id}" aria-describedby="spellTooltip">
          <img src="${spell.icon}" alt="${spell.name}" />
          ${cooling ? `<span class="cooldown-sweep" style="background: conic-gradient(rgba(8,12,24,.82) ${fraction * 360}deg, transparent 0deg)"></span>
          <span class="cooldown-time">${remainingMs >= 10000 ? Math.ceil(remainingMs / 1000) : (remainingMs / 1000).toFixed(1)}</span>` : ''}
        </div>`;
      }).join('')}</div>
      <div class="unit-meta-stats">
        <span>HP: ${Math.round(u.hp)} / ${u.maxHp}</span>
        <span>Pos: (${u.posX.toFixed(1)}, ${u.posY.toFixed(1)})</span>
      </div>
      <div class="unit-meta-stats" style="color: #a5b4fc; margin-top: 2px;">
        <span>Tgt: ${targetEntity ? targetEntity.name : 'None'} (${targetDist}y)</span>
        <span>${rangeStr} | ${spellName}</span>
      </div>
      ${candidateDebugHtml}
    `;

    unitFramesContainer.appendChild(card);
  });
}

function stopFinishedMatch(): boolean {
  const result = sim.matchResult;
  if (result === null) return false;
  isRunning = false;
  manualPlanning = false;
  sim.cancelPlanning();
  searchActBtn.classList.remove('active');
  searchActBtn.textContent = "Fight finished";
  searchActBtn.disabled = true;
  stepBtn.disabled = true;
  statusLabel.textContent = `${result === 'draw' ? 'Draw' : result === 'team0' ? 'Team 0 wins' : 'Team 1 wins'} at ${(sim.simTimeMs / 1000).toFixed(1)}s. Reset to fight again.`;
  return true;
}

function performRHEAStep(deltaMs: number): boolean {
  if (stopFinishedMatch()) return false;
  // Live combat consumes the latest GPU plan independently of the search schedule.
  if (!sim.advanceLiveAsync(deltaMs)) return false;
  stopFinishedMatch();
  if (sim.simTimeMs < lastSnapshotMs) {
    battleSnapshots.length = 0;
    lastSnapshotMs = -1000;
  }
  if (sim.simTimeMs - lastSnapshotMs >= 1000) {
    lastSnapshotMs = sim.simTimeMs;
    battleSnapshots.push(structuredClone({
      timeMs: sim.simTimeMs,
      entities: sim.entities,
      actions: sim.eliteActions,
      plan: sim.elitePlanHorizon,
    }));
    if (battleSnapshots.length > 300) battleSnapshots.shift();
  }


  return true;
}

function formatPlanStability(): string {
  const samples = sim.planStability;
  if (!samples.length) return 'Waiting for search\nT0  —\nT1  —';
  const rows = [0, 1].map(team => {
    let changed = 0, compared = 0, kept = 0;
    for (const sample of samples) {
      const t = sample.teams[team];
      changed += t.changed; compared += t.compared; kept += Number(t.baselineKept);
    }
    const churn = compared ? `${Math.round(100 * changed / compared)}% changed` : 'No overlap';
    return `T${team}  ${churn} · ${Math.round(100 * kept / samples.length)}% kept`;
  });
  return [`Last ${samples.length}/20 searches`, ...rows].join('\n');
}

function advancePlanning() {
  const before = sim.totalSimulationsRun;
  // Fill the search pipeline up to maxSearchInFlight batches so the GPU never idles
  // on a CPU round-trip between batches.
  for (let i = 0; i < sim.maxSearchInFlight; i++) {
    if (!sim.stepRHEAAsync(sim.adaptivePopulation())) break;
  }
  simsAccumulator += sim.totalSimulationsRun - before;
}

async function loop(timestamp: number) {
  // Calculate throughput rate
  if (timestamp - lastThroughputCalc >= 1000) {
    const elapsedSec = (timestamp - lastThroughputCalc) / 1000;
    const rate = Math.round(simsAccumulator / elapsedSec);
    const planAgeMs = sim.submittedTimeMs - sim.planOriginMs;
    const stale = isRunning && planAgeMs > STALE_PLAN_MS;
    throughputLabel.textContent = `${rate.toLocaleString()} rollouts/s\nPopulation ${sim.adaptivePopulation().toLocaleString()} · Total ${sim.totalSimulationsRun.toLocaleString()}\nPlan age ${(planAgeMs / 1000).toFixed(1)}s${stale ? ' · Falling behind' : ''}`;
    throughputLabel.style.color = stale ? '#f87171' : '';
    if (stale) console.warn(`Stale plan: ${planAgeMs}ms old (throughput ${sim.searchThroughput.toFixed(1)}/ms, pop ${sim.adaptivePopulation()})`);
    simsAccumulator = 0;
    lastThroughputCalc = timestamp;
  }

  // Fixed simulation ticks paced by wall time, independent of display refresh rate.
  // Discard long stalls and hidden-tab time instead of fast-forwarding on return.
  const elapsedMs = Math.max(0, Math.min(250, timestamp - previousFrameMs));
  previousFrameMs = timestamp;
  if (isRunning && !document.hidden) {
    playbackAccumulatorMs += elapsedMs * Number(playbackSpeed.value);
    // Submit due live ticks before optional search work. Readback never gates time.
    playbackAccumulatorMs = Math.min(playbackAccumulatorMs, 250);
    while (playbackAccumulatorMs >= 50 && performRHEAStep(50)) playbackAccumulatorMs -= 50;
  } else {
    playbackAccumulatorMs = 0;
  }

  if (isRunning && !document.hidden) advancePlanning();
  else if (manualPlanning && !document.hidden) {
    if (sim.isPlanning) advancePlanning();
    else manualPlanning = false;
  }
  if (!sim.combatFailed && !sim.matchResult && (isRunning || sim.isPlanning || sim.submittedTimeMs > sim.simTimeMs)) void sim.requestSnapshot();

  if (sim.combatFailed) {
    isRunning = false;
    manualPlanning = false;
    statusLabel.textContent = sim.gpuErrors.at(-1) ?? 'GPU combat failed.';
  }
  stopFinishedMatch();
  fitnessLabel.textContent = `T0  ${sim.bestFitnessScoreTeam0.toFixed(0)}\nT1  ${sim.bestFitnessScoreTeam1.toFixed(0)}`;
  stabilityLabel.textContent = formatPlanStability();
  matchTimeLabel.textContent = `${(sim.simTimeMs / 1000).toFixed(1)}s`;
  render();
  renderUnitFrames();
  updateSpellTooltip();
  renderCombatLog();

  requestAnimationFrame(loop);
}

function render() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Arena Bounds Margin
  const margin = 20;
  const arenaPixelWidth = canvas.width - margin * 2;
  const arenaPixelHeight = canvas.height - margin * 2;

  // Arena Background floor
  ctx.fillStyle = '#08090f';
  ctx.fillRect(margin, margin, arenaPixelWidth, arenaPixelHeight);

  // Arena Border Walls
  ctx.strokeStyle = '#4338ca';
  ctx.lineWidth = 3;
  ctx.strokeRect(margin, margin, arenaPixelWidth, arenaPixelHeight);

  // Subtle 2D grid
  ctx.strokeStyle = '#161928';
  ctx.lineWidth = 1;
  const stepX = arenaPixelWidth / 12;
  for (let x = margin + stepX; x < margin + arenaPixelWidth; x += stepX) {
    ctx.beginPath();
    ctx.moveTo(x, margin);
    ctx.lineTo(x, margin + arenaPixelHeight);
    ctx.stroke();
  }
  const stepY = arenaPixelHeight / 8;
  for (let y = margin + stepY; y < margin + arenaPixelHeight; y += stepY) {
    ctx.beginPath();
    ctx.moveTo(margin, y);
    ctx.lineTo(margin + arenaPixelWidth, y);
    ctx.stroke();
  }

  // Draw Arena Center Ring
  ctx.beginPath();
  ctx.arc(canvas.width / 2, canvas.height / 2, 50, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(99, 102, 241, 0.15)';
  ctx.lineWidth = 2;
  ctx.stroke();

  // Draw 2D Obstacles / Pillars from simulator's data-driven pillar state
  sim.pillars.forEach((p) => {
    const px = margin + (p.x / ARENA_WIDTH_YARDS) * arenaPixelWidth;
    const py = margin + (p.y / ARENA_HEIGHT_YARDS) * arenaPixelHeight;
    const pr = (p.r / ARENA_WIDTH_YARDS) * arenaPixelWidth;

    ctx.beginPath();
    ctx.arc(px, py, pr, 0, Math.PI * 2);
    ctx.fillStyle = '#1e1b4b';
    ctx.fill();
    ctx.strokeStyle = '#3730a3';
    ctx.lineWidth = 2;
    ctx.stroke();
  });

  // Render Units in 2D Space
  const units = sim.entities.filter(e => e.className !== "None" && e.maxHp > 0);

  // Advance visual-only smoothed positions using dead reckoning and directional extrapolation.
  // The discrete-event sim moves units in 500ms hops. Instead of an exponential chase (which surges
  // then stalls), we advance display tokens along their active velocity vector and reconcile smoothly.
  const nowMs = performance.now();
  const frameDt = Math.min(0.25, (nowMs - lastRenderMs) / 1000);
  lastRenderMs = nowMs;
  const speedFactor = Math.max(0.1, Number(playbackSpeed.value));

  const view = new Map<number, { x: number; y: number }>();
  units.forEach((u) => {
    let d = displayPos.get(u.id);
    const jump = d ? Math.hypot(u.posX - d.x, u.posY - d.y) : Infinity;

    if (!d || jump > 10 || !isRunning || (u.dashEnd ?? 0) > sim.simTimeMs ||
        ((u.dashEnd ?? 0) > 0 && sim.simTimeMs - u.dashEnd! < 100)) {
      // Transit/arrival must follow GPU positions, not the walking plan. Also snap on reset or pause.
      d = { x: u.posX, y: u.posY };
    } else {
      const isAlive = u.alive === 1;
      const isStunned = Math.max(u.stunEnd, u.horrorEnd ?? 0, u.controlledStunEnd ?? 0) > sim.simTimeMs || u.auras.some(a => a.auraType === 8 && a.expiresAt > sim.simTimeMs);
      const isCasting = u.castSpellId > 0 && u.castEnd > sim.simTimeMs;

      let speedMult = 1.0;
      if (u.auras) {
        for (const a of u.auras) {
          if (a.expiresAt > sim.simTimeMs) {
            if (a.auraType === 6) { speedMult = 0; break; } // Root
            if (a.auraType === 5) speedMult = Math.min(speedMult, 0.5); // Slow
          }
        }
      }

      // Match the WGSL reference target resolution
      let moveRefTgt = u.targetId;
      if (moveRefTgt >= sim.entities.length || sim.entities[moveRefTgt].alive === 0 || sim.entities[moveRefTgt].team === u.team) {
        for (const cand of sim.entities) {
          if (cand.alive === 1 && cand.team !== u.team && cand.className !== "None" && cand.maxHp > 0) {
            moveRefTgt = cand.id;
            break;
          }
        }
      }

      const targetEntity = sim.entities[moveRefTgt];
      let wantsToMove = false;
      let dirX = 0;
      let dirY = 0;

      if (isAlive && !isStunned && !isCasting && targetEntity && targetEntity.alive === 1 && speedMult > 0) {
        const dx = targetEntity.posX - d.x;
        const dy = targetEntity.posY - d.y;
        const dist = Math.hypot(dx, dy);
        if (dist > 0.1) {
          const eliteAct = sim.eliteActions[u.id];
          const desiredRange = eliteAct ? eliteAct.desiredRange : (u.powerType === 1 ? 0 : 30);
          let sign = 0;
          if (dist > desiredRange + 1.0) {
            sign = 1; // Advance
          } else if (dist < desiredRange - 1.0) {
            sign = -1; // Kite
          }

          if (sign !== 0) {
            wantsToMove = true;
            dirX = (dx / dist) * sign;
            dirY = (dy / dist) * sign;
          }
        }
      }

      const toAuthX = u.posX - d.x;
      const toAuthY = u.posY - d.y;
      const distToAuth = Math.hypot(toAuthX, toAuthY);
      const nominalSpeed = (u.speed || 7.0) * speedMult * speedFactor;
      const maxStep = nominalSpeed * frameDt;

      if (!isAlive) {
        d = { x: u.posX, y: u.posY };
      } else if (!wantsToMove) {
        // Holding ground, casting, or stunned: close remaining gap to destination cleanly.
        if (distToAuth > 0.001) {
          const step = Math.min(distToAuth, Math.max(nominalSpeed, 5.0) * frameDt);
          d = { x: d.x + (toAuthX / distToAuth) * step, y: d.y + (toAuthY / distToAuth) * step };
        } else {
          d = { x: u.posX, y: u.posY };
        }
      } else {
        // Actively moving: travel at uniform speed towards projected authoritative destination.
        if (distToAuth > maxStep) {
          // If lagging behind (e.g. frame drop), scale speed up gently to catch up without jarring.
          const catchupRate = nominalSpeed * Math.max(1.0, distToAuth / 3.5);
          const step = Math.min(distToAuth, catchupRate * frameDt);
          d = { x: d.x + (toAuthX / distToAuth) * step, y: d.y + (toAuthY / distToAuth) * step };
        } else {
          // Reached destination ahead of next 500ms sim packet; extrapolate along intended heading.
          const remainder = maxStep - distToAuth;
          d = { x: u.posX + dirX * remainder, y: u.posY + dirY * remainder };
        }
      }

      // Avoid clipping through pillars.
      for (const p of sim.pillars) {
        if (!p || p.r <= 0) continue;
        const minR = p.r + UNIT_RADIUS_YARDS;
        const dx: number = d.x - p.x, dy: number = d.y - p.y;
        const dist = Math.hypot(dx, dy);
        if (dist < minR) {
          const k = minR / Math.max(0.001, dist);
          d = { x: p.x + dx * k, y: p.y + dy * k };
        }
      }

      // Keep within arena bounds
      d.x = Math.max(UNIT_RADIUS_YARDS, Math.min(ARENA_WIDTH_YARDS - UNIT_RADIUS_YARDS, d.x));
      d.y = Math.max(UNIT_RADIUS_YARDS, Math.min(ARENA_HEIGHT_YARDS - UNIT_RADIUS_YARDS, d.y));
    }

    displayPos.set(u.id, d);
    view.set(u.id, {
      x: margin + (d.x / ARENA_WIDTH_YARDS) * arenaPixelWidth,
      y: margin + (d.y / ARENA_HEIGHT_YARDS) * arenaPixelHeight,
    });
  });
  const tokenR = (UNIT_RADIUS_YARDS / ARENA_WIDTH_YARDS) * arenaPixelWidth;

  // Draw Target Laser Lines First (behind units)
  units.forEach((u) => {
    if (u.alive === 1 && u.targetId < units.length && units[u.targetId].alive === 1) {
      const tgt = units[u.targetId];
      const { x: ux, y: uy } = view.get(u.id)!;
      const { x: tx, y: ty } = view.get(tgt.id)!;

      ctx.beginPath();
      ctx.moveTo(ux, uy);
      ctx.lineTo(tx, ty);
      ctx.strokeStyle = u.team === 0 ? 'rgba(16, 185, 129, 0.35)' : 'rgba(239, 68, 68, 0.35)';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
  });

  spellProjectiles.update(sim.combatLog, view, frameDt * speedFactor);
  spellProjectiles.draw(ctx, view, tokenR);
  drainLifeBeams.update(units, sim.simTimeMs, frameDt * speedFactor);
  drainLifeBeams.draw(ctx, view, tokenR);

  // Draw Unit Tokens & Spell Icons
  units.forEach((u) => {
    const { x: ux, y: uy } = view.get(u.id)!;
    const isAlive = u.alive === 1;

    // Unit Token Circle (No collision with other units)
    ctx.beginPath();
    ctx.arc(ux, uy, tokenR, 0, Math.PI * 2);
    ctx.fillStyle = isAlive ? (u.team === 0 ? '#064e3b' : '#7f1d1d') : '#18181b';
    ctx.fill();
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = isAlive ? (u.team === 0 ? '#10b981' : '#ef4444') : '#52525b';
    ctx.stroke();

    // Render Class Icon inside unit token
    if (u.icon) {
      const img = getIconImage(u.icon);
      if (img.complete && img.naturalWidth > 0) {
        ctx.save();
        ctx.beginPath();
        ctx.arc(ux, uy, tokenR - 2, 0, Math.PI * 2);
        ctx.clip();
        ctx.drawImage(img, ux - (tokenR - 2), uy - (tokenR - 2), (tokenR - 2) * 2, (tokenR - 2) * 2);
        ctx.restore();
      }
    }

    // Name Tag
    ctx.font = 'bold 11px sans-serif';
    ctx.fillStyle = isAlive ? '#fff' : '#71717a';
    ctx.textAlign = 'center';

    ctx.fillText(u.name, ux, uy - 26);

    const effects = visibleEffects(u, sim.simTimeMs);
    const rooted = effects.some(effect => effect.kind === 'root');
    const feared = effects.some(effect => effect.kind === 'fear');
    if (rooted || feared) {
      ctx.save();
      ctx.strokeStyle = rooted ? '#67e8f9' : '#c084fc';
      ctx.fillStyle = rooted ? 'rgba(103,232,249,0.14)' : 'rgba(192,132,252,0.12)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      if (rooted) {
        // Faceted ice surrounding the token, leaving its icon readable.
        for (let i = 0; i < 6; i++) {
          const angle = Math.PI / 3 * i - Math.PI / 2;
          const x = ux + Math.cos(angle) * (tokenR + 7);
          const y = uy + Math.sin(angle) * (tokenR + 7);
          if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.closePath();
      } else {
        ctx.setLineDash([4, 4]);
        ctx.arc(ux, uy, tokenR + 6, 0, Math.PI * 2);
      }
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }
    // Stack simultaneous effects instead of hiding roots behind fear/silence.
    effects.forEach((effect, index) => {
      const text = `${effect.label.toUpperCase()} ${((effect.expiresAt - sim.simTimeMs) / 1000).toFixed(1)}s`;
      ctx.font = 'bold 10px sans-serif';
      const width = ctx.measureText(text).width + 12;
      const x = Math.max(width / 2 + 2, Math.min(canvas.width - width / 2 - 2, ux));
      const y = Math.max(12, uy - 44 - index * 17);
      ctx.fillStyle = '#111521';
      ctx.fillRect(x - width / 2, y - 11, width, 15);
      ctx.fillStyle = effect.color;
      ctx.fillText(text, x, y);
    });

    // HP Mini Bar
    const barW = 44;
    const hpRatio = Math.max(0, u.hp / u.maxHp);
    ctx.fillStyle = '#000';
    ctx.fillRect(ux - barW / 2, uy + 24, barW, 5);
    ctx.fillStyle = u.team === 0 ? '#10b981' : '#ef4444';
    ctx.fillRect(ux - barW / 2, uy + 24, barW * hpRatio, 5);
    ctx.strokeStyle = '#27272a';
    ctx.strokeRect(ux - barW / 2, uy + 24, barW, 5);

    // Cast Bar with Spell Icon
    const now = sim.simTimeMs;
    if (u.castSpellId > 0 && u.castEnd > now) {
      const spell = SPELL_CATALOG[u.castSpellId];
      const castProgress = Math.max(0, Math.min(1, 1.0 - (u.castEnd - now) / spell.castTimeMs));
      ctx.fillStyle = '#111';
      ctx.fillRect(ux - barW / 2, uy + 32, barW, 4);
      ctx.fillStyle = '#f59e0b';
      ctx.fillRect(ux - barW / 2, uy + 32, barW * castProgress, 4);

      if (spell.icon) {
        const sImg = getIconImage(spell.icon);
        if (sImg.complete && sImg.naturalWidth > 0) {
          ctx.drawImage(sImg, ux + barW / 2 + 2, uy + 26, 14, 14);
        }
      }
    }

    // RHEA Horizon Plan Preview (mini spell badges for unit's planned actions).
    // Opt-in via the "Show AI plan" toggle; first badge (amber border) is the next action.
    const horizon = sim.elitePlanHorizon[u.id];
    if (showPlanToggle?.checked && isAlive && horizon && horizon.length > 0) {
      const badgeSize = 10;
      const totalPlanW = horizon.length * (badgeSize + 2);
      const startX = ux - totalPlanW / 2;
      const planY = uy + (u.castSpellId > 0 && u.castEnd > now ? 40 : 33);

      for (let h = 0; h < horizon.length; h++) {
        const gene = horizon[h];
        const sid = gene.spellId;
        const hx = startX + h * (badgeSize + 2);
        const spell = SPELL_CATALOG[sid];
        if (spell && spell.icon) {
          const sImg = getIconImage(spell.icon);
          if (sImg.complete && sImg.naturalWidth > 0) {
            ctx.drawImage(sImg, hx, planY, badgeSize, badgeSize);
          } else {
            ctx.fillStyle = sid === 0 ? '#3f3f46' : '#6366f1';
            ctx.fillRect(hx, planY, badgeSize, badgeSize);
          }
        } else {
          ctx.fillStyle = '#3f3f46';
          ctx.fillRect(hx, planY, badgeSize, badgeSize);
        }
        ctx.strokeStyle = h === 0 ? '#f59e0b' : '#27272a';
        ctx.lineWidth = 1;
        ctx.strokeRect(hx, planY, badgeSize, badgeSize);

        // Desired Range indicator badge: ⚔ for melee (<=5y), 🏹 for ranged (>5y)
        if (gene.desiredRange <= 5) {
          ctx.fillStyle = '#10b981';
          ctx.beginPath();
          ctx.arc(hx + badgeSize / 2, planY - 3, 2, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.fillStyle = '#38bdf8';
          ctx.beginPath();
          ctx.arc(hx + badgeSize / 2, planY - 3, 2, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
  });
}

// Opening the page must not compile or dispatch GPU work automatically.
statusLabel.textContent = "GPU paused. Click Initialize GPU to enable the simulator.";
searchActBtn.textContent = "Initialize GPU";
stepBtn.disabled = true;
benchBtn.disabled = true;
resetBtn.disabled = true;
searchActBtn.addEventListener('click', async () => {
  searchActBtn.disabled = true;
  try {
    await bootstrap();
    if (sim.gpuErrors.length === 0) {
      searchActBtn.disabled = false;
      searchActBtn.textContent = "Search & Act (RHEA)";
      stepBtn.disabled = false;
      benchBtn.disabled = false;
      resetBtn.disabled = false;
    }
  } catch (error) {
    statusLabel.textContent = `GPU initialization failed: ${String(error)}`;
  }
}, { once: true });
