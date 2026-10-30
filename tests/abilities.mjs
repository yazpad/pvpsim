import assert from 'node:assert/strict';
import {existsSync} from 'node:fs';
import {build} from 'vite';
async function load(entry) {
  const result = await build({configFile: false, logLevel: 'silent', build: {write: false,
    lib: {entry, formats: ['es']}}});
  const code = (Array.isArray(result) ? result[0] : result).output.find(x => x.type === 'chunk').code;
  return import('data:text/javascript;base64,' + Buffer.from(code).toString('base64'));
}
const {SPELL_CATALOG, MAX_SPELLS} = await load('src/constants.ts');
const {unitCooldowns} = await load('src/cooldowns.ts');
const {visibleEffects} = await load('src/effects.ts');
assert.equal(SPELL_CATALOG.length, MAX_SPELLS);
const coil = SPELL_CATALOG[16];
assert.equal(coil.name, 'Death Coil');
assert.equal(coil.selfHealRatio, 1);
assert.equal(coil.ccType, 6);
assert(existsSync('public' + coil.icon));
const unit = {className: 'Warlock', alive: 1, auras: Array.from({length: 8}, () => ({pad: 0})),
  extraCooldowns: 1201, horrorEnd: 3010, stunEnd: 2010, silenceEnd: 0};
let cooldown = unitCooldowns(unit, 50).find(s => s.id === 16);
assert.equal(cooldown.remainingMs, 120050);
assert.equal(cooldown.fraction, 1);
assert.equal(unitCooldowns(unit, 120100).find(s => s.id === 16).remainingMs, 0);
assert.deepEqual(visibleEffects(unit, 50).map(e => e.label), ['Feared', 'Horrified']);
assert.deepEqual(visibleEffects(unit, 2500).map(e => e.label), ['Horrified']);
assert.deepEqual(visibleEffects(unit, 3010), []);
assert.equal(visibleEffects({...unit, incapacitateType: 1, horrorEnd: 0}, 50)[0].label, 'Stunned');
assert.equal(visibleEffects({...unit, incapacitateType: 4, horrorEnd: 0}, 50)[0].label, 'Feared');
assert.deepEqual(visibleEffects({...unit, alive: 0}, 50), []);
// Existing odd spell timestamps use the high half of their aura pad.
unit.auras[7].pad = 60000 << 16;
assert.equal(unitCooldowns(unit, 5999000).find(s => s.id === 15).remainingMs, 1000);
console.log('PASS extended cooldown decoding, Death Coil catalog/icon, independent horror and expiry');

const {SpellProjectiles} = await load('src/projectiles.ts');
const projectiles = new SpellProjectiles();
const positions = new Map([[0, {x: 10, y: 20}], [1, {x: 200, y: 20}]]);
const event = (id, spellName, type = 'damage', sourceId = 0, targetId = 1) =>
  ({id, spellName, type, sourceId, targetId, value: 100});
const events = [event(1, 'Frostbolt'), event(2, 'Frostbolt', 'cast_start'),
  event(3, 'Corruption'), event(4, 'Death Coil'), event(5, 'Death Coil', 'cc'),
  event(6, 'Death Coil', 'heal', 0, 0), event(7, 'Fear', 'cc')];
projectiles.update(events, positions, 0);
assert.equal(projectiles.trails.length, 3, 'Duplicate spell effects or periodic ticks spawned trails');
projectiles.update(events, positions, 0);
assert.equal(projectiles.trails.length, 3, 'Repeated snapshots replayed projectiles');
projectiles.update(events, positions, 2);
assert.equal(projectiles.trails.length, 0, 'Finished trails did not expire');
projectiles.update(Array.from({length: 200}, (_, i) => event(i + 8, 'Shadow Bolt')), positions, 0);
assert(projectiles.trails.length <= 96, 'Projectile storage grew without a bound');
projectiles.reset();
assert.equal(projectiles.trails.length, 0);
console.log('PASS cosmetic projectile deduplication, periodic/self-heal filtering, expiration and bounded storage');

for (const [id, name, classId] of [[17, 'Polymorph', 3], [18, 'Ice Barrier', 3], [19, 'Blink', 3], [20, 'Drain Life', 4]]) {
  assert.equal(SPELL_CATALOG[id].name, name);
  assert.equal(SPELL_CATALOG[id].classId, classId);
  assert(existsSync('public' + SPELL_CATALOG[id].icon));
}
assert.equal(SPELL_CATALOG[18].selfOnly, true);
assert.equal(SPELL_CATALOG[20].channelMs, 5000);
assert.equal(SPELL_CATALOG[20].selfHealRatio, 1);
const mage = {...unit, className: 'Mage', extraCooldowns2: (151 << 16) | 301};
assert.equal(unitCooldowns(mage, 100).find(s => s.id === 18).remainingMs, 30000);
assert.equal(unitCooldowns(mage, 100).find(s => s.id === 19).remainingMs, 15000);
assert(!unitCooldowns(mage, 100).some(s => s.id === 20));
assert(unitCooldowns(unit, 100).some(s => s.id === 20));
const sheep = {...unit, stunEnd: 0, horrorEnd: 0, auras: [{auraType: 8, expiresAt: 8000, spellId: 17}]};
assert.equal(visibleEffects(sheep, 100)[0].kind, 'polymorph');
assert.deepEqual(visibleEffects(sheep, 8000), []);
console.log('PASS signature spell catalog/icons, ownership, packed Barrier/Blink cooldowns and Polymorph indicator');

const {DrainLifeBeams} = await load('src/projectiles.ts');
const beams = new DrainLifeBeams();
const caster = {id: 3, alive: 1, castSpellId: 20, castEnd: 6000, auras: []};
const victim = {id: 0, alive: 1, castSpellId: 0, castEnd: 0,
  auras: [{spellId: 20, sourceId: 3, expiresAt: 6000}]};
beams.update([caster, victim], 2000, 0.1);
assert.deepEqual(beams.beams, [{sourceId: 3, targetId: 0}]);
beams.update([{...caster, castSpellId: 0}, victim], 2000, 0.1);
assert.deepEqual(beams.beams, [], 'Interrupted channel retained its beam');
beams.update([caster, {...victim, alive: 0}], 2000, 0.1);
assert.deepEqual(beams.beams, [], 'Dead victim retained its beam');
beams.update([caster, {...victim, auras: [{spellId: 20, sourceId: 4, expiresAt: 6000}]}], 2000, 0.1);
assert.deepEqual(beams.beams, [], 'Beam attached to another caster aura');
beams.update([caster, victim], 6000, 0.1);
assert.deepEqual(beams.beams, [], 'Expired channel retained its beam');
beams.reset();
assert.deepEqual(beams.beams, []);
console.log('PASS Drain Life beam source/target binding, interruption, death, expiry and reset');
