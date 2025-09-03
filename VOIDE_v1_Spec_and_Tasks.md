# VOIDE — v1 Specification & Task Breakdown

> “AutoCAD for AI workflows.” A visual, modular IDE to design, run, and share LLM pipelines using local models first, with a clear path to pro upgrades.

---

## 0) TL;DR (What ships in v1)

- **Canvas** to drag blocks (LLM, Prompt, Memory, Tool Call, Log, UI/CLI), draw wires, and run flows.
- **Flow definition** stored as a single `*.flow.json` file (versioned schema).
- **Engine** that validates the flow, schedules nodes, routes data, and writes runtime snapshots.
- **Local model management**: read `models.json`, auto-download missing models (whitelist), verify checksum, and load via selected backend.
- **Telemetry lights**: live data-flow indicators and schema warning LEDs (green/orange) across nodes and wires.
- **Linux-first** (Pop!_OS), cross-platform Electron packaging.
- **Permissive-only licensing** (MIT/Apache/BSD) for all components.

Non-goals for v1: cloud infra, HTTP tool, multi-user GUI, paid features (only placeholders).

---

## 1) Goals & Principles

- **Functional first**: minimal set that works reliably; iterate later.
- **Visual clarity**: canvas must make complex systems graspable at a glance.
- **Safety & portability**: avoid licenses that block distribution or commercial use.
- **Extensibility**: all modules are pluggable; pro features can be enabled later.

---

## 2) Platform & Distribution

- **Runtime**: Electron (Main + Preload + Renderer), Node 20+, TypeScript everywhere.
- **OS focus**: Linux Pop!_OS (primary), Windows/macOS secondary.
- **Packaging**: `electron-builder` → `.deb`, `.AppImage`, `.exe`, `.dmg`.
- **GPU**: CUDA selectable; CPU fallback; portable builds where possible.

---

## 3) Architecture Overview

### 3.1 Processes & Boundaries
- **Renderer (React/TS)**: Canvas UI (React Flow), module palettes, menus, real-time lights overlay.
- **Main (Node/TS)**: Orchestrator/Engine, model manager, scheduler, workers, file I/O, downloads.
- **Preload (TS)**: IPC surface, isolates browser world from Node APIs.
- **Optional workers**: child processes/threads for heavy ops (FAISS indexing, model inference if needed).

### 3.2 IPC & Message Channels
- `renderer ⇄ main`: `flow:validate`, `flow:run`, `flow:stop`, `flow:snapshot`, `model:ensure`, `telemetry:event`, `download:*`.
- Events are typed (`packages/shared/src/types.ts`) and runtime-validated (`zod`/`ajv`).

---

## 4) Flow File & Schema

- Stored as `*.flow.json`, versioned with `"version"` (e.g., `"1.0.0"`).
- **Required top-level**: `id`, `version`, `nodes[]`, `edges[]`.
- **Nodes** have **ports** (`in[]`, `out[]`) with typed payloads to constrain wiring.
- **Edges** connect `[nodeId, port] -> [nodeId, port]`, with direction & label.

### 4.1 JSON Schema (summary)
```jsonc
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "required": ["id", "version", "nodes", "edges"],
  "definitions": {
    "port": {
      "type": "object",
      "required": ["port", "types"],
      "properties": {
        "port": { "type": "string" },
        "types": { "type": "array", "items": { "type": "string" } }
      }
    }
  },
  "properties": {
    "id": { "type": "string" },
    "version": { "type": "string" },
    "engine": { "type": "string" },
    "meta": {
      "type": "object",
      "properties": {
        "name": { "type": "string" },
        "description": { "type": "string" },
        "tags": { "type": "array", "items": { "type": "string" } }
      }
    },
    "run": { "type": "object" },
    "nodes": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["id", "kind", "type", "name", "params", "in", "out"],
        "properties": {
          "id": { "type": "string" },
          "kind": { "type": "string", "enum": ["UI","LLM","Prompt","Memory","ToolCall","Log","Cache","Router","Validator"] },
          "type": { "type": "string" },
          "name": { "type": "string" },
          "params": { "type": "object" },
          "llm": {
            "type": "object",
            "properties": {
              "backend": { "type": "string" },
              "model": { "type": "string" },
              "params": { "type": "object" },
              "strictSchema": { "type": "string", "enum": ["hard","soft","off"] },
              "tokens": {
                "type": "object",
                "properties": { "input": { "type": "integer" }, "output": { "type": "integer" } }
              }
            }
          },
          "memory": {
            "type": "object",
            "properties": {
              "store": { "type": "string", "enum": ["sqlite","faiss","chroma"] },
              "k": { "type": "integer" },
              "modes": { "type": "array", "items": { "type": "string", "enum": ["save","recall"] } }
            }
          },
          "in": { "type": "array", "items": { "$ref": "#/definitions/port" } },
          "out": { "type": "array", "items": { "$ref": "#/definitions/port" } }
        }
      }
    },
    "edges": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["id", "from", "to", "direction", "edgeType"],
        "properties": {
          "id": { "type": "string" },
          "from": { "type": "array", "items": [{ "type": "string" }, { "type": "string" }], "minItems": 2, "maxItems": 2 },
          "to":   { "type": "array", "items": [{ "type": "string" }, { "type": "string" }], "minItems": 2, "maxItems": 2 },
          "label": { "type": "string" },
          "direction": { "type": "string", "enum": ["forward","reverse","bidirectional"] },
          "edgeType": { "type": "string", "enum": ["data","sensor","telemetry"] }
        }
      }
    },
    "prompts": { "type": "object" },
    "models": { "type": "object" },
    "profiles": { "type": "object" }
  }
}
```

> **Behavioral rule:** if a target model lacks tool-call support or a payload does not match the expected schema, **fallback to text** (pass-through) but **raise an orange LED** on the offending module/wire and include a validation warning in telemetry.

### 4.2 Minimal example
```json
{
  "id": "demo-01",
  "version": "1.0.0",
  "nodes": [
    { "id": "u1", "kind": "UI", "type": "CLI.In", "name": "User Input", "params": {}, "in": [],
      "out": [{ "port": "text", "types": ["text/plain"] }] },
    { "id": "p1", "kind": "Prompt", "type": "Prompt.Basic", "name": "System Prompt", "params": { "template": "You are a helpful AI assistant." },
      "in": [{ "port": "text", "types": ["text/plain"] }],
      "out": [{ "port": "text", "types": ["text/plain"] }] },
    { "id": "l1", "kind": "LLM", "type": "LLM.Local", "name": "Llama 3.2 3B", "params": {},
      "llm": { "backend": "llama.cpp", "model": "Llama-3.2-3B-Instruct-Q4_0.gguf", "strictSchema": "soft", "tokens": { "input": 4096, "output": 512 } },
      "in": [{ "port": "prompt", "types": ["text/plain"] }],
      "out": [{ "port": "text", "types": ["text/plain"] }] },
    { "id": "o1", "kind": "UI", "type": "CLI.Out", "name": "Console", "params": {},
      "in": [{ "port": "text", "types": ["text/plain"] }],
      "out": [] }
  ],
  "edges": [
    { "id": "e1", "from": ["u1","text"], "to": ["p1","text"], "direction": "forward", "edgeType": "data" },
    { "id": "e2", "from": ["p1","text"], "to": ["l1","prompt"], "direction": "forward", "edgeType": "data" },
    { "id": "e3", "from": ["l1","text"], "to": ["o1","text"], "direction": "forward", "edgeType": "data" }
  ]
}
```

---

## 5) Engine & Execution Semantics

- **Validate** flow against schema; surface errors in a sidebar + orange LEDs on nodes/wires.
- Build a **DAG**; detect cycles (allow explicit loops only via Tool/Router with safeguards).
- **Scheduler** executes ready nodes; backpressure via per-node concurrency limits.
- **Workers** per node-kind (LLM, Prompt, Memory, ToolCall, Log, UI) with a registry.
- **Routing**: typed payloads (`contentType`, `schemaId?`).
- **Strict schema mode** (per LLM):  
  - `hard`: reject malformed model/tool payloads; stop branch; LED orange; error card.  
  - `soft`: try to coerce/repair; log warning; LED orange (until next clean pass).  
  - `off`: pass-through as text, still mark LED orange once.
- **Snapshots**: write last-known state (per node I/O and telemetry) for crash recovery; freeze LEDs on Stop; thaw on Restart.

---

## 6) Modules (v1)

- **LLM**: pick backend/model, params (temperature, max tokens), strictness toggle; token limiter (truncate inputs to model capacity).  
- **Prompt**: default templates + user-custom; small help in-menu.  
- **Memory**: `{ store: sqlite|faiss|chroma, k, modes:[save|recall] }`.  
- **Tool Call**: loop-like structure: declare functions/tool schema, watch for tool call in LLM output, invoke, route result to selected nodes (can be different LLM or Memory).  
- **Log**: write to file/console; optional rolling.  
- **UI (CLI)**: stdin/stdout hooks for quick I/O.  
- **Pro placeholders**: HTTP, WebSearch, Cloud runners — shown as **grayed out** (no logic).

---

## 7) Model Management

- **Source**: `models.json` (whitelisted models only; commercial-safe).  
- **Ensure**: on run, verify presence (`~/.voide/models/<file>`), else prompt → auto-download; verify `md5/sha256`; resume partial downloads.  
- **Supported (focus)**: Llama 3.2 3B Instruct, Llama 3.1 8B Instruct 128k, Mistral 7B (NH2 or Instruct v0.1), Reasoner v1 (Qwen2.5 Coder 7B).  
- **Exclusions**: models with non-commercial or conflicting licenses by default.

---

## 8) Telemetry “Lights”

- **Green (active)**: data currently passing.  
- **Off**: idle or no data.  
- **Orange (schema violation)**: persists on module/wire until user opens module menu _or_ next clean pass.  
- **Persist on Stop**: last snapshot remains lit; cleared on Restart.

Implementation notes: lights must update independently of execution (robust overlay); keep rendering isolated so a crash in engine doesn’t break LEDs.

---

## 9) Persistence

- **Project Save/Load**: write/read `*.flow.json`.  
- **Runtime snapshot**: `*.runtime.json` (last state, LED map, per-node last payload meta).  
- **Logs**: per-run folder with timestamps.

---

## 10) Security & Compliance

- Node sandboxing boundaries; no arbitrary `eval` in renderer; IPC allowlist.  
- Licenses vetted; include third-party notices; avoid GPL/LGPL components.  
- No cloud calls in v1 without user consent.

---

## 11) UI/UX Highlights

- Node options via **popup drawer** with multi-choice settings and **Help** section (short text).  
- **Right-click drag** to reposition nodes; wires follow and re-route cleanly.  
- Wire **arrowheads** show direction.  
- Context menu on nodes/wires: **Delete**, **Duplicate/Copy**, **Inspect** (opens log/memory where applicable).  
- Build/Run toolbar, Stop button (freeze lights), Status bar.

---

## 12) Roadmap (v1)

1) Schema & types → 2) Engine minimal → 3) Renderer minimal → 4) Core modules → 5) Model manager → 6) Telemetry → 7) Persistence → 8) Packaging → 9) Examples & QA → 10) Docs.

---

# Task Breakdown (Doable Chunks)

> Use these as GitHub issues. Each task has **Inputs**, **Output**, **Acceptance Criteria** (AC).

## Milestone 0 — Repo Hygiene & Tooling

- **M0.1 Init workspace**
  - Inputs: existing monorepo
  - Output: Yarn/pnpm workspaces, TS base configs
  - AC: `pnpm i` boots, `pnpm -w build` succeeds

- **M0.2 Lint/format**
  - Output: ESLint + Prettier configs; scripts
  - AC: `pnpm -w lint`/`format` pass

- **M0.3 Electron builder setup**
  - Output: `electron-builder.yml`
  - AC: `pnpm -w dist:linux` produces artifact

- **M0.4 .gitignore & artifacts**
  - Output: Ignore `node_modules`, `dist`, `.vite`, `.turbo`, logs
  - AC: `git status` clean after build

## Milestone 1 — Schema & Shared Types

- **M1.1 Finalize `flow.schema.json`**
  - Output: draft-07 schema as above
  - AC: validates sample flows via `ajv` script

- **M1.2 TS types**
  - Output: `packages/shared/src/types.ts` mirroring schema
  - AC: type tests compile

- **M1.3 Validator utility**
  - Output: `packages/schemas/src/index.ts` exports `validateFlow()`
  - AC: invalid flow returns rich errors (path, message, nodeId)

- **M1.4 Sample flows**
  - Output: `flows/sample-*.flow.json`
  - AC: validated by CI script

## Milestone 2 — Orchestrator/Engine (Main)

- **M2.1 Graph builder**
  - Output: DAG from nodes/edges; cycle detection
  - AC: unit tests for simple/branching/cycle cases

- **M2.2 Worker registry**
  - Output: register handlers per `kind`
  - AC: plugin API shape + tests

- **M2.3 Scheduler**
  - Output: ready-queue, per-node concurrency, backpressure
  - AC: deterministic order under simple cases; stable under load

- **M2.4 Routing & payloads**
  - Output: `contentType`, `schemaId?` meta; ports typing enforcement
  - AC: wrong types cause soft/hard behavior per node

- **M2.5 Strict schema modes**
  - Output: hard/soft/off handling
  - AC: orange LED events emitted; pass-through where allowed

- **M2.6 Snapshots**
  - Output: per-run `*.runtime.json`
  - AC: restore Stop snapshot; LEDs freeze/unfreeze

## Milestone 3 — Renderer/Canvas

- **M3.1 Canvas skeleton**
  - Output: React Flow canvas, zoom/pan/grid
  - AC: add/move/delete nodes/wires

- **M3.2 Palette & popups**
  - Output: module palette; node settings drawer with Help
  - AC: values stored in node `params`

- **M3.3 Wire routing & arrows**
  - Output: auto-routing; direction arrows
  - AC: wires reflow on move; snap-to-port

- **M3.4 Context menus**
  - Output: node/wire: Delete, Duplicate, Inspect
  - AC: duplicate preserves settings/new ids

- **M3.5 Build/Run controls**
  - Output: toolbar buttons
  - AC: IPC calls to validate/run/stop

## Milestone 4 — Core Node Workers

- **M4.1 UI.In / UI.Out (CLI)**
  - Output: simple stdin/stdout handlers
  - AC: echo flow works

- **M4.2 Prompt.Basic**
  - Output: string template support
  - AC: merges input text → prompt text

- **M4.3 LLM.Local**
  - Output: backend adapter (`llama.cpp`/`gpt4all`), token limiter
  - AC: loads selected model; truncates inputs; returns text

- **M4.4 Memory**
  - Output: sqlite save/recall; FAISS recall (optional simple)
  - AC: save/recall path tested; `k` respected

- **M4.5 ToolCall**
  - Output: declare tools (JSON), detect call, invoke function, route result
  - AC: end-to-end with LLM emitting a tool call → downstream node gets result

- **M4.6 Log**
  - Output: per-run log writer
  - AC: file written; rolling policy optional

## Milestone 5 — Model Manager

- **M5.1 Parse `models.json`**
  - Output: typed model entries; license field
  - AC: restricted licenses filtered out

- **M5.2 Ensure & Download**
  - Output: download with resume; checksum verify; progress events
  - AC: files land under `~/.voide/models`

- **M5.3 Selection UI**
  - Output: dropdown in LLM node; grayed-out models until installed
  - AC: “Install” button triggers M5.2

## Milestone 6 — Telemetry Lights

- **M6.1 Event bus**
  - Output: `telemetry:event` IPC channel
  - AC: renderer receives per-edge/node updates

- **M6.2 LED overlay**
  - Output: green activity, orange violations, off idle
  - AC: stress test: rapid updates stay smooth

- **M6.3 Persistence on Stop**
  - Output: LEDs freeze; unfreeze on Restart
  - AC: matches runtime snapshot

## Milestone 7 — Persistence & Files

- **M7.1 Save/Load project**
  - Output: write/read `*.flow.json`
  - AC: canvas restores 1:1

- **M7.2 Runtime snapshots**
  - Output: `*.runtime.json`
  - AC: includes node I/O meta + LED map

- **M7.3 Logs folder**
  - Output: per-run timestamped directory
  - AC: accessible from UI Inspect

## Milestone 8 — Packaging

- **M8.1 Linux artifacts**
  - Output: `.deb` + `.AppImage`
  - AC: run on clean VM

- **M8.2 App settings**
  - Output: user config dir; paths for models/logs
  - AC: reloads on restart

## Milestone 9 — Examples & QA

- **M9.1 Example flows**
  - Output: `sample-self-debate`, `sample-rag-local`
  - AC: one-click run succeeds

- **M9.2 E2E tests**
  - Output: Playwright or Spectron basic flows
  - AC: CI green

## Milestone 10 — Docs & Help

- **M10.1 Quickstart & Troubleshooting**
  - Output: `docs/quickstart.md`
  - AC: user can install models and run a sample

- **M10.2 In-app Help**
  - Output: Help drawer texts for each node
  - AC: concise; links to docs

---

## Definitions of Done (per Milestone)

- ✅ Code builds in CI
- ✅ Unit/E2E tests for new behavior
- ✅ Docs updated (schema, node help)
- ✅ Licenses OK; no restricted deps
- ✅ Example flows run successfully

---

## Working with Patch Bots / Codex

- Keep **one canonical branch** for v1 (e.g., `slim-version-v1`).
- Open **small PRs** per task; include acceptance criteria in description.
- Run `pnpm -w lint && pnpm -w build && pnpm -w test` locally before pushing.
- If branches diverge, rebase your local feature branch onto the canonical branch before applying automated patches.

---

## Labels & Issue Templates

- Labels: `schema`, `engine`, `renderer`, `module-llm`, `module-memory`, `module-tool`, `telemetry`, `packaging`, `docs`, `good-first-task`.
- GitHub issue template: include **Inputs**, **Output**, **AC**, and **Test notes**.

---

## Appendix — Node Port Conventions (v1)

- **Text**: `text/plain`
- **Prompt**: `prompt/text`
- **Json**: `application/json`
- **Embedding**: `vector/float32`
- **Log**: `log/text`

---

*End of document.*
