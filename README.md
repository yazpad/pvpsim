# PvP Sim 3: WebGPU N vs N RHEA Combat Simulator

A browser-based, **GPU-only** combat simulator implementing a **Rolling Horizon Evolutionary Algorithm (RHEA)** and a high-performance **Discrete Event Simulator (DES)** inspired by `~/fastsim` and `~/pvp_sim`.

## Key Architectural Decisions

1. **GPU-Only Combat Simulation (No CPU in combat loop)**:
   - All state transitions, binary min-heap event priority queues, damage formulas, mitigation, RNG generation (Xorshift32), population mutation, and rollout evaluations execute directly in WebGPU Compute Shaders (`WGSL`).
   - The CPU / browser layer only handles UI rendering and buffer coordination.

2. **Universal Shared Entity Mechanics**:
   - Every unit shares identical mechanical logic (auto-attack swing timers, global cooldowns, cast timers, aura slots, and power management).
   - Differences between classes (Warrior, Priest, Mage, Warlock) are expressed through data attributes and a uniform `SpellCatalog` rather than divergent shader code branches.

3. **Multi-Agent RHEA (Rolling Horizon Evolutionary Algorithm)**:
   - Replaces traditional deep MCTS branching in continuous simultaneous multi-unit combat.
   - Evaluates 1,024+ mutated candidate plans per frame in parallel on the GPU.
   - Elite candidate plans are shifted forward across decision horizons.

4. **DES Min-Heap on GPU**:
   - Adapted from `~/fastsim`'s 40-element binary min-heap layout, operating in thread-private memory with $O(\log K)$ operations.

## Documentation & Roadmap

- **Architecture & System Design**: [docs/ARCHITECTURE.md](file:///home/aaron-ma/pvp_sim3/docs/ARCHITECTURE.md)
- **Project TODO, Ground Rules & Priorities**: [TODO.md](file:///home/aaron-ma/pvp_sim3/TODO.md)

## Quick Start / Running

1. **Start Development Server**:
   ```sh
   npm run dev
   # or: npx vite
   ```

2. **Open in WebGPU-enabled Browser**:
   Navigate to `http://localhost:5173`.
   Click **"Search & Act (RHEA)"** to initiate continuous GPU-driven search and execution.
# pvpsim
