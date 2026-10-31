# Charge and Intercept restoration

This restores mobility within the existing planner. It does not restore the failed
stance search, expanded range sampling, or rage loss on stance changes. Both spells
are available to the Warrior without stance requirements, matching the current
stance-free simulator. This is a deliberate fidelity limit, not full Classic stance
implementation. Search genes, movement range sampling, opening plans, fitness and
search budget are unchanged.

## Mechanics

- Charge: 8–25 yd, 15s cooldown, out of combat, generates 15 rage, 1s stun.
- Intercept: 8–25 yd, 30s cooldown, costs 10 rage, 65 base physical damage, 3s stun.
- Eligibility is evaluated before ordinary movement. Only an accepted dash replaces
  walking. An invalid attempt still executes the plan's independent range intent;
  walking into range cannot activate the rejected spell in the same decision.
- Transit follows a straight segment to 3 yd from the target's launch position at
  42 yd/s. The whole segment must clear pillars inflated by the unit radius and
  stay inside arena bounds. Speed and snapshot destination are simulator
  approximations; exact Forever transit behavior has not been validated.
- Costs, cooldowns and Charge rage apply at launch. Damage/stun apply at arrival,
  only if the target is alive, in melee range and visible. Blink can evade impact.
  Death, root or incapacitation cancels transit without refunding activation.
- Transit position is calculated from absolute timestamps before each combat
  event and at commit boundaries. Live execution and prediction use the same
  function. The renderer follows authoritative transit positions rather than
  extrapolating the walking plan during a dash.
- Hostile spell activations, hits and ticks maintain a five-second combat timer;
  healing a combatant also enters combat. This is a simplified combat flag.
- Controlled stuns have independent timers and DR from Fear and Horror. The
  simulator uses full/half/quarter/immune with a 15s reset for controlled stuns;
  exact Forever Charge/Intercept DR categories still need verification.

Rank values checked against the client-derived [Classic/Forever Warrior spellbook](https://www.60.tools/spellbook/warrior)
(Charge rank 3, spell 11578; Intercept rank 3, spell 20617). The archived experiment
used 100 Intercept damage; this restoration uses the listed 65.

## Validation

`npm test` checks host scheduling, cooldown decoding, ownership, icons and status
indicators. `npm run build` typechecks and builds the application.
`npm run test:gpu-native` validates/compiles the complete WGSL module with Naga and
runs production combat through native Vulkan. Each scenario compares one full
prediction with 50ms live commits, including arena words and occupied event heap.

Mobility cases cover pre-impact positions, impact timing, resources/cooldowns,
minimum/maximum range, blocked and grazing pillar paths, rejected approach/retreat,
roots/stuns, GCD, insufficient rage, continued walking, subsequent melee abilities,
Fear/stun DR independence, midflight snapshot continuation, cancellation, Blink
evasion and Blink stun escape. Existing CC-break regressions remain in the suite.

Validation completed: host tests and production build pass; Naga 30.0.1 compilation
and all 55 native scenarios pass (110 live/prediction executions on llvmpipe).

These are fixed-plan mechanics tests on software Vulkan. They do not establish
browser rendering quality, hardware throughput, or planner win rate. A fresh
browser match/export is still needed to assess selected plans in actual play.

## Layout

SpellDef: 26 words; EntityState: 47 base words plus 64 aura words (111 total);
ArenaState: 2744 bytes. Spell IDs 21/22 are Charge/Intercept. Charge uses the high
half of extraCooldowns3; Intercept uses the low half of extraCooldowns4. Host,
shader and diagnostic fixtures share the updated layouts.
