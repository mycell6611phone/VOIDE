# VOIDE Project Handoff

- Target commit: `a5cffa3f9614eba9331256e55ef36ee2893c3e39`

## Build & Run

- **Node toolchain**: Repo targets Node.js ≥20.11 and pnpm 9; install dependencies with `pnpm install` at the workspace root.【F:package.json†L7-L38】
- **Turbo/pnpm scripts**:
  - `pnpm build` ⇒ `turbo run build` for all packages.【F:package.json†L11-L19】
  - `pnpm dev` ⇒ prebuild + parallel dev servers + Electron shell; requires renderer bundle readiness via `wait-on`.【F:package.json†L11-L19】
  - `pnpm test` runs IPC/core/main unit suites then exercises CLI `validate` + `pack` flows.【F:package.json†L11-L19】
  - Package-specific tasks: `pnpm --filter @voide/renderer dev` (canvas) and similar filters per package.【F:packages/renderer/AGENTS.md†L13-L18】【F:packages/AGENTS.md†L18-L24】
- **Core runtime workflows**:
  - `pnpm --filter @voide/core build|test|proto:gen` manage compiler/runtime builds and protobuf bindings.【F:core/AGENTS.md†L24-L27】
  - Root `proto:gen` script wraps `protoc` to refresh `packages/shared/src/gen` from `proto/flow.proto`; run after editing protobufs.【F:package.json†L18-L19】
- **CLI usage**:
  - `pnpm voide validate <flow.json>` parses JSON via `parseFlow` (zod schema).【F:core/src/cli.ts†L73-L102】【F:core/src/flow/schema.ts†L1-L34】
  - `pnpm voide pack <flow.json> -o <out>` compiles to `pb.Flow` binary using `compile` and writes `.flow.pb`.【F:core/src/cli.ts†L79-L115】【F:core/src/build/compiler.ts†L10-L57】
  - `pnpm voide run <flow.pb>` streams telemetry while executing `runFlow` atop the registered built-in nodes.【F:core/src/cli.ts†L29-L70】【F:core/src/run/index.ts†L1-L20】【F:core/src/nodes/builtins.ts†L55-L169】
- **Environment variables in use**:
  - Renderer bootstrap toggles `VITE_DEV_SERVER_URL`, `VITE_RENDERER_PORT`, `NODE_ENV`, `VOIDE_FREE`, `VOIDE_ENABLE_CUDA` and disables GPU when CUDA is off.【F:packages/main/src/main.ts†L12-L55】
  - SQLite and model directories resolve via `HOME`/`USERPROFILE`; secrets/db paths land under `~/.voide`.【F:packages/main/src/services/db.ts†L11-L14】【F:packages/main/src/services/models.ts†L34-L41】
  - Model tooling and adapters also rely on `HOME`/`USERPROFILE` and optional `LLAMA_BIN` overrides for llama.cpp runners.【F:packages/models/src/modelManager.ts†L26-L29】【F:packages/adapters/src/llamaCpp.ts†L15-L28】

## UI ↔ Engine Integration Points

- `ipcClient.validateFlow(flow)` validates the current canvas envelope against IPC `flowValidate` before build/run.【F:packages/renderer/src/lib/ipcClient.ts†L43-L45】
- `ipcClient.runFlow(flow, inputs?)` forwards the assembled flow and optional runtime inputs to the executor channel exposed by the preload bridge.【F:packages/renderer/src/lib/ipcClient.ts†L43-L52】
- `ipcClient.onTelemetry(cb)` subscribes renderer listeners to runtime telemetry frames.【F:packages/renderer/src/lib/ipcClient.ts†L47-L53】
- `MainWorkspace.handleRun` (exported via `App.tsx`) wires the Run button to `ipcClient.runFlow` after optional chat drafting.【F:packages/renderer/src/App.tsx†L38-L47】
- `PropertiesPanel` exposes a `Validate` button that dispatches `ipcClient.validateFlow` and surfaces the result.【F:packages/renderer/src/components/PropertiesPanel.tsx†L6-L26】
- TODO: Build trigger currently logs to the console instead of calling a compiler IPC endpoint.【F:packages/renderer/src/components/RunControls.tsx†L72-L115】

## Module Palette

- **UI** — in: `feedback` (TEXT); out: `conversation` (TEXT).【F:packages/renderer/src/components/Palette.tsx†L22-L30】
- **LLM** — in: `prompt` (TEXT); out: `response` (TEXT).【F:packages/renderer/src/components/Palette.tsx†L31-L38】
- **Prompt** — in: —; out: `prompt` (TEXT).【F:packages/renderer/src/components/Palette.tsx†L39-L45】
- **Debate/Loop** — in: `input` (TEXT); out: `result` (TEXT).【F:packages/renderer/src/components/Palette.tsx†L47-L53】
- **Cache** — in: `in` (TEXT/JSON); out: `out` (TEXT/JSON).【F:packages/renderer/src/components/Palette.tsx†L55-L61】
- **Log** — in: `entry` (TEXT/JSON); out: —.【F:packages/renderer/src/components/Palette.tsx†L63-L69】
- **Memory** — in: `store` (TEXT/JSON); out: `recall` (TEXT/JSON).【F:packages/renderer/src/components/Palette.tsx†L71-L77】
- **Divider** — in: `in` (TEXT/JSON); out: `pathA`, `pathB` (TEXT/JSON).【F:packages/renderer/src/components/Palette.tsx†L79-L88】
- **Tool Call** — in: `input` (TEXT/JSON); out: `result` (TEXT/JSON).【F:packages/renderer/src/components/Palette.tsx†L90-L96】
- **Tooling** — Wiring tool toggles canvas connection mode.【F:packages/renderer/src/components/Palette.tsx†L100-L105】

## Protobuf Workflow

- Schemas live in `proto/flow.proto`, defining canonical payloads (`Text`, `Json`, `Embedding`) and the `FlowDef` structure exchanged across build/run stages.【F:proto/flow.proto†L1-L38】
- Renderer serializes the canvas into a `FlowEnvelope`; `compile` validates port compatibility then emits a deterministic `pb.Flow` binary (`Flow.encode(...).finish()`).【F:core/src/flow/schema.ts†L1-L34】【F:core/src/build/compiler.ts†L10-L57】
- CLI `pack` consumes human-edited `.flow.json`, calls `compile`, and saves `.flow.pb`; the Electron main process should mirror this to keep “protobuf-only” runtime parity.【F:core/src/cli.ts†L79-L115】【F:core/AGENTS.md†L12-L15】
- Execution uses `runFlow` to load the compiled protobuf, register built-in nodes, and orchestrate telemetry-driven async execution, matching both CLI and renderer expectations.【F:core/src/run/index.ts†L1-L20】【F:core/src/nodes/builtins.ts†L55-L169】

## Non-negotiables

- Canvas must stay fully accessible: modules always visible, labels persistent, activation lights indicate flow without relying solely on color.【F:Description.txt†L14-L36】【F:Description.txt†L120-L133】
- Build may warn but never blocks wiring—schemas coerce rather than reject; user creativity takes priority.【F:Description.txt†L5-L13】【F:Description.txt†L88-L95】
- Control bar requires Build/Play/Pause/Stop affordances for the GUI stage.【F:Description.txt†L38-L44】
- Runtime must remain offline-first with protobuf artifacts as the single source for execution (no ad-hoc JSON at run time).【F:core/AGENTS.md†L12-L15】【F:Agents.md†L3-L34】

## Current State Snapshot

- **UI module** — Canvas node stubbed in mock layout; no runtime handler yet ⇒ *in-progress*.【F:packages/renderer/src/components/Palette.tsx†L22-L30】【F:packages/renderer/src/constants/mockLayout.ts†L5-L20】
- **LLM module** — Palette + dynamic labeling and runtime executor exist (stub provider only) ⇒ *in-progress*.【F:packages/renderer/src/components/Palette.tsx†L31-L38】【F:src/modules/llm/index.ts†L19-L38】【F:core/src/nodes/builtins.ts†L55-L76】
- **Prompt module** — UI node, context menu, and runtime prompt injection wired ⇒ *done*.【F:packages/renderer/src/components/Palette.tsx†L39-L45】【F:src/modules/prompt/index.ts†L1-L13】【F:core/src/nodes/builtins.ts†L34-L45】
- **Debate module** — Palette + runtime skeleton awaiting LLM hook (`llmRequest` placeholder) ⇒ *in-progress*.【F:packages/renderer/src/components/Palette.tsx†L47-L53】【F:src/modules/debate/runtime.ts†L12-L84】
- **Cache module** — Palette entry only; no registered runtime node ⇒ *blocked (TODO runtime)*.【F:packages/renderer/src/components/Palette.tsx†L55-L61】【F:core/src/nodes/builtins.ts†L161-L169】
- **Log module** — Palette entry with active runtime pass-through logger ⇒ *done*.【F:packages/renderer/src/components/Palette.tsx†L63-L69】【F:core/src/nodes/builtins.ts†L139-L147】
- **Memory module** — Palette entry plus storage helper (`MemoryDB`) but no node registration ⇒ *in-progress*.【F:packages/renderer/src/components/Palette.tsx†L71-L77】【F:core/src/modules/memory.ts†L1-L23】【F:core/src/nodes/builtins.ts†L161-L169】
- **Divider module** — Palette entry backed by `RouterDividerNode` validator ⇒ *done*.【F:packages/renderer/src/components/Palette.tsx†L79-L88】【F:core/src/nodes/builtins.ts†L96-L114】
- **Tool Call module** — Palette entry plus parser/handler helpers, integration TBD ⇒ *in-progress*.【F:packages/renderer/src/components/Palette.tsx†L90-L96】【F:core/src/modules/toolcall.ts†L1-L28】
- **Wiring tool** — Palette toggle works for connection mode; additional tools pending ⇒ *done for basic linking*.【F:packages/renderer/src/components/Palette.tsx†L100-L105】

## Glossary

- **UI module** — Chat entry/exit shim representing user interface touchpoints on the canvas.【F:packages/renderer/src/components/Palette.tsx†L22-L30】
- **LLM module** — Large-language-model node turning prompts into completions, labeled by selected model.【F:packages/renderer/src/components/Palette.tsx†L31-L38】【F:src/modules/llm/index.ts†L19-L38】
- **Prompt module** — Injects prepared instruction text into downstream LLM inputs.【F:packages/renderer/src/components/Palette.tsx†L39-L45】【F:core/src/nodes/builtins.ts†L34-L45】
- **Debate/Loop module** — Runs configurable multi-pass critique loops using LLM calls and optional iteration metadata.【F:packages/renderer/src/components/Palette.tsx†L47-L53】【F:src/modules/debate/runtime.ts†L42-L84】
- **Cache module** — Intended to reuse previous outputs by keying TEXT/JSON payloads (runtime TBD).【F:packages/renderer/src/components/Palette.tsx†L55-L61】
- **Log module** — Copies payloads to telemetry/log sinks without mutating the stream.【F:packages/renderer/src/components/Palette.tsx†L63-L69】【F:core/src/nodes/builtins.ts†L139-L147】
- **Memory module** — Persists and retrieves conversation context across runs via local SQLite/FTS backing.【F:packages/renderer/src/components/Palette.tsx†L71-L77】【F:core/src/modules/memory.ts†L1-L23】
- **Divider module** — Routes inputs into labelled branches for conditional flows.【F:packages/renderer/src/components/Palette.tsx†L79-L88】【F:core/src/nodes/builtins.ts†L96-L114】
- **Tool Call module** — Parses tool-call directives and dispatches to registered handlers for structured side effects.【F:packages/renderer/src/components/Palette.tsx†L90-L96】【F:core/src/modules/toolcall.ts†L11-L24】
- **Wiring tool** — Canvas mode that enables drawing edges between module ports.【F:packages/renderer/src/components/Palette.tsx†L100-L105】

