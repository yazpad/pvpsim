import { SPELL_CATALOG } from './constants';
import type { EntityModel } from './simulator';

const classIds: Record<string, number> = {Warrior: 1, Priest: 2, Mage: 3, Warlock: 4};

export function unitCooldowns(unit: EntityModel, now: number) {
  return SPELL_CATALOG.filter(s => s.id > 0 && s.classId === classIds[unit.className]).map(spell => {
    const id = spell.id;
    // Each aura pad holds two unsigned 16-bit timestamps in 100 ms units.
    const packed = id >= 20 ? unit.extraCooldowns3 ?? 0 : id >= 18 ? unit.extraCooldowns2 ?? 0 : id >= 16 ? unit.extraCooldowns ?? 0 : unit.auras[id >>> 1]?.pad ?? 0;
    const endsAt = ((packed >>> ((id & 1) * 16)) & 0xffff) * 100;
    const remainingMs = Math.max(0, endsAt - now);
    return {id, spell, remainingMs,
      fraction: spell.cooldownMs > 0 ? Math.min(1, remainingMs / spell.cooldownMs) : 0};
  });
}
