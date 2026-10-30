// Execute the production GPU engine through native Vulkan, without a CPU combat
// reference. Software Vulkan is a correctness check, not a hardware benchmark.
import assert from 'node:assert/strict';
import {existsSync, mkdtempSync, mkdirSync, readFileSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';
import {build} from 'vite';
const result = await build({configFile: false, logLevel: 'silent', build: {write: false,
  lib: {entry: 'src/constants.ts', formats: ['es']}}});
const code = (Array.isArray(result) ? result[0] : result).output.find(x => x.type === 'chunk').code;
const C = await import('data:text/javascript;base64,' + Buffer.from(code).toString('base64'));
const root = mkdtempSync(join(tmpdir(), 'pvp-cc-native-'));
function run(command, args, options = {}) {
  const p = spawnSync(command, args, {encoding: 'utf8', timeout: 180000, ...options});
  if (p.status !== 0) throw Error(`${command}: ${p.error ?? ''}\n${p.stdout ?? ''}\n${p.stderr ?? ''}`);
  if (p.stdout.trim()) console.log(p.stdout.trim());
}
const naga = process.env.NAGA ?? (existsSync('/tmp/pvp-naga/bin/naga') ? '/tmp/pvp-naga/bin/naga' : 'naga');
run(process.execPath, ['scripts/export-gpu-shader.mjs', join(root, 'sim.wgsl'), '--parity']);
run(naga, [join(root, 'sim.wgsl'), join(root, 'sim.spv')]);
run('cc', ['-O2', '-Wall', '-Wextra', '-Werror', 'tests/native-gpu.c', '-lvulkan', '-o', join(root, 'runner')]);
const O = C.ENTITY_FIELD_OFFSETS;
const base = id => C.ARENA_HEADER_WORDS + id * C.ENTITY_WORDS;
const setU = (s, id, key, value) => new Uint32Array(s)[base(id) + O.uint[key]] = value;
const setF = (s, id, key, value) => new Float32Array(s)[base(id) + O.float[key]] = value;
const getU = (s, id, key) => s[base(id) + O.uint[key]];
function aura(state, slot, {spell = 17, type = 8, expires = 5000, tick = 1000, generation = 1, value = 0, source = 0} = {}) {
  const u = new Uint32Array(state), f = new Float32Array(state), b = base(0) + C.ENTITY_BASE_WORDS + slot * C.AURA_SLOT_WORDS;
  u[b] = spell; u[b + 1] = type | (generation << 8); u[b + 2] = expires;
  u[b + 3] = tick ? 1000 : 0; u[b + 4] = tick; f[b + 5] = value; u[b + 6] = source;
}
function initial() {
  const state = new ArrayBuffer(C.ARENA_BYTES), u = new Uint32Array(state), f = new Float32Array(state);
  u[1] = 6; u[2] = 1; // initialized: use precisely the supplied pending event heap
  for (let id = 0; id < 2; id++) {
    const b = base(id); u[b] = id; u[b + 1] = id; u[b + 2] = 1; u[b + 3] = 1 - id;
    f[b + 4] = id === 0 ? 1000 : 3800; f[b + 5] = 3800;
    f[b + 6] = f[b + 7] = 100; u[b + 8] = 1;
    u[b + 13] = 2000; f[b + 14] = 300; f[b + 18] = 20 + id * 3; f[b + 19] = 20;
    u[b + 25] = 1;
  }
  aura(state, 0);
  return state;
}
function spellData() {
  const data = new ArrayBuffer(C.MAX_SPELLS * C.SPELL_WORDS * 4), u = new Uint32Array(data), f = new Float32Array(data);
  C.SPELL_CATALOG.forEach((s, i) => {
    const fields = [s.castTimeMs, s.cooldownMs, s.cost, s.powerType, s.rangeYards, s.baseDamageMin,
      s.baseDamageMax, s.scaling, s.isHeal, s.isDot, s.dotDurationMs, s.dotTickMs, s.dotDamagePerTick,
      s.ccType, s.ccDurationMs, s.auraType, s.selfHealRatio ?? 0, s.classId ?? 0, Number(s.selfOnly ?? false),
      s.blinkDistance ?? 0, s.channelMs ?? 0, s.absorbBase ?? 0];
    fields.forEach((v, k) => { ([2, 4, 5, 6, 7, 12, 16, 19, 21].includes(k) ? f : u)[i * C.SPELL_WORDS + k] = v; });
  });
  return data;
}
const decision = (at, id = 0) => [at, 5, id, 1 - id, 0, 0];
const swing = at => [at, 1, 1, 0, 0, 0];
const heal = at => [at, 7, 0, 0, 17, 1];
const near = (actual, expected) => assert(Math.abs(actual - expected) < 0.01, `${actual} != ${expected}`);
const noPolyHeal = events => assert(!events.some(e => e.kind === 2 && e.spell === 17), 'A cancelled Polymorph healed');
const victimDecision = q => {
  const pending = [];
  for (let i = 0; i < q[0]; i++) { const b = 2 + i * 6; if (q[b + 1] === 5 && q[b + 2] === 0) pending.push(q[b]); }
  assert(pending.length <= 1, 'CC break created duplicate decision events');
  return pending[0];
};
const fixtures = [], manifest = [];
function fixture(name, {events, until = 2000, configure = () => {}, check}) {
  const state = initial(), plan = new Uint32Array(C.BEST_PLAN_WORDS);
  for (let id = 0; id < 6; id++) for (let h = 0; h < 8; h++) plan[id * 8 + h] = (3 << 8) | ((id === 0 ? 1 : 0) << 16);
  configure(state, plan);
  const queue = new Uint32Array(C.SIM_QUEUE_WORDS), sorted = [...events].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  assert(sorted.length <= 40); queue[0] = sorted.length;
  sorted.forEach((event, i) => queue.set(event, 2 + i * 6)); // sorted array is a valid min-heap
  const paths = [];
  for (const mode of ['prediction', 'live']) {
    const path = join(root, `${fixtures.length}-${mode}`); mkdirSync(path); paths.push(path);
    const inputs = {0: spellData(), 1: state, 4: plan, 7: queue, 8: new Uint32Array(4),
      9: new Uint32Array(C.COMBAT_EVENTS_WORDS), 10: new ArrayBuffer(C.ARENA_BYTES + C.SIM_QUEUE_BYTES), 12: new Uint32Array(8)};
    for (const [binding, data] of Object.entries(inputs)) writeFileSync(join(path, `in${binding}.bin`), Buffer.from(data.buffer ?? data));
    manifest.push(`${path} ${Number(mode === 'prediction')} ${until} ${mode === 'prediction' ? until : 50}`);
  }
  fixtures.push({name, paths, check});
}
for (const [name, at, expiry] of [['break before heal', 999, 5000], ['break exactly on heal', 1000, 5000], ['expired aura hit on stale heal', 1000, 100]]) {
  fixture(name, {until: 1000, events: [swing(at), heal(1000)], configure: s => aura(s, 0, {expires: expiry}),
    check: (u, f, q, events) => { near(f[base(0) + 4], 855); noPolyHeal(events);
      assert.equal(u[base(0) + C.ENTITY_BASE_WORDS + 4], 0);
    }});
}
fixture('expired Polymorph without a hit never heals', {until: 1000, events: [heal(1000)], configure: s => aura(s, 0, {expires: 100}),
  check: (u, f, q, events) => { near(f[base(0) + 4], 1000); noPolyHeal(events); }});
fixture('active Polymorph retains full-HP healing', {until: 1000, events: [heal(1000)],
  check: (u, f, q, events) => { near(f[base(0) + 4], 3800); assert(events.some(e => e.kind === 2 && e.spell === 17 && e.value === 2800)); }});
fixture('natural final healing tick remains valid', {until: 1000, events: [heal(1000)], configure: s => aura(s, 0, {expires: 1000}),
  check: (u, f) => near(f[base(0) + 4], 3800)});
fixture('old generation cannot heal a refreshed aura', {until: 1000, events: [heal(1000)], configure: s => aura(s, 0, {generation: 2}),
  check: (u, f, q, events) => { near(f[base(0) + 4], 1000); noPolyHeal(events); }});
fixture('early Polymorph break resumes the existing decision', {events: [decision(1000), heal(1000), swing(1500)],
  check: (u, f, q) => { assert.equal(getU(u, 0, 'decisionCount'), 2); assert.equal(victimDecision(q), 2050); }});
fixture('resumed turns never retain a second original decision', {until: 6000, events: [decision(1000), heal(1000), swing(1500)],
  check: (u, f, q) => { assert.equal(getU(u, 0, 'decisionCount'), 10); assert.equal(victimDecision(q), 6050); }});
fixture('resumed decision respects an active GCD', {events: [decision(1000), heal(1000), swing(1500)], configure: s => setU(s, 0, 'gcdEnd', 3000),
  check: (u, f, q) => { assert.equal(getU(u, 0, 'decisionCount'), 1); assert.equal(victimDecision(q), 3050); }});
fixture('remaining Horror still prevents acting', {events: [decision(1000), heal(1000), swing(1500)], configure: s => setU(s, 0, 'horrorEnd', 4000),
  check: (u, f, q) => { assert.equal(getU(u, 0, 'decisionCount'), 1); assert.equal(victimDecision(q), 4050); }});
fixture('remaining Fear still prevents acting', {events: [decision(1000), heal(1000), swing(1500)], configure: s => {
  setU(s, 0, 'stunEnd', 3500); setU(s, 0, 'incapacitateType', 4);
}, check: (u, f, q) => { assert.equal(getU(u, 0, 'decisionCount'), 1); assert.equal(victimDecision(q), 3550); }});
fixture('breaking Fear also resumes decisions', {events: [decision(1000), swing(1500)], configure: s => {
  aura(s, 0, {expires: 0, tick: 0}); setU(s, 0, 'stunEnd', 5000); setU(s, 0, 'incapacitateType', 4); setF(s, 1, 'attackPower', 1000);
}, check: (u, f, q) => { assert.equal(getU(u, 0, 'stunEnd'), 1500); assert.equal(getU(u, 0, 'decisionCount'), 2); assert.equal(victimDecision(q), 2050); }});
fixture('an already earlier decision is not delayed', {events: [decision(1510), swing(1500)],
  check: (u, f, q) => { assert.equal(getU(u, 0, 'decisionCount'), 1); assert.equal(victimDecision(q), 2010); }});
fixture('breaking CC does not accelerate a normal pending turn', {until: 750, events: [decision(1000), swing(500), heal(1000)],
  check: (u, f, q) => { assert.equal(getU(u, 0, 'decisionCount'), 0); assert.equal(victimDecision(q), 1000); }});
fixture('retiming a CC-delayed turn needs no free heap slot', {until: 1200,
  events: [decision(500), swing(1000), ...Array.from({length: 38}, (_, i) => [10000 + i, 4, 1, 0, 0, 0])],
  check: (u, f, q) => { assert.equal(q[0], 40); assert.equal(getU(u, 0, 'decisionCount'), 2); assert.equal(victimDecision(q), 1550); }});
fixture('no pending turn means no new turn is created', {events: [swing(1000)],
  check: (u, f, q) => { assert.equal(getU(u, 0, 'decisionCount'), 0); assert.equal(victimDecision(q), undefined); }});
fixture('fully absorbed damage does not break Polymorph', {until: 1200, events: [decision(500), swing(1000), heal(1000)], configure: s => {
  aura(s, 1, {spell: 7, type: 3, tick: 0, value: 1000});
}, check: (u, f, q) => { near(f[base(0) + 4], 3800); assert.equal(victimDecision(q), 5050); }});
fixture('periodic damage cancels healing and resumes decisions', {until: 1200, events: [decision(500), [1000, 3, 1, 0, 13, 3], heal(1000)], configure: s => {
  aura(s, 1, {spell: 13, type: 7, expires: 9000, tick: 1000, generation: 3, source: 1});
}, check: (u, f, q, events) => { near(f[base(0) + 4], 905); noPolyHeal(events); assert.equal(getU(u, 0, 'decisionCount'), 2); assert.equal(victimDecision(q), 1550); }});
fixture('cast damage cancels healing and resumes decisions', {until: 1200, events: [decision(500), [1000, 2, 1, 0, 10, 0], heal(1000)], configure: s => {
  setU(s, 1, 'castEnd', 1000); setU(s, 1, 'castSpellId', 10); setU(s, 1, 'powerType', 0); setF(s, 1, 'power', 10000); setF(s, 1, 'maxPower', 10000);
}, check: (u, f, q, events) => { near(f[base(0) + 4], 680); noPolyHeal(events); assert.equal(getU(u, 0, 'decisionCount'), 2); assert.equal(victimDecision(q), 1550); }});
function instantCaster(s, plan, spell, classId) {
  new Uint32Array(s)[base(1) + 25] = classId; setU(s, 1, 'powerType', 0); setF(s, 1, 'power', 10000); setF(s, 1, 'maxPower', 10000);
  for (let h = 0; h < 8; h++) plan[8 + h] = spell | (3 << 8);
}
fixture('instant damage cancels healing and resumes decisions', {until: 1200, events: [decision(500), decision(1000, 1), heal(1000)], configure: (s, plan) => instantCaster(s, plan, 11, 3),
  check: (u, f, q, events) => { near(f[base(0) + 4], 710); noPolyHeal(events); assert.equal(getU(u, 0, 'decisionCount'), 2); assert.equal(victimDecision(q), 1550); }});
fixture('same hit replacing Polymorph with Horror does not free the victim', {until: 1200, events: [decision(500), decision(1000, 1), heal(1000)], configure: (s, plan) => instantCaster(s, plan, 16, 4),
  check: (u, f, q, events) => { near(f[base(0) + 4], 524); noPolyHeal(events); assert.equal(getU(u, 0, 'horrorEnd'), 4000);
    assert.equal(getU(u, 0, 'decisionCount'), 1); assert.equal(victimDecision(q), 4050); }});
fixture('same-timestamp scheduled decision can act after the damage break', {until: 1000, events: [swing(1000), decision(1000), heal(1000)],
  check: (u, f, q, events) => { near(f[base(0) + 4], 855); noPolyHeal(events); assert.equal(getU(u, 0, 'decisionCount'), 1); assert.equal(victimDecision(q), 1500); }});
fixture('lethal CC-breaking damage never wakes a dead victim', {events: [decision(500), swing(1000)], configure: s => setF(s, 0, 'hp', 100),
  check: (u, f, q) => { assert.equal(getU(u, 0, 'alive'), 0); assert.equal(victimDecision(q), 5050); }});
writeFileSync(join(root, 'manifest'), manifest.join('\n'));
run(join(root, 'runner'), [join(root, 'sim.spv'), join(root, 'manifest'), fixtures[0].paths[0]], {
  env: {...process.env, ...(process.env.VK_DRIVER_FILES ? {} : existsSync('/usr/share/vulkan/icd.d/lvp_icd.json') ? {VK_DRIVER_FILES: '/usr/share/vulkan/icd.d/lvp_icd.json'} : {})},
});
function read(path, binding) {
  const b = readFileSync(join(path, `out${binding}.bin`));
  return new Uint32Array(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength));
}
for (const {name, paths, check} of fixtures) {
  const reference = read(paths[0], 10), state = read(paths[1], 1), queue = read(paths[1], 7), log = read(paths[1], 9), logF = new Float32Array(log.buffer);
  assert.equal(state[3], 0, `${name}: event budget exhausted`); assert.equal(queue[1], 0, `${name}: heap overflow`);
  assert.deepEqual(state, reference.slice(0, C.ARENA_WORDS), `${name}: prediction/live state differs`);
  assert.deepEqual(queue.slice(0, 2 + queue[0] * 6), reference.slice(C.ARENA_WORDS, C.ARENA_WORDS + 2 + queue[0] * 6), `${name}: prediction/live heap differs`);
  for (let i = 1; i < queue[0]; i++) {
    const child = 2 + i * 6, parent = 2 + Math.floor((i - 1) / 2) * 6;
    assert(queue[parent] < queue[child] || (queue[parent] === queue[child] && queue[parent + 1] <= queue[child + 1]), `${name}: retimed heap is invalid`);
  }
  const events = [];
  for (let i = Math.max(0, log[0] - 80); i < log[0]; i++) { const b = 1 + (i % 80) * 6;
    events.push({time: log[b], source: log[b + 1], target: log[b + 2], spell: log[b + 3], kind: log[b + 4], value: logF[b + 5]});
  }
  try { check(state, new Float32Array(state.buffer), queue, events); }
  catch (error) { throw Error(`${name}: ${error.message}`, {cause: error}); }
  console.log(`PASS ${name} (native GPU live/prediction parity)`);
}
console.log(`Native CC fixtures: ${fixtures.length}; artifacts: ${root}`);
