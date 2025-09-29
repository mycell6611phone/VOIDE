# VOIDE Backend Handoff

## Monorepo at a glance
- **Workspace manager:** pnpm with Node.js ≥ 20.11 (`package.json` sets the engine and lists Turbo-based scripts).
- **Top-level workspaces:** `packages/*` and `core` (runtime + CLI) as declared in `package.json`.
- **Front-end shims:** Lightweight module manifests live in `src/modules` to keep canvas experiments unblocked.
- **Reference assets:** JSON flow fixtures live in `flows/`, while `packages/shared` exposes TypeScript types used by both renderer and runtime.

## Root package scripts
| Script | Description |
| --- | --- |
| `pnpm build` | Runs `turbo run build` across the workspace. |
| `pnpm dev` | Builds once, then runs all package `dev` scripts in parallel alongside Electron (`wait-on` ensures main/preload bundles exist). |
| `pnpm lint` | Delegates to `turbo run lint`. |
| `pnpm start` | Boots Electron against the built main bundle. |
| `pnpm pack:linux` | Builds Linux `deb` and `AppImage` artefacts through `electron-builder`. |
| `pnpm test` | Aggregates IPC, core, and main package tests, then exercises the CLI `validate` and `pack` flows against `flows/sample-basic.flow.json`. |
| `pnpm proto:gen` | Regenerates protobuf TypeScript bindings (`ts-proto`) from `proto/flow.proto`. |
| `pnpm license:check` | Audits workspace dependencies for approved licenses. |

## Key packages
- **`core`** – houses flow parsing (`core/src/flow/schema.ts`), validation (`core/src/build/validate.ts`), compilation to protobuf (`core/src/build/compiler.ts`), and the CLI/runtime (`core/src/cli.ts`, `core/src/run`).
- **`packages/renderer`** – ReactFlow-based canvas (`components/GraphCanvas.tsx`) backed by Zustand state stores (`state/flowStore.ts`, `state/chatStore.ts`).
- **`packages/shared`** – shared Flow/Node/Edge TypeScript contracts (`src/types.ts`) and generated protobuf bindings.
- **`packages/main`, `packages/preload`, `packages/ipc`** – Electron process layers and typed IPC bridges (see respective `AGENTS.md` for scope when extending).

## Flow graph data model
- **Canonical types:** `packages/shared/src/types.ts` defines `FlowDef`, `NodeDef`, `EdgeDef`, and `PortDef` for renderer/runtime parity.
- **Parser:** `core/src/flow/schema.ts` uses Zod to parse JSON into a `FlowEnvelope` (fields `id`, `version`, `nodes`, `edges`, optional `name`, default-empty arrays for ports, passthrough for custom params).
- **Compiler:** `core/src/build/compiler.ts` enforces topology (via `validateCanvas`) and emits the protobuf payload expected by the runtime. Edge types are inferred by intersecting the source/target port `types` arrays.
- **Runtime types:** `core/src/runtime/types.ts` registers codecs for `UserText`, `PromptText`, `LLMText`, and `AnyBlob` plus any `ext:` prefixed blobs.
- **Sample flows:** `flows/sample-basic.flow.json` mirrors the minimal Input→Prompt→LLM→Output pipeline; `flows/sample-self-debate.flow.json` demonstrates richer metadata blocks (`prompts`, `models`, `profiles`).

## Module inventory
### Runtime node handlers (`core/src/nodes/builtins.ts`)
| Kind | Inputs | Outputs | Notes |
| --- | --- | --- | --- |
| `InputNode` | — | `text: UserText` | Reads `context.inputs[config.id]`; config id defaults to the node id. |
| `PromptNode` | `text: UserText` | `prompt: PromptText` | Renders a hard-coded `"{{text}}"` template and HTML-escapes dangerous characters. |
| `LLMNode` | `prompt: PromptText` | `text: LLMText` | Delegates to the provider keyed by `config.model`; missing providers throw.
| `BranchNode` | `text: LLMText` | `pass: LLMText`, `fail: LLMText` | Routes by substring match (`config.condition`). |
| `RouterDividerNode` | `text: UserText` | `valid: LLMText`, `invalid: LLMText` | Uses an FTS5-backed schema check to gate bullet-prefixed strings. |
| `BulletListNormalizerNode` | `text: LLMText` | `text: LLMText` | Normalizes arbitrary lines into `- ` bullet items. |
| `LogNode` | `value: AnyBlob` | `value: AnyBlob` | Forwards data after invoking `context.log`. |
| `OutputNode` | `text: LLMText` | — | Stores `context.outputs[config.name]` for CLI retrieval. |

### Front-end module definitions (`src/modules`)
- **LLM module (`src/modules/llm/index.ts`)** – Declares one `prompt` input (type `PromptMsg`) and one `completion` output (`string`). `getLabel` maps `config.model_id` → display label or falls back to `LLM`.
- **Prompt module (`src/modules/prompt`)** – `PromptModuleNode.tsx` renders a single in/out node with contextual menu. Config bytes encode `{ text, to }` JSON; `promptConfigFromBytes` defaults gracefully and allows passthrough extras.
- **Debate module (`src/modules/debate`)** – Proto-compatible config serializer (`debateConfigToBytes`) plus `executeDebate` runtime helper that sequences `llmRequest` calls depending on `DebateFormat`. Iterative loops set `meta.next_module` and increment `meta.round` to guide downstream modules.

These UI modules are registered via `registerPromptModule`, `registerDebateModule`, etc., letting experiments hook into the canvas without full runtime integration yet.

## Canvas integration points
- **GraphCanvas (`packages/renderer/src/components/GraphCanvas.tsx`)** wires ReactFlow to `FlowDef` data. It:
  - Translates `NodeDef`/`EdgeDef` records into ReactFlow nodes/edges, preserving stored positions under the `__position` param key.
  - Tracks context window state for node menus and clamps geometry using `CanvasBoundaryProvider` helpers.
  - Owns edge and node edit menus, delegating clipboard operations to the flow store.
- **BasicNode (`components/nodes/BasicNode.tsx`)** renders generic modules: it deduces module category from `params.moduleKey`/labels, spawns the contextual options window (`ModuleOptionsContent`), and exposes orientation toggles via `__ioOrientation`.
- **LLMNode (`components/nodes/LLMNode.tsx`)** provides the pill-shaped LLM renderer, embeds the same edit menu contract, aligns configuration overlays with the canvas bounds, and resolves labels through `deriveLLMDisplayName` against `models.json`.
- **ModuleOptionsContent** centralizes contextual option UIs for prompt/debate/log/cache/interface/memory/tool categories, emitting immutable `ParamsUpdater` callbacks consumed by BasicNode.
- **Flow store (`state/flowStore.ts`)** persists the working graph, node positions, clipboard state, and catalog metadata. Helpers handle copy/cut/paste offsets, auto-sync LLM node names with model metadata, and expose `setFlow`/`updateNodeParams` used throughout the renderer.

## Validation & build pipeline
- **Validation guards (`core/src/build/validate.ts`):**
  - `validateMenus` ensures nodes declare `in`/`out` arrays.
  - `validateDangling` verifies every edge endpoint references an existing node/port.
  - `validateTypes` enforces at least one compatible type across each connected port pair.
  - `validateAcyclic` performs DFS-based cycle detection.
  - `validateReachableOutputs` ensures non-sink outputs are consumed somewhere in the graph.
- **Compiler (`core/src/build/compiler.ts`):** converts a validated `FlowEnvelope` into `pb.Flow`, injecting `paramsJson` payloads and annotating edges with resolved type identifiers.
- **Schema alignment:** `flows/schema/flow.schema.json` remains the JSON source of truth for flow documents and should stay in sync with the Zod schema and `spec/graph.schema.json` in this handoff.

## Runtime executor contract (overview)
- **Entry point:** `runFlow` (`core/src/run/index.ts`) registers builtin nodes, instantiates a `Scheduler`, and delegates to `orchestrate` with a fresh `runId`.
- **Event stream:** `orchestrate` (`core/src/run/orchestrator.ts`) yields `TelemetryEvent`s (`node_state`, `edge_transfer`, `normalize`, `error`) while executing nodes in topological order. Edge mailboxes buffer payloads until all downstream ports have data.
- **Config hydration:** `nodeConfig` currently hydrates builtin nodes from static defaults (e.g., `InputNode` config id := node id, `OutputNode` name := node id). Runtime inputs come from `RunnerContext.inputs`, populated via CLI `--input key=value` flags.
- **Execution guards:** Each node `execute` call is wrapped with a 5s timeout (`withTimeout`) and zero retry budget; failures emit both `node_state:error` and `error` telemetry before surfacing the thrown exception.
- **Outputs:** When traversal completes, `orchestrate` returns `{ outputs: ctx.outputs }`, which the CLI prints after a `DONE` banner.

## CLI & testing
- **CLI commands (`core/src/cli.ts`):**
  - `voide validate <flow>` – parses JSON via Zod and echoes the normalized structure.
  - `voide pack <flow> --out <file>` – compiles to protobuf (`.flow.pb`).
  - `voide run <compiled> [--input id=value] [--provider stub]` – streams telemetry while executing a compiled flow with registered providers (default `StubProvider`).
- **Stub provider (`StubProvider`)** echoes prompts or renders bullet lists when asked, enabling deterministic smoke tests without external LLMs.
- **Unit tests:** `core/test/*.spec.ts` cover flow parsing, validation, module behavior, compilation, and runtime scheduling. Add new runtime functionality alongside matching Vitest coverage.

## Reference assets & smoke test
- **Renderer mock layout:** `packages/renderer/src/constants/mockLayout.ts` seeds new canvases with a UI→Prompt→LLM→Memory loop and populates `params.__position` for layout persistence.
- **New smoke flow:** `flows/smoke.flow.json` (see below) mirrors the core builtin pipeline and is suitable for CLI validation/pack/run acceptance checks.

## Next steps / flags
- Debate module runtime (`src/modules/debate/runtime.ts`) still relies on a pluggable `llmRequest`; wire it to the shared provider surface during backend integration.
- Input/Output runtime configs derive from node ids today; consider hydrating them from graph `params` once schema stabilizes.
