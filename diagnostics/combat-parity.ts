import { SIMULATION_WGSL } from '../src/shaders/sim.wgsl';
import {
  SPELL_CATALOG,
  MAX_SPELLS,
  MAX_ENTITIES,
  ARENA_HEADER_WORDS,
  ENTITY_BASE_WORDS,
  SPELL_WORDS,
  ENTITY_WORDS,
  ARENA_WORDS,
  ARENA_BYTES,
  SIM_QUEUE_WORDS,
  SIM_QUEUE_BYTES,
  COMBAT_EVENTS_WORDS,
  COMBAT_EVENTS_BYTES,
  BEST_PLAN_WORDS,
  BEST_PLAN_BYTES,
} from '../src/constants';

// Test entry point calls the exact function used by simulate_candidate, with an
// observable final snapshot instead of fitness alone. No CPU combat reference.
export const PARITY_WGSL = /* wgsl */ `
struct ReferenceSnapshot { state: ArenaState, queue: SimQueue, };
@group(0) @binding(10) var<storage, read_write> referenceSnapshot: ReferenceSnapshot;
@compute @workgroup_size(32)
fn predict_reference(@builtin(global_invocation_id) id: vec3<u32>) {
    if (id.x != 0u) { return; }
    var plan: array<u32, 48>;
    for (var i = 0u; i < 48u; i++) { plan[i] = bestPlan[i]; }
    let result = advance_combat(liveState, liveQueue, plan, 8u, liveParams.x, false);
    referenceSnapshot.state = result.state;
    referenceSnapshot.queue = result.queue;
}
`;

const output = document.querySelector<HTMLPreElement>('#output')!;
const assert = (condition: boolean, message: string) => { if (!condition) throw Error(message); };
const report = (message: string) => { output.textContent += message + '\n'; };

function arena(classes: number[], teams: number[], positions: number[]) {
  const buffer = new ArrayBuffer(ARENA_BYTES), u = new Uint32Array(buffer), f = new Float32Array(buffer);
  u[1] = MAX_ENTITIES;
  for (let i = 0; i < MAX_ENTITIES; i++) {
    const b = ARENA_HEADER_WORDS + i * ENTITY_WORDS, active = classes[i] > 0;
    u[b] = i; u[b + 1] = teams[i] ?? 0; u[b + 2] = Number(active);
    u[b + 3] = teams.findIndex(team => team !== teams[i]);
    f[b + 4] = active ? 30000 : 0; f[b + 5] = f[b + 4];
    f[b + 6] = 10000; f[b + 7] = 10000; u[b + 8] = classes[i] === 1 ? 1 : 0;
    u[b + 13] = 2000; f[b + 14] = 300; f[b + 15] = 300;
    f[b + 17] = 500; f[b + 18] = positions[i] ?? 20; f[b + 19] = 20;
    f[b + 20] = 7; u[b + 25] = classes[i] ?? 0;
  }
  return buffer;
}

async function run() {
  assert(!!navigator.gpu, 'WebGPU unavailable');
  const adapter = await navigator.gpu.requestAdapter();
  assert(!!adapter, 'No WebGPU adapter');
  const device = await adapter!.requestDevice();
  const errors: string[] = [];
  device.addEventListener('uncapturederror', event => errors.push(event.error.message));
  const module = device.createShaderModule({code: SIMULATION_WGSL + PARITY_WGSL});
  const info = await module.getCompilationInfo();
  assert(!info.messages.some(m => m.type === 'error'), info.messages.map(m => m.message).join('\n'));
  const pipelines = await Promise.all(['advance_live', 'predict_reference'].map(entryPoint =>
    device.createComputePipelineAsync({layout: 'auto', compute: {module, entryPoint}})));
  const buffers: Record<number, GPUBuffer> = {};
  for (const [binding, size] of [[0, MAX_SPELLS * SPELL_WORDS * 4], [1, ARENA_BYTES], [4, BEST_PLAN_BYTES], [7, SIM_QUEUE_BYTES], [8, 16], [9, COMBAT_EVENTS_BYTES], [10, ARENA_BYTES + SIM_QUEUE_BYTES], [12, 32]]) {
    buffers[binding] = device.createBuffer({size, usage: (binding === 8 ? GPUBufferUsage.UNIFORM : GPUBufferUsage.STORAGE)
      | GPUBufferUsage.COPY_SRC | GPUBufferUsage.COPY_DST});
  }
  const spellData = new ArrayBuffer(MAX_SPELLS * SPELL_WORDS * 4), su = new Uint32Array(spellData), sf = new Float32Array(spellData);
  SPELL_CATALOG.forEach((s, i) => {
    const b = i * SPELL_WORDS;
    const fields = [s.castTimeMs, s.cooldownMs, s.cost, s.powerType, s.rangeYards, s.baseDamageMin,
      s.baseDamageMax, s.scaling, s.isHeal, s.isDot, s.dotDurationMs, s.dotTickMs,
      s.dotDamagePerTick, s.ccType, s.ccDurationMs, s.auraType, s.selfHealRatio ?? 0, s.classId ?? 0, s.selfOnly ? 1 : 0, s.blinkDistance ?? 0, s.channelMs ?? 0, s.absorbBase ?? 0];
    fields.forEach((value, k) => { ([2, 4, 5, 6, 7, 12, 16, 19, 21].includes(k) ? sf : su)[b + k] = value; });
  });
  device.queue.writeBuffer(buffers[0], 0, spellData);
  const bindings = [[0, 1, 4, 7, 8, 9, 12], [0, 1, 4, 7, 8, 9, 10]];
  const groups = pipelines.map((pipeline, i) => device.createBindGroup({layout: pipeline.getBindGroupLayout(0),
    entries: bindings[i].map(binding => ({binding, resource: {buffer: buffers[binding]}}))}));
  const dispatch = (index: number, until: number) => {
    device.queue.writeBuffer(buffers[8], 0, new Uint32Array([until, 0, 0, 0]));
    const encoder = device.createCommandEncoder(), pass = encoder.beginComputePass();
    pass.setPipeline(pipelines[index]); pass.setBindGroup(0, groups[index]); pass.dispatchWorkgroups(1); pass.end();
    device.queue.submit([encoder.finish()]);
  };
  const read = async (binding: number, size: number) => {
    const staging = device.createBuffer({size, usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST});
    const encoder = device.createCommandEncoder();
    encoder.copyBufferToBuffer(buffers[binding], 0, staging, 0, size); device.queue.submit([encoder.finish()]);
    await staging.mapAsync(GPUMapMode.READ);
    const result = staging.getMappedRange().slice(0); staging.unmap(); staging.destroy(); return result;
  };
  const fixtures = [
    {name: 'immune Polymorph attempts do not report successful CC', classes: [3, 1], teams: [0, 1], positions: [20, 40], spells: [17, 0], targets: [1, 0]},
    {name: 'Polymorph independent DR and regeneration', classes: [3, 1], teams: [0, 1], positions: [20, 40], spells: [17, 0], targets: [1, 0]},
    {name: 'Ice Barrier self absorb and cooldown', classes: [3, 1], teams: [0, 1], positions: [20, 40], spells: [18, 0], targets: [1, 0]},
    {name: 'Blink planned retreat and cooldown', classes: [3, 1], teams: [0, 1], positions: [20, 40], spells: [19, 0], targets: [1, 0], ranges: [30, 20]},
    {name: 'Drain Life channel and leech', classes: [4, 1], teams: [0, 1], positions: [20, 40], spells: [20, 0], targets: [1, 0]},
    {name: 'flee fear', classes: [1, 1], teams: [0, 1], positions: [30, 55], spells: [0, 0], targets: [1, 0]},
    {name: 'flee horror', classes: [1, 1], teams: [0, 1], positions: [30, 55], spells: [0, 0], targets: [1, 0]},
    {name: 'flee rooted fear', classes: [1, 1], teams: [0, 1], positions: [30, 55], spells: [0, 0], targets: [1, 0]},
    {name: 'flee stun holds still', classes: [1, 1], teams: [0, 1], positions: [30, 55], spells: [0, 0], targets: [1, 0]},
    {name: 'Death Coil damage, leech, horror and cooldown', classes: [4, 1], teams: [0, 1], positions: [20, 23], spells: [16, 1], targets: [1, 0], ranges: [0, 0]},
    {name: 'cast completion across commits', classes: [3, 4], teams: [0, 1], positions: [20, 40], spells: [10, 14], targets: [1, 0]},
    {name: 'periodic damage/healing across commits', classes: [4, 2], teams: [0, 1], positions: [20, 40], spells: [13, 6], targets: [1, 1]},
    {name: 'absorb shield and melee damage', classes: [1, 2], teams: [0, 1], positions: [20, 23], spells: [1, 7], targets: [1, 1], ranges: [0, 0]},
    {name: 'root/slow movement and empty roster slots', classes: [3, 0, 1], teams: [0, 0, 1], positions: [20, 0, 28], spells: [12, 0, 3], targets: [2, 0, 0], ranges: [0, 0, 0]},
  ];
  try {
    for (const fixture of fixtures) {
      const initial = arena(fixture.classes, fixture.teams, fixture.positions);
      if (fixture.name.startsWith('immune')) {
        const words = new Uint32Array(initial), b = ARENA_HEADER_WORDS + ENTITY_WORDS;
        words[b + 34] = 3; words[b + 35] = 10000;
      }
      if (fixture.name.startsWith('Drain Life')) new Float32Array(initial)[ARENA_HEADER_WORDS + 4] = 20000;
      if (fixture.name.startsWith('Polymorph')) new Float32Array(initial)[ARENA_HEADER_WORDS + ENTITY_WORDS + 4] = 20000;
      if (fixture.name.startsWith('Death Coil')) new Float32Array(initial)[ARENA_HEADER_WORDS + 4] = 20000;
      if (fixture.name.startsWith('flee')) {
        const words = new Uint32Array(initial), b = ARENA_HEADER_WORDS;
        if (fixture.name.includes('horror')) words[b + 29] = 5000;
        else {
          words[b + 21] = 5000;
          words[b + 30] = fixture.name.includes('stun') ? 1 : 4;
        }
        if (fixture.name.includes('rooted')) {
          words[b + ENTITY_BASE_WORDS + 1] = 6;
          words[b + ENTITY_BASE_WORDS + 2] = 5000;
        }
      }
      device.queue.writeBuffer(buffers[1], 0, initial);
      device.queue.writeBuffer(buffers[7], 0, new Uint32Array(SIM_QUEUE_WORDS));
      device.queue.writeBuffer(buffers[9], 0, new Uint32Array(COMBAT_EVENTS_WORDS));
      device.queue.writeBuffer(buffers[12], 0, new Uint32Array(8));
      const plan = new Uint32Array(BEST_PLAN_WORDS);
      for (let i = 0; i < MAX_ENTITIES; i++) for (let h = 0; h < 8; h++) {
        plan[i * 8 + h] = (fixture.spells[i] ?? 0) | ((fixture.ranges?.[i] ?? 20) << 8) | ((fixture.targets[i] ?? 0) << 16);
      }
      device.queue.writeBuffer(buffers[4], 0, plan);
      // Initial auras, casts and queue are cloned by predict_reference exactly as in a rollout.
      dispatch(1, 5000);
      const reference = new Uint32Array(await read(10, ARENA_BYTES + SIM_QUEUE_BYTES));
      let midfightReference = reference;
      for (let time = 50; time <= 5000; time += 50) {
        dispatch(0, time);
        if (time === 50 && fixture.name.startsWith('Death Coil')) {
          const first = await read(1, ARENA_BYTES), u = new Uint32Array(first), f = new Float32Array(first);
          const caster = ARENA_HEADER_WORDS, victim = caster + ENTITY_WORDS;
          assert(f[caster + 4] > 20000, 'Death Coil did not heal its caster');
          assert(f[victim + 4] < 30000, 'Death Coil did not damage its target');
          assert(u[victim + 29] === 3010 && u[victim + 23] === 0, 'Horror duration or independent Fear DR failed');
          assert((u[caster + 28] & 0xffff) * 100 === 120100, 'Death Coil cooldown was not stored');
        }
        if (time === 550 && fixture.name.startsWith('flee')) {
          const snapshot = await read(1, ARENA_BYTES), words = new Uint32Array(snapshot), positions = new Float32Array(snapshot);
          const distance = Math.hypot(positions[ARENA_HEADER_WORDS + 18] - fixture.positions[0], positions[ARENA_HEADER_WORDS + 19] - 20);
          const held = fixture.name.includes('rooted') || fixture.name.includes('stun');
          assert(held ? distance === 0 : Math.abs(distance - 3.5) < 0.001, fixture.name + ': forced movement distance incorrect');
          assert(words[ARENA_HEADER_WORDS + 26] === 1, 'Flee movement consumed a plan decision');
        }
        if (time === 2500) {
          // Re-predict from an arena with active casts, modifiers and queued ticks.
          dispatch(1, 5000);
          midfightReference = new Uint32Array(await read(10, ARENA_BYTES + SIM_QUEUE_BYTES));
        }
      }
      const live = new Uint32Array(await read(1, ARENA_BYTES));
      const queue = new Uint32Array(await read(7, SIM_QUEUE_BYTES));
      assert(live[0] === 5000 && live[3] === 0 && queue[1] === 0, fixture.name + ': simulation limit exceeded');
      for (let i = 0; i < live.length; i++) assert(live[i] === reference[i], `${fixture.name}: arena word ${i} differs`);
      for (let i = 0; i < live.length; i++) assert(live[i] === midfightReference[i], `${fixture.name}: midfight prediction word ${i} differs`);
      // Compare only occupied heap entries; unused heap tail memory is immaterial.
      for (let i = 0; i < 2 + queue[0] * 6; i++) assert(queue[i] === reference[ARENA_WORDS + i], `${fixture.name}: queue word ${i} differs`);
      for (let i = 0; i < 2 + queue[0] * 6; i++) assert(queue[i] === midfightReference[ARENA_WORDS + i], `${fixture.name}: midfight queue word ${i} differs`);
      if (fixture.name.startsWith('cast')) assert(live[8] !== new Uint32Array(arena(fixture.classes, fixture.teams, fixture.positions))[8], 'Cast damage never resolved');
      if (fixture.name.startsWith('periodic')) assert(Array.from({length: queue[0]}, (_, i) => queue[2 + i * 6 + 1]).includes(3), 'Periodic ticks did not persist');
      if (fixture.name.startsWith('absorb')) assert((live[ARENA_HEADER_WORDS + ENTITY_WORDS + ENTITY_BASE_WORDS + 1] & 0xFF) === 3, 'Shield aura was never applied');
      if (fixture.name.startsWith('root')) assert((live[ARENA_HEADER_WORDS + 2 * ENTITY_WORDS + ENTITY_BASE_WORDS + 1] & 0xFF) === 6, 'Root aura was never applied');
      if (fixture.name.startsWith('immune')) {
        const records = new Uint32Array(await read(9, COMBAT_EVENTS_BYTES));
        let starts = 0, successes = 0, phantomDamage = 0;
        for (let i = Math.max(0, records[0] - 80); i < records[0]; i++) {
          const b = 1 + (i % 80) * 6;
          if (records[b + 3] !== 17) continue;
          if (records[b + 4] === 3) starts++;
          if (records[b + 4] === 4) successes++;
          if (records[b + 4] === 1) phantomDamage++;
        }
        assert(starts > 0 && successes === 0 && phantomDamage === 0, 'Immune Polymorph attempts were logged as successful effects');
      }
      const floats = new Float32Array(live.buffer);
      if (fixture.name.startsWith('Polymorph')) {
        const b = ARENA_HEADER_WORDS + ENTITY_WORDS;
        assert(live[b + 34] > 0 && live[b + 23] === 0, 'Polymorph did not use independent DR');
        assert(floats[b + 4] === floats[b + 5], 'Polymorph did not restore full health');
      }
      if (fixture.name.startsWith('Ice Barrier')) {
        const a = ARENA_HEADER_WORDS + ENTITY_BASE_WORDS;
        assert((live[a + 1] & 255) === 3 && floats[a + 5] > 818, 'Ice Barrier absorb missing');
        assert((live[ARENA_HEADER_WORDS + 32] & 65535) * 100 > 30000, 'Barrier cooldown missing');
      }
      if (fixture.name.startsWith('Blink')) {
        assert(floats[ARENA_HEADER_WORDS + 18] < 10, 'Blink did not retreat');
        assert((live[ARENA_HEADER_WORDS + 32] >>> 16) * 100 > 15000, 'Blink cooldown missing');
      }
      if (fixture.name.startsWith('Drain Life')) {
        assert(floats[ARENA_HEADER_WORDS + 4] > 20000 && floats[ARENA_HEADER_WORDS + ENTITY_WORDS + 4] < 30000, 'Channel damage/leech missing');
      }
      if (fixture.name.startsWith('Death Coil')) {
        assert((live[ARENA_HEADER_WORDS + 28] & 0xffff) * 100 === 120100, 'Death Coil recast before cooldown expired');
      }
      assert(errors.length === 0, errors.join('\n'));
      report('PASS ' + fixture.name);
    }
    // A delayed plan must skip decisions already consumed since its snapshot.
    const agedArena = arena([1, 3], [0, 1], [20, 23]);
    new Uint32Array(agedArena)[ARENA_HEADER_WORDS + 26] = 2;
    const agedPlan = new Uint32Array(BEST_PLAN_WORDS);
    agedPlan[0] = 1 | (1 << 16); // stale Mortal Strike
    agedPlan[1] = 2 | (1 << 16); // stale Rend
    agedPlan[2] = 3 | (1 << 16); // current Hamstring
    device.queue.writeBuffer(buffers[1], 0, agedArena);
    device.queue.writeBuffer(buffers[4], 0, agedPlan);
    device.queue.writeBuffer(buffers[7], 0, new Uint32Array(SIM_QUEUE_WORDS));
    device.queue.writeBuffer(buffers[12], 0, new Uint32Array(8));
    dispatch(0, 50);
    const agedLive = new Uint32Array(await read(1, ARENA_BYTES));
    assert(agedLive[ARENA_HEADER_WORDS + 26] === 3 && (agedLive[ARENA_HEADER_WORDS + ENTITY_WORDS + ENTITY_BASE_WORDS + 1] & 0xFF) === 5, 'Delayed plan replayed stale actions');
    report('PASS delayed publication skips consumed decisions');
    // Reuse the aged plan with no power: execution must reject the unaffordable spell.
    new Float32Array(agedArena)[ARENA_HEADER_WORDS + 6] = 0;
    device.queue.writeBuffer(buffers[1], 0, agedArena);
    device.queue.writeBuffer(buffers[7], 0, new Uint32Array(SIM_QUEUE_WORDS));
    dispatch(0, 50);
    const invalidLive = new Uint32Array(await read(1, ARENA_BYTES));
    assert((invalidLive[ARENA_HEADER_WORDS + ENTITY_WORDS + ENTITY_BASE_WORDS + 1] & 0xFF) === 0, 'Unaffordable delayed action executed');
    assert(errors.length === 0, errors.join('\n'));
    report('PASS delayed action rechecks available resources');
    report('PASS all fixtures: bit-identical state and pending events after 100 live commits.');
  } finally { Object.values(buffers).forEach(buffer => buffer.destroy()); device.destroy(); }
}
document.querySelector<HTMLButtonElement>('#run')!.onclick = async event => {
  const button = event.currentTarget as HTMLButtonElement;
  button.disabled = true; output.textContent = '';
  try { await run(); } catch (error) { report('FAIL ' + String(error)); }
  finally { button.disabled = false; }
};
