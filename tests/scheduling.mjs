// Host scheduling regression tests. The fake GPU delays fences and mapAsync;
// it records submissions/copies and deliberately does not simulate combat.
import assert from 'node:assert/strict';
import {build} from 'vite';
const bundle = await build({configFile: false, logLevel: 'silent', build: {write: false, minify: false,
  lib: {entry: 'src/simulator.ts', formats: ['es'], fileName: 'simulator'}}});
const code = (Array.isArray(bundle) ? bundle[0] : bundle).output.find(item => item.type === 'chunk').code;
const {WebGPURHEASimulator} = await import('data:text/javascript;base64,' + Buffer.from(code).toString('base64'));
globalThis.GPUBufferUsage = {STORAGE: 1, COPY_SRC: 2, COPY_DST: 4, UNIFORM: 8, MAP_READ: 16};
globalThis.GPUMapMode = {READ: 1};
globalThis.location = {search: ''};
const tick = () => new Promise(resolve => setImmediate(resolve));
class FakeGPU {
  maps = []; fences = []; submissions = []; bindGroups = [];
  createBuffer({size}) {
    const gpu = this;
    return {bytes: new ArrayBuffer(size), mapState: 'unmapped',
      mapAsync() { assert.equal(this.mapState, 'unmapped'); this.mapState = 'pending';
        return new Promise(resolve => gpu.maps.push(() => { this.mapState = 'mapped'; resolve(); })); },
      getMappedRange() { assert.equal(this.mapState, 'mapped'); return this.bytes; },
      unmap() { this.mapState = 'unmapped'; }};
  }
  queue = {
    writeBuffer: (buffer, offset, data) => new Uint8Array(buffer.bytes).set(
      data instanceof ArrayBuffer ? new Uint8Array(data) : new Uint8Array(data.buffer, data.byteOffset, data.byteLength), offset),
    submit: commands => { for (const command of commands) {
      this.submissions.push(command);
      for (const op of command) if (op.copy) {
        const [source, sourceOffset, dest, destOffset, size] = op.copy;
        assert.equal(dest.mapState, 'unmapped', 'GPU wrote a busy staging slot');
        new Uint8Array(dest.bytes, destOffset, size).set(new Uint8Array(source.bytes, sourceOffset, size));
      } else if (op.pipeline.label === 'find_best_candidate') {
        const result = op.group.entries.find(entry => entry.binding === 6).resource.buffer;
        new Uint32Array(result.bytes).set([0, 1000000, 16384, 1000000]);
      }
    } },
    onSubmittedWorkDone: () => new Promise(resolve => this.fences.push(resolve)),
  };
  createCommandEncoder() {
    const ops = [];
    return {copyBufferToBuffer(...copy) { ops.push({copy}); },
      beginComputePass() { const op = {}; return {
        setPipeline(pipeline) { op.pipeline = pipeline; }, setBindGroup(_, group) { op.group = group; },
        dispatchWorkgroups(groups) { op.groups = groups; }, end() { ops.push(op); }}; },
      finish() { return ops; }};
  }
  createShaderModule() { return {getCompilationInfo: async () => ({messages: []})}; }
  async createComputePipelineAsync({label}) { return {label, getBindGroupLayout: () => ({})}; }
  createBindGroup(group) { this.bindGroups.push(group); return group; }
  async flush() { this.fences.splice(0).forEach(resolve => resolve()); this.maps.splice(0).forEach(resolve => resolve()); await tick(); }
}
const gpu = new FakeGPU(), sim = new WebGPURHEASimulator();
sim.device = gpu;
sim.initDefaultEntities(); sim.createBuffers(); await sim.createPipelines();
// User-approved pre-expansion baseline, including its known opening heuristics.
const restoredPlan = new Uint32Array(sim.committedPlanBuffer.bytes);
for (const [unit, spell, range] of [[0, 1, 0], [1, 5, 20], [2, 10, 30], [3, 13, 30]]) {
  assert.equal(restoredPlan[unit * 8] & 255, spell, 'Opening spell baseline was not restored');
  for (let h = 0; h < 8; h++) {
    assert.equal((restoredPlan[unit * 8 + h] >>> 8) & 255, range, 'Opening distance baseline was not restored');
    if (h > 0) assert.equal(restoredPlan[unit * 8 + h] & 255, 0);
  }
}
const binding = (pipeline, index) => sim.pipelineGroups.get(pipeline).entries.find(entry => entry.binding === index).resource.buffer;
assert.notEqual(binding(sim.simulatePipeline, 1), binding(sim.advanceLivePipeline, 1), 'Search mutates the live arena');
assert.notEqual(binding(sim.simulatePipeline, 7), binding(sim.advanceLivePipeline, 7), 'Search shares the live event heap');
assert.notEqual(binding(sim.simulatePipeline, 4), binding(sim.advanceLivePipeline, 4), 'Search exposes unfinished plans to combat');
assert(sim.stepRHEAAsync());
assert.equal(sim.totalSimulationsRun, 2048, 'A full generation blocked the queue');
assert.equal(sim.stepRHEAAsync(), false, 'Multiple search slices piled up');
const frozen = new Uint8Array(sim.searchStateBuffer.bytes).slice();
new Uint32Array(sim.liveStateBuffer.bytes)[0] = 50;
assert.deepEqual(new Uint8Array(sim.searchStateBuffer.bytes), frozen, 'Search snapshot changed during live stepping');
assert(sim.advanceLiveAsync(50));
assert(sim.advanceLiveAsync(50));
assert.equal(sim.submittedTimeMs, 100, 'Live clock waited for search fence');
void sim.requestSnapshot(); void sim.requestSnapshot();
assert.equal(sim.snapshots.filter(slot => slot.busy).length, 2);
const submissions = gpu.submissions.length;
await sim.requestSnapshot();
assert.equal(gpu.submissions.length, submissions, 'Readback pool grew without bounds');
assert(sim.advanceLiveAsync(50), 'Live stepping waited for mapAsync');
assert.equal(sim.submittedTimeMs, 150);
await gpu.flush();
// Each remaining batch completes independently; the full 32,768 population is retained.
while (sim.totalSimulationsRun < 32768) {
  sim.searchCandidatesPerSlice = 2048;
  assert(sim.stepRHEAAsync());
  assert(sim.advanceLiveAsync(50));
  await gpu.flush();
}
assert.equal(sim.totalSimulationsRun, 32768);
assert.equal(sim.isPlanning, false);
const publications = gpu.submissions.flat().filter(op => op.copy?.[0] === sim.bestPlanBuffer && op.copy?.[2] === sim.committedPlanBuffer);
assert.equal(publications.length, 1, 'Incomplete search results were published');
// A newer render snapshot may finish mapping first; older data must not rewind the UI.
new Uint32Array(sim.liveStateBuffer.bytes)[0] = 100;
void sim.requestSnapshot();
new Uint32Array(sim.liveStateBuffer.bytes)[0] = 200;
void sim.requestSnapshot();
const firstMaps = gpu.maps.splice(0, 2), secondMaps = gpu.maps.splice(0, 2);
secondMaps.forEach(resolve => resolve()); await tick();
assert.equal(sim.simTimeMs, 200);
firstMaps.forEach(resolve => resolve()); await tick();
assert.equal(sim.simTimeMs, 200, 'Old readback rewound live state');
// Reset supersedes in-flight planning and readback without exposing old state.
assert(sim.stepRHEAAsync()); void sim.requestSnapshot();
sim.resetMatch(); await gpu.flush();
assert.equal(sim.simTimeMs, 0); assert.equal(sim.submittedTimeMs, 0);
assert.equal(sim.search, null); assert.equal(sim.combatFailed, false);
// Event ring snapshots overlap; the host must not duplicate events.
const events = new ArrayBuffer(1924), eu = new Uint32Array(events);
eu[0] = 82;
for (let i = 2; i < 82; i++) { const o = 1 + (i % 80) * 6; eu[o] = i; eu[o + 2] = 2; eu[o + 4] = 1; }
sim.readGPUEvents(events); sim.readGPUEvents(events);
assert.equal(sim.combatLog.length, 80); assert.equal(sim.lastEventSequence, 82);
assert.equal(sim.pending.size, 0);
// Pipelined search: up to maxSearchInFlight batches queue, then it stops; live ticks
// still interleave, and the generation still publishes exactly once when complete.
sim.resetMatch(); await gpu.flush();
sim.maxSearchInFlight = 3; sim.searchCandidatesPerSlice = 2048;
const runBefore = sim.totalSimulationsRun;
assert(sim.stepRHEAAsync(8192)); assert(sim.stepRHEAAsync(8192)); assert(sim.stepRHEAAsync(8192));
assert.equal(sim.stepRHEAAsync(8192), false, 'Search pipeline exceeded maxSearchInFlight');
assert(sim.advanceLiveAsync(50), 'Live stepping blocked by pipelined search');
await gpu.flush();
assert(sim.stepRHEAAsync(8192), 'Pipeline did not drain after completion');
await gpu.flush(); await gpu.flush();
assert.equal(sim.totalSimulationsRun - runBefore, 8192);
assert.equal(sim.isPlanning, false);
console.log('PASS pipelined search batches');
console.log('PASS live stepping during delayed search/readback, snapshot isolation, complete-population publication, bounded readbacks, out-of-order snapshots, reset cancellation, and event-ring deduplication');
// Serial short batches must accumulate an active-time measurement window.
const realPerformance = globalThis.performance;
let clock = 1000;
globalThis.performance = {now: () => clock};
try {
  const serialGpu = new FakeGPU(), serial = new WebGPURHEASimulator();
  serial.device = serialGpu;
  serial.initDefaultEntities(); serial.createBuffers(); await serial.createPipelines();
  for (let i = 0; i < 25; i++) {
    assert(serial.stepRHEAAsync(32768));
    clock += 10;
    await serialGpu.flush();
    clock += 1000; // Idle time must not depress GPU throughput.
  }
  assert.equal(serial.searchThroughput, 204.8);
  assert(serial.adaptivePopulation() > 1024, 'Serial batches never learned throughput');
  assert.equal(serial.adaptivePopulation(), 32768, 'Population exceeded its existing cap');
} finally { globalThis.performance = realPerformance; }
console.log('PASS serial throughput accumulation and idle-gap exclusion');
