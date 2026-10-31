# Native shader compilation diagnostic

The app consistently crashes Firefox while compiling `simulate_candidate`, before dispatch.
Mutation compilation succeeds. Default adapter preference and fresh shader modules do not
prevent the crash. A standalone browser diagnostic previously passed; that discrepancy
is not yet explained. Candidate counts remain 32768 / 65536.

Run outside the agent sandbox:

```bash
node scripts/export-gpu-shader.mjs
cargo install naga-cli --locked --root /tmp/pvp-naga
/tmp/pvp-naga/bin/naga /tmp/pvp-sim.wgsl /tmp/pvp-sim.spv > /tmp/pvp-naga.log 2>&1
```

Record the naga version, exit code and `/tmp/pvp-naga.log`. This exercises native WGSL
parsing, validation and SPIR-V emission without starting Firefox. The installed Naga
version may differ from Firefox's bundled version: success does not clear Firefox's
compiler. A matching assertion provides a basis for command-line shader reduction.

Browser stage evidence is in `/tmp/pvp-gpu-diagnostic.jsonl`. Use `?gpuDebug=1`
only with Vite running; each stage is acknowledged by the server before GPU work.

## Isolated trigger and workaround

Naga 30.0.1 reproduced the exact Firefox panic in SPIR-V call argument emission:
`Expression [222] is not cached!`. IR expression 222 was the dynamically indexed
pointer passed to `absorb_damage(&state.entities[tgt], ...)`.

All eight dynamic entity-pointer call sites now copy the entity into a function-local
variable, pass its pointer, then write the mutated entity back immediately. This keeps
aura, shield and crowd-control mutations while avoiding the failing pointer expression.
The full module and all five compacted entry points compile to SPIR-V, including with
ReadZeroSkipWrite bounds checks. Browser execution still requires verification.

Original reproducer: `/tmp/pvp-sim-before-fix.wgsl`.
Updated shader: export with `node scripts/export-gpu-shader.mjs`.

## Shared combat engine parity diagnostic

Start Vite and open `/diagnostics/combat-parity.html`, then click **Run parity checks**.
It compares a fixed-plan 5-second GPU prediction, a prediction cloned from midfight,
and 100 live GPU commits of 50 ms. It checks arena words and occupied event-heap
entries for exact equality, and verifies that casts, periodic events, shields and
roots actually occur. Empty roster slots are included. Predictions use a small test
entry point calling the same `advance_combat` function as `simulate_candidate`;
commits use the production `advance_live` entry point. No CPU combat reference is used.

Compile the complete shader plus diagnostic entry point natively with:

```bash
node scripts/export-gpu-shader.mjs /tmp/pvp-parity.wgsl --parity
/tmp/pvp-naga/bin/naga /tmp/pvp-parity.wgsl /tmp/pvp-parity.spv
```

Shared-engine refactor validation: `npm run build` and Naga 30.0.1 WGSL validation /
SPIR-V emission pass, including the parity entry point. Browser parity tests have
**not run** in the agent sandbox: Vite binding fails with `listen EPERM`, and browser
startup fails with `setsockopt: Operation not permitted`. Run the diagnostic in a
WebGPU-enabled browser outside that restriction before treating runtime parity as verified.

## Independent scheduling checks

`npm test` runs host scheduling regression tests using a fake GPU that deliberately
holds completion fences and `mapAsync` promises. It verifies that live stepping
continues during both delays, search state/heap/plan buffers are isolated, the full
32,768-candidate generation is evaluated before publication, readback slots stay
bounded, old snapshots cannot rewind the UI, reset cancels old generations, and
overlapping event-ring reads do not duplicate combat log entries. These tests do
not execute WGSL or establish hardware performance.

The browser parity diagnostic also checks that delayed plans skip consumed
per-unit decisions and that unaffordable actions are rejected at execution.
For actual performance, compare wall-clock elapsed time with match time at 1x
playback. Export a battle report to inspect `scheduling`: submitted live time,
plan origin, generation time, search batch time and candidate count per batch.
Short search batches should allow live steps between GPU work; a heavily loaded
or slow GPU can still fall behind. Browser timing remains unverified here.

## Plan stability telemetry

The arena shows a rolling window of up to 20 completed searches per team:

- **Plan changes**: fraction of overlapping decision genes (spell, target, range)
  changed from the previous published elite. Comparisons align per-unit decision
  counters and exclude newly appended horizon decisions and inactive units.
- **Baseline kept**: fraction of searches won by the unmutated baseline candidate.
  Ties favor the baseline, so this means no improvement at the GPU score resolution.

These reuse existing elite/result/origin readbacks: no new GPU dispatches, buffer
copies, mappings, or combat evaluations. Host work is bounded by 48 gene comparisons
per publication and a 20-entry history. History resets on match reset or state edits
and is included in battle-log exports with snapshot time and population size.
Actual hardware overhead has not been benchmarked.

Low plan change and frequent baseline retention suggest local plan persistence,
not equilibrium or low exploitability. Opponents, combat snapshots and adaptive
population sizes vary between searches; raw fitness is not a convergence curve.
The implementation uses current opposing elites rather than a historical league
archive. Testing strategic convergence would require fixed-state repeated search
and/or evaluation against held-out opponents, which adds combat rollout work.

## Death Coil and extended spell storage

Death Coil is catalog entry 16: instant, 565 mana, 30 yd, 476 base damage,
0.214 spell-power scaling, 120s cooldown, 100% damage leech and 3s horror.
The values follow Classic rather than the newer Mortal Coil ability.
Self-healing uses health damage after mitigation/absorption, excludes overkill,
respects healing reduction and maximum HP, and contributes only effective healing
 to fitness. The generic `selfHealRatio` catalog field supports other leech spells.
Horror has an independent timestamp, does not consume Fear DR or break on damage,
and interrupts casts. Fear and Horror now trigger deterministic forced wandering.

Entity base storage is now 32 words: word 28 stores the extra cooldown timestamp,
and word 29 stores horror expiry. Words 30/31 store incapacitation type and the next forced movement event timestamp. Spell entries are 17 words, with self-heal ratio
at word 16. Production and parity fixtures use the updated layouts. Mutation samples
the bound catalog length; ownership and UI ability lists include Death Coil.

`npm test` covers host scheduling, extended cooldown presentation and simultaneous
Fear/Horror indicators. Naga 30.0.1 validation and SPIR-V emission pass for the full
shader plus parity entry point. The browser parity fixture now checks Death Coil
healing, damage, horror duration, Fear DR independence, cooldown storage and prevention
of early recasts, in addition to live/prediction equivalence. That fixture has not
been executed on browser hardware in this environment.


## Fear and Horror wandering

The shared GPU engine schedules one deduplicated forced movement event chain per
fleeing unit at 500 ms intervals. Direction changes use a hash of unit ID and
absolute 750 ms time buckets, with no mutation RNG dependency or CPU combat work.
Movement uses entity speed, existing slow/root modifiers, pillar collision and arena
bounds. Hard stuns hold the unit still. Movement events do not advance plan decision
counters and stop when effects expire or break. Rendering follows authoritative
positions rather than extrapolating the selected plan during incapacitation.

The added event cost is confined to affected units (two events per second each),
plus two additional entity words. Hardware throughput impact is unmeasured. Naga
30.0.1 validates and emits SPIR-V for the complete shader and parity extension.
Browser parity fixtures cover wandering for both effects, root/stun immobility,
movement distance, plan-counter preservation, and uninterrupted/midfight/live commit
agreement. Those browser fixtures remain unexecuted in this environment.


## Signature abilities (2026-10-30)

Browser runtime verification is deferred at the user's request. Added Polymorph,
Ice Barrier, Blink and Drain Life to the shared GPU engine, catalog and UI lists.
These are simulator tuning values, not a claim of exact game-version fidelity.
Polymorph uses independent full/half/quarter/immune DR, breaks on health damage,
cancels casts and, by temporary user-requested tuning, restores full maximum health
on each one-second regeneration tick, ignoring healing reduction. Only effective
healing is logged and scored.
Ice Barrier is a self-only 60s absorb, with a 30s cooldown and 818 + 0.1 SP capacity.
Blink moves up to 20 yd toward/away from the selected enemy according to the range
gene, stops at pillars/bounds, and removes roots/hard stuns. It is subject to the
existing decision schedule and GCD, so stun escape is available when a decision
is processed, not through an independent reactive/off-GCD action track.
Drain Life pays mana at channel start, occupies the cast state for 5s, and ticks
once per second with effective health-damage leech. Range/LoS is checked on ticks;
silence, incapacitation or cast cancellation terminates subsequent ticks.

Spell ownership is explicit catalog class metadata shared with GPU and UI.
SpellDef is now 22 words; EntityState has 36 base words and 100 total words.
Extra cooldown words occupy offsets 32/33; independent Polymorph DR occupies 34/35.
Production and diagnostic spell packing use SPELL_WORDS. Added parity fixtures for
all four abilities, but those browser fixtures have not been run. Host ability and
scheduling tests, production build, and native Naga validation/SPIR-V compilation
of the complete shader plus parity extension pass.


## Polymorph log review and Drain Life beam (2026-10-30)

The supplied battle-log(5) records Polymorph completions at 45.710, 48.260 and
52.360 seconds while the target has three DR applications and a reset at 53.960s.
CC records were emitted unconditionally even when apply_cc did nothing. CC records
now require an applied effect; zero-health-damage direct events are omitted.
An additional GPU parity fixture exercises immune attempts and their event records;
browser execution remains deferred. This reporting correction does not prevent the
planner from choosing immune targets. Candidate-score analysis is still needed to
attribute that choice; the export records actions and snapshots, not rejected plans.

Drain Life now draws a green channel with animated strands and life motes moving
from victim to caster. It reads authoritative active cast and matching aura source
IDs, uses displayed unit positions, and stops on observed interruption, expiration
or death. It adds no simulation, readback or dispatch work. Host lifecycle tests pass.


## Warrior expansion rollback and research archive (2026-10-30)

At the user's request, production combat/planner/layout/UI source was restored to
pre-expansion commit `8d58c1a`. Stances, Charge, Intercept, generic 0–72 yd range
sampling and neutral opening plans are no longer active. Original opening spell
seeds and class/resource range choices are restored as a known heuristic baseline.
Entity state is 100 words, ArenaState is 2480 bytes, and SpellDef is 22 words with
21 catalog entries. Search scheduling, estimator and budget are unchanged.

The failed implementation, mechanics fixes, diagnostics and native Vulkan tests
are preserved in [warrior-stance-experiment.patch](warrior-stance-experiment.patch).
The patch is against `8d58c1a`; inspect/reproduce it in an isolated checkout of that
commit rather than applying it directly over the current research notes. It also
contains the experimental `tests/native-gpu.c`, `tests/warrior-native.mjs` and the
old `test:gpu-native` package script. The Warrior fixture remains archived; a
generic version of the Vulkan runner is now used for the CC fixes below.

The archived mechanics suite passed 39 prediction/live scenarios plus mutation
through software Vulkan. However, battle-log(6) and battle-log(7) exposed poor
combat strategy: large desired retreat distances, conflicting spell/range/stance
plans, frequent stance switches and persistent low Rage. A failed-dash walking
fix improved activation (Charge at 0.51s and Intercept at 4.11s in log(7)), but the
Warrior then activated no further ability through the 32.4s export. Mechanical
parity did not establish strategic quality. See TODO.md for the research checklist.

Polymorph, Ice Barrier, Blink, Drain Life, the Drain Life channel beam, visible
damage/healing values, log refresh at capacity, and corrected immune-CC reporting
all predate the expansion and remain intact. Browser/GPU runtime verification is
still deferred by user request; rollback checks cover host tests, production build
and native WGSL validation/SPIR-V compilation.

## Polymorph healing cancellation and CC decision resumption (2026-10-30)

Native shader reproductions established two defects: a hit exactly on a Polymorph
tick could break the effect and then heal the victim to full, and a damage break at
1.50s could leave the victim's next decision postponed until 5.05s. Expired
Polymorph slots could also be extended by subsequent damage and admit stale heals.

Damage now clears Polymorph's `next_tick_at` and only shortens an aura that was
still active. Queued generation/next-tick checks reject cancelled heals, including
same-timestamp events. Active Polymorph retains the user-requested full-HP ticks;
zero health damage from a fully absorbed hit retains existing break behavior.

After an event shortens incapacitation, the engine can decrease the timestamp of
the victim's existing decision and sift it upward in the min-heap. The decision's
otherwise-unused `generation` field records its pre-CC due time (zero means it was
not delayed by CC). This prevents an ordinary pending turn from being accelerated
by a brief CC application/break. GCD, casts, remaining CC and the existing 50ms
post-busy delay still apply. Processing occurs after all effects from the hit, so
a Death Coil that breaks Polymorph and applies Horror does not free the victim.
No extra decision is enqueued, even when the heap is full, and dead victims are
not resumed. Fear breaks use the same correction. All four damage paths use it.

`npm run test:gpu-native` now runs `tests/cc-native.mjs`: 24 scenarios execute the
production `advance_live` and diagnostic `predict_reference` entry points through
Vulkan, comparing occupied heap entries and state words with 50ms live commits.
It checks stale/exact-time/expired/old-generation heals, retained full-HP healing,
decision cadence, GCD/overlapping CC, no duplicate turns, full heaps, lethal hits,
absorbs and swing/cast/instant/periodic damage paths. It requires a C compiler,
Vulkan headers/loader/ICD and Naga (`NAGA` overrides the executable path); it uses
Lavapipe by default when installed, or the ICD selected by `VK_DRIVER_FILES`.
Host tests, production build and native WGSL validation/SPIR-V compilation pass.

The conditional queue scan is bounded by 40 entries and runs only after actual
CC shortening. State/buffer sizes, queue capacity, dispatch/readback count, search
budget, mutation and fitness formulas are unchanged. Correctly released units can
now generate legitimate combat events previously suppressed by the bug; hardware
throughput impact has not been measured. Browser execution remains deferred.


## Mobility restoration (2026-10-30)

Charge and Intercept are active again, without restoring the archived stance/range
search. See [WARRIOR_MOBILITY.md](../docs/WARRIOR_MOBILITY.md) for the current layouts,
mechanics, test command and remaining fidelity/runtime limits. Historical layout
counts and rollback descriptions above describe their respective revisions.
