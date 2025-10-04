Guardrails for Agents
> **File Modification Guardrails**
> - Do not create, modify, or delete anything under any `dist/` directory.
> - Never touch: `packages/**/dist/**`, `build/**`, `out/**`.
> - Only edit files in `src/`, `scripts/`, `proto/`, `config`, or test paths.

1. Stage Awareness

Always ask: “Is this needed at this stage of development?”

Current stage is **Build** — implementing backend flow compilation, IPC contracts, and the execution runtime that powers the canvas.

Minimal backend code is acceptable only if required to make GUI elements function (e.g., menu stubs, save/load stubs).

Features like telemetry, logging, adapters, or cloud are still out of scope unless they unblock Build → Run. Focus work on the deterministic compiler, orchestrator, adapters needed for offline execution, and typed IPC bridges.

2. Need Gate

Before adding or modifying code, confirm:

Did the user explicitly ask for this?

Is it required for the current stage?

Does it align with the North Star?

Does it help achieve Build → Run → Watch flow?

If any answer is “no,” defer to a later phase.

3. Simplicity First

Keep implementations as simple and modular as possible.

Avoid premature abstractions, logging systems, telemetry, or cross-platform concerns unless explicitly requested.

Each module is self-contained with explicit ports.

4. Module Contracts

Every module has explicit input/output ports.

Port types remain stable (TEXT, JSON_BYTES, VECTOR, BLOB), but accepted schemas may vary depending on module settings (e.g., an LLM module’s schema depends on the model chosen).

Treat these schema differences as module-internal behavior, not global system changes.

5. Dynamic Behavior

Ports may stay the same, but the data structure expected at a port can change with module configuration.

Handle this by keeping port IDs stable, and documenting in the manifest how schema may vary.

6. Logging

Do not add global event logging.

Add targeted logs only when debugging a specific issue. Remove or disable after the issue is resolved.

7. Documentation

Update RoadMap.md, SCOPE.md, or TRACK.md if stage or scope changes.

Never edit NORTH_STAR.md — that file is immutable except by the project owner.

Workflow

GUI — build visible interface, palettes, modules, wiring tool, menus, buttons. ✅

Build — implement backend wiring logic, compiler, IPC contracts, and worker orchestration. **(You are here.)**

Run — execution engine + activation lights.

Debug/Safety — targeted logging, error handling, crash isolation.

Packaging — cross-platform builds.

Cloud — sync, sharing, multi-user features.

---

## Repository Breadcrumbs

Use these waypoints to jump to the right subdirectory quickly. Each location
has its own `AGENTS.md` with deeper notes.

- `/core` — Runtime, CLI, flow compiler. See `core/AGENTS.md` for build/test
  commands and layout.
- `/src` — Front-end friendly module shims used in tests and experiments.
  Start with `src/AGENTS.md`.
- `/ui` — Vite/React canvas prototype. Details in `ui/AGENTS.md`.
- `/packages` — Electron workspace packages (main, preload, renderer, IPC,
  shared libraries, adapters). Overview in `packages/AGENTS.md`.
- `/packages/main` — Flow orchestration + worker pool entry points for Build/Run IPC.
- `/packages/ipc` — Shared Zod schemas for backend channels.
- `/packages/preload` — Bridge that forwards Build/Run requests to the main process.
- `/flows` — Sample flow JSON + schema. Guidance in `flows/AGENTS.md`.
- `/tests` — Vitest suites that cover module behavior. See `tests/AGENTS.md`.
- `/tools` — Ancillary services (e.g., FAISS daemon). See `tools/AGENTS.md`.
- `/examples` — Saved canvas layouts. See `examples/AGENTS.md`.
- `/models` — Offline model manifest. Notes in `models/AGENTS.md`.
- `/scripts` — Shell helpers for dev/build. Start at `scripts/AGENTS.md`.

## Immutable Product Snapshot

- The VOIDE canvas lets users drag modules onto the workspace, wire them together to design complex data flows, and watch live activation lights for debugging stalled modules or stuck loops.

## Backend Transition Notes

- Prioritize the Build → Run loop: renderer serializes `FlowGraph` → main process invokes `@voide/core` compiler → compiled handle cached for runs.
- Keep the runtime deterministic and offline. All adapters must fall back to local mocks when heavyweight binaries are missing.
- IPC changes must land in lockstep across `packages/ipc`, `packages/main`, `packages/preload`, and the renderer store hooks.
- Extend Vitest coverage under `core/test` and integration coverage under `packages/main` whenever adding compiler passes or scheduler features.
- Document new backend behaviors alongside Flow schemas in `/flows/schema` and module manifests in `/modules` to keep UI and runtime aligned.
