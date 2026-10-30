import { SPELL_CATALOG } from './constants';
import type { EntityModel } from './simulator';

export interface VisibleEffect {
  label: string;
  detail: string;
  color: string;
  expiresAt: number;
  kind: 'fear' | 'horror' | 'stun' | 'root' | 'slow' | 'silence' | 'polymorph';
}

// The current GPU shares one timer for stun/fear. Only name a specific type
// when the catalog makes it unambiguous; never guess from combat-log timing.
const incapacitateTypes = new Set(SPELL_CATALOG.filter(s => s.ccType === 1 || s.ccType === 4).map(s => s.ccType));

export function visibleEffects(unit: EntityModel, now: number): VisibleEffect[] {
  if (!unit.alive) return [];
  const effects: VisibleEffect[] = [];
  if (unit.stunEnd > now) {
    const fear = unit.incapacitateType === 4 || (!unit.incapacitateType && incapacitateTypes.size === 1 && incapacitateTypes.has(4));
    const stun = unit.incapacitateType === 1 || (!unit.incapacitateType && incapacitateTypes.size === 1 && incapacitateTypes.has(1));
    effects.push({kind: fear ? 'fear' : 'stun', label: fear ? 'Feared' : stun ? 'Stunned' : 'Incapacitated',
      detail: fear ? 'Fleeing uncontrollably · unable to act' : 'Unable to move or act', color: fear ? '#c084fc' : '#fbbf24', expiresAt: unit.stunEnd});
  }
  if ((unit.horrorEnd ?? 0) > now) effects.push({kind: 'horror', label: 'Horrified',
    detail: 'Death Coil · fleeing uncontrollably · unable to act', color: '#a3e635', expiresAt: unit.horrorEnd!});
  if (unit.silenceEnd > now) effects.push({kind: 'silence', label: 'Silenced',
    detail: 'Spellcasting locked', color: '#f9a8d4', expiresAt: unit.silenceEnd});
  for (const aura of unit.auras) {
    if (aura.auraType === 8 && aura.expiresAt > now) {
      effects.push({kind: 'polymorph', label: 'Polymorphed', detail: 'Unable to move or act · regenerating health · damage breaks effect', color: '#f0abfc', expiresAt: aura.expiresAt});
    }
    if (aura.expiresAt <= now || (aura.auraType !== 5 && aura.auraType !== 6)) continue;
    const spell = SPELL_CATALOG[aura.spellId];
    const root = aura.auraType === 6;
    effects.push({kind: root ? 'root' : 'slow', label: root ? 'Rooted' : 'Slowed',
      detail: `${spell?.name ?? 'Movement effect'} · ${root ? 'Unable to move' : 'Movement reduced 50%'}`,
      color: root ? '#67e8f9' : '#93c5fd', expiresAt: aura.expiresAt});
  }
  return effects;
}
