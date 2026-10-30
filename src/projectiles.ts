import { SPELL_CATALOG, type CombatLogEntry } from './constants';

type Point = {x: number; y: number};
type Trail = {from: Point; to: Point; targetId: number; color: string; age: number; duration: number};
const spellsByName = new Map(SPELL_CATALOG.map(spell => [spell.name, spell]));
const colors: Record<number, string> = {
  5: '#fde68a', 6: '#86efac', 7: '#fef08a', 8: '#c084fc', 9: '#e879f9',
  10: '#7dd3fc', 11: '#fb923c', 13: '#c084fc', 14: '#a78bfa', 15: '#e879f9', 16: '#a3e635',
};

// Cosmetic trails consume existing logs; they never schedule or alter combat.
export class SpellProjectiles {
  public trails: Trail[] = [];
  private lastEventId = 0;

  public reset() { this.trails = []; this.lastEventId = 0; }

  public update(events: CombatLogEntry[], positions: Map<number, Point>, deltaSeconds: number) {
    for (const trail of this.trails) trail.age += deltaSeconds;
    this.trails = this.trails.filter(trail => trail.age < trail.duration + 0.14);
    // Only inspect the new suffix, even once the combat log reaches capacity.
    const fresh: CombatLogEntry[] = [];
    for (let i = events.length - 1; i >= 0 && events[i].id > this.lastEventId; i--) {
      if (fresh.length < 64) fresh.push(events[i]);
    }
    this.lastEventId = events.at(-1)?.id ?? this.lastEventId;
    for (const event of fresh.reverse()) {
      const spell = event.spellName ? spellsByName.get(event.spellName) : undefined;
      if (!spell || spell.rangeYards <= 5 || spell.isDot || spell.ccType === 5 || event.targetId === undefined || event.sourceId === event.targetId) continue;
      // Direct spell resolution only: no auto-attacks, cast starts, recurring ticks,
      // or duplicate control/healing events accompanying a damaging spell.
      const damaging = spell.baseDamageMin > 0 && !spell.isHeal;
      const expected = spell.isHeal ? 'heal' : damaging ? 'damage' : 'cc';
      if (event.type !== expected) continue;
      const from = positions.get(event.sourceId), to = positions.get(event.targetId);
      if (!from || !to) continue;
      const distance = Math.hypot(to.x - from.x, to.y - from.y);
      this.trails.push({from: {...from}, to: {...to}, targetId: event.targetId,
        color: colors[spell.id] ?? '#c4b5fd', age: 0, duration: Math.max(0.22, Math.min(0.65, distance / 850))});
    }
    if (this.trails.length > 96) this.trails.splice(0, this.trails.length - 96);
  }

  public draw(ctx: CanvasRenderingContext2D, positions: Map<number, Point>, tokenRadius: number) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const trail of this.trails) {
      const end = positions.get(trail.targetId) ?? trail.to;
      const t = Math.min(1, trail.age / trail.duration);
      const x = trail.from.x + (end.x - trail.from.x) * t;
      const y = trail.from.y + (end.y - trail.from.y) * t;
      ctx.strokeStyle = trail.color;
      ctx.fillStyle = trail.color;
      if (t < 1) {
        const tail = Math.max(0, t - 0.15);
        ctx.globalAlpha = 0.65;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(trail.from.x + (end.x - trail.from.x) * tail, trail.from.y + (end.y - trail.from.y) * tail);
        ctx.lineTo(x, y);
        ctx.stroke();
        ctx.globalAlpha = 0.18;
        ctx.beginPath(); ctx.arc(x, y, 10, 0, Math.PI * 2); ctx.fill();
        ctx.globalAlpha = 0.95;
        ctx.beginPath(); ctx.arc(x, y, 3.5, 0, Math.PI * 2); ctx.fill();
      } else {
        const fade = (trail.age - trail.duration) / 0.14;
        ctx.globalAlpha = Math.max(0, (1 - fade) * 0.7);
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(x, y, tokenRadius + 4 + fade * 12, 0, Math.PI * 2); ctx.stroke();
      }
    }
    ctx.restore();
  }
}

// Channels follow authoritative cast/aura state, including cancellation and death.
// They do not infer a five-second animation from a possibly delayed combat log.
type ChannelUnit = {
  id: number; alive: number; castSpellId: number; castEnd: number;
  auras: {spellId: number; sourceId: number; expiresAt: number}[];
};
export class DrainLifeBeams {
  public beams: {sourceId: number; targetId: number}[] = [];
  private phase = 0;

  public reset() { this.beams = []; this.phase = 0; }

  public update(units: ChannelUnit[], now: number, deltaSeconds: number) {
    this.phase = (this.phase + deltaSeconds) % 100;
    this.beams = [];
    for (const caster of units) {
      const spell = SPELL_CATALOG[caster.castSpellId];
      if (!caster.alive || !spell?.channelMs || !spell.selfHealRatio || caster.castEnd <= now) continue;
      const target = units.find(unit => unit.alive && unit.auras.some(aura =>
        aura.spellId === spell.id && aura.sourceId === caster.id && aura.expiresAt > now));
      if (target) this.beams.push({sourceId: caster.id, targetId: target.id});
    }
  }

  public draw(ctx: CanvasRenderingContext2D, positions: Map<number, Point>, tokenRadius: number) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const beam of this.beams) {
      const caster = positions.get(beam.sourceId), victim = positions.get(beam.targetId);
      if (!caster || !victim) continue;
      const dx = caster.x - victim.x, dy = caster.y - victim.y;
      const length = Math.max(1, Math.hypot(dx, dy));
      const point = (t: number, strand = 0) => {
        const wave = Math.sin(t * Math.PI) * Math.sin(t * 18 - this.phase * 9 + strand * Math.PI) * 5;
        return {x: victim.x + dx * t - dy / length * wave,
          y: victim.y + dy * t + dx / length * wave};
      };
      // A broad glow and two fine strands connect the moving unit positions.
      for (const [width, alpha] of [[10, 0.10], [4, 0.28], [1.5, 0.85]]) {
        ctx.lineWidth = width; ctx.globalAlpha = alpha; ctx.strokeStyle = '#86ef6b';
        for (let strand = 0; strand < 2; strand++) {
          ctx.beginPath(); ctx.moveTo(victim.x, victim.y);
          for (let i = 1; i <= 24; i++) { const p = point(i / 24, strand); ctx.lineTo(p.x, p.y); }
          ctx.stroke();
        }
      }
      // Life motes travel from the victim into the caster.
      ctx.fillStyle = '#d9f99d'; ctx.globalAlpha = 0.9;
      for (let i = 0; i < 7; i++) {
        const t = (this.phase * 0.8 + i / 7) % 1, p = point(t);
        ctx.beginPath(); ctx.arc(p.x, p.y, 2 + Math.sin(t * Math.PI), 0, Math.PI * 2); ctx.fill();
      }
      ctx.strokeStyle = '#a3e635'; ctx.lineWidth = 2; ctx.globalAlpha = 0.45;
      ctx.beginPath(); ctx.arc(caster.x, caster.y, tokenRadius + 4 + Math.sin(this.phase * 7) * 2, 0, Math.PI * 2); ctx.stroke();
    }
    ctx.restore();
  }
}
