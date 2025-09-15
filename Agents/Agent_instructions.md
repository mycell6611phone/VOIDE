
# VOIDE — Codex Prompts (Free Offline Edition)
Single user. Offline only. No external APIs. No disk logging except user-initiated saves and local model files. Diagnostics are real-time lights on the canvas. information from the log module user puts in place

---

## Chunk 00 — Free‑mode guardrails (no outside server API calls, single‑user, loacl LLMs)

**Prompt for Codex**

- Add a config flag `VOIDE_FREE=1`. Default to on in dev and prod.
- In Electron `session.defaultSession.webRequest.onBeforeRequest`, block `http://`, `https://`, `ws://`, `wss://`. Allow only `file://` and `dev://` in dev. Deny `autoUpdater`.
- Remove any analytics or crash reporters. Do not import them.
- Prohibit multi‑user: do not open a local HTTP server. All work stays in Electron processes only.
- Disable persistent logs. Do not write to disk except user‑initiated saves and local model files. Keep a small in‑memory ring buffer only if needed to drive the lights UI.
- Expose a single, typed “lights” event stream over IPC. No telemetry leaves the machine.

**Acceptance**

- Network requests are blocked at the browser and main process layers.
- No log files appear after a full run.
- App runs end‑to‑end fully offline with a local mock LLM.

---

## Chunk 01 — Core runtime and packaging (ESM, Electron, license gate)

**Prompt for Codex**

- Implement Electron app with Node ≥20.11, ESM only, strict TS, minimal preload API. Package for Linux first using `electron-builder`.
- Keep GPU optional via `VOIDE_ENABLE_CUDA=1`. CPU default.
- Enforce permissive license allowlist in CI using `license-checker-rseidelsohn`.

**Acceptance**

- `pnpm -w lint && pnpm -w build && pnpm -w test` pass.
- `pnpm -w run dev` launches Electron with the renderer canvas.
- `pnpm -w run pack:linux` builds `.deb` and `.AppImage`.
- `pnpm -w run license:check` fails on a non‑permissive dep.

---

## Chunk 02 — Canonical flow schema + Proto output

**Prompt for Codex**

- Keep a canonical flow editor schema in TS/Zod for authoring and validation: `FlowEnvelope`, `Node`, `Edge`, `Ports`. Preserve unknown fields, apply defaults, provide a CLI validator.
- Add `flow.proto` mirroring the canonical schema for execution and persistence. Build phase compiles JSON‑like editor state into protobuf bytes “Flow v1”. The runtime consumes only protobuf.
- Add CLI: `pnpm voide validate <path>` uses Zod; `pnpm voide pack <path>` emits `.flow.pb`.

**Acceptance**

- Validate→stringify round‑trip preserves unknown fields. CLI exits 1 on invalid flows and 0 on valid samples.
- `pack` produces deterministic protobuf for the same input. Renderer loads either JSON (edit) or protobuf (run).

---

## Chunk 03 — IPC and process boundaries + typed preload

**Prompt for Codex**

- Define typed channels and Zod payloads: `flow:validate`, `flow:run`, `model:ensure`, `telemetry:event`, `app:get-version`. Register handlers in `packages/main/src/ipc/handlers.ts` with validation and safe error mapping.
- Expose a minimal `window.voide` preload surface with typed proxies in `packages/preload`.
- Renderer wraps it in `ipcClient.ts`. Reject invalid payloads with structured errors.

**Acceptance**

- End‑to‑end type‑safe IPC. Unit tests for each channel schema. `preload` exposes only the documented API.

---

## Chunk 04 — Canvas UI with real‑time lights

**Prompt for Codex**

- Build a React canvas for nodes and edges. Nodes show port badges. Edges show flow pulses.
- Implement a “lights” overlay: per‑node and per‑edge LEDs that update from `telemetry:event`.
- State→light mapping:
  - `idle` grey, `queued` blue, `running` white strobe, `ok` green, `warn` yellow, `error` red, `normalized` cyan, `routed` magenta.
- Animate edge pulses when payloads move. Show small payload shape icons per port type.
- Provide a “Simulate” toggle that replays the last run’s in‑memory events for visual debugging. No disk writes.

**Acceptance**

- In a sample flow, lights change and pulses traverse edges during execution.
- Turning on “Simulate” replays the lights without executing modules again.

---

## Chunk 05 — Core modules (LLM, Prompt, Memory, ToolCall). No Log module.
**Prompt for Codex**

- Implement modules with strict sub‑schemas and graceful downgrades. Keep unknown fields passthrough.
- **LLM Module**: input `{system,user,assistant,context[],params}`. Insert defaults. If backend lacks `system`, fold into first user turn. Provide a mock CPU adapter that echoes with simple templating. No network.
- **Prompt Module**: inject text into `system` or `user` per config.
- **Memory Module**: local SQLite only. Use FTS5 for retrieval. Modes `append|replace|retrieve`. No FAISS or external processes in free mode.
- **ToolCall Module**: declare tool schema, detect tool requests in LLM output, call local tools, route results. Ship a sample web search tool.

**Acceptance**

- Unit tests cover schema validation and downgrade behavior. End‑to‑end run passes with the mock LLM. 

---

## Chunk 06 --Routers/Dividers and Normalizers

**Prompt for Codex**

- Add `router-divider` module with predicate API using Zod refinements to branch valid vs. invalid payloads.
- Add `normalizers` that coerce raw text or partial objects into the expected sub‑schema.
- Update the engine to support multi‑out nodes and conditional routing. Flows must not halt on schema mismatch.

**Acceptance**

- Tests prove valid payloads go forward and invalid payloads get normalized and then continue.

---

## Chunk 07 --Deterministic orchestrator and stepper

**Prompt for Codex**

- Execute the protobuf flow as a DAG in topological order with a deterministic scheduler. Same input → same event order.
- Per‑node state machine: `idle→queued→running→ok|warn|error`. Emit granular `telemetry:event` for state changes and edge transfers. Bind these to lights.
- Support `pause`, `resume`, `cancel`, and `step`. On `step`, advance one ready node and emit events.

**Acceptance**

- The same flow and seeds produce identical event sequences. Lights reflect these events in real time.

--- 

## Chunk 08 — Model Manager (offline‑first)

**Prompt for Codex**

- Parse `~/.voide/models/models.json`. Enforce license allowlist. Store models under `~/.voide/models`. Provide progress events over IPC.
- Offline‑first: support `file://` and local paths. Network downloads are disabled in free mode. If a URL is present, show “unavailable offline”.
- Verify checksums. Resume partial installs. Expose status: `installed`, `available-local`, `unavailable-offline`, `blocked-license`.

**Acceptance**

- Invalid licenses are rejected. Partial installs resume. Progress streams to UI.

--- 

## Chunk 09 — Model Picker UI

**Prompt for Codex**

- `packages/renderer/src/features/models/ModelPicker.tsx`: list installed vs not installed. Grey out `unavailable-offline` and `blocked-license`. Clicking an available item starts local install and shows progress.
- Show checksum status and disk size. No network prompts in free mode.

**Acceptance**

- Picker reflects real statuses and triggers installs. Error states surface with a red light on the item card.

---

## Chunk 10 — CLI, validation, and CI

**Prompt for Codex**

- Wire workspace scripts and CI from Step 01. Enforce Node engine, ESM, strict TS.
- Ship `packages/cli` with `validate-flow` from Step 02 and `pack-flow` to protobuf. Add a sample flow and validate it in CI.
- Add an offline E2E test: launch Electron, load the sample flow, run it with the mock LLM, assert a fixed event trace and light sequence.

**Acceptance**

- CI passes all unit and E2E tests. Packaging works without network.

---

## Chunk 11 — IPC events → lights protocol

**Prompt for Codex**

- Define `telemetry:event` payloads:
  - `node_state`: `{runId,nodeId,state,at}`.
  - `edge_transfer`: `{runId,edgeId,bytes,at}`.
  - `normalize`: `{runId,nodeId,fromType,toType,at}`.
  - `error`: `{runId,nodeId,code,message,at}`.
- Map these 1:1 to renderer light updates and edge pulse animations.
- Keep a volatile in‑memory buffer per run for the “Simulate” replay. Do not persist.

**Acceptance**

- Renderer shows accurate lights with no disk writes. Replay works using only in‑memory buffers.

---

## Chunk 12 — Palette, toolbar, and canvas to match the PNG

**Prompt for Codex**

- Left palette groups: **LLMs**, **Prompt**, **Debate**, **Persona**, **Tools**, **Loop**, **Memory**, **Routers/Normalizers**, **Other**.
- Top toolbar: ▶ Run, ⏸ Pause, ⟲ Reset, ⏹ Stop, ⟳ Rebuild, and a **Build** button. Keyboard: Space=Run/Pause, R=Reset.
- Canvas: snap‑to‑grid, pan/zoom, orthogonal wires with arrows. Ovals=LLM. Rectangles=aux. Port badges visible on hover.
- Inline validation: acyclicity, port arity, schema assignability. Show red badges and refuse wire drop if invalid.
- Deterministic IDs for nodes/edges. Project = Flow v1 protobuf + layout sidecar. No telemetry logs, only on‑screen lights.

**Acceptance**

- The UI mirrors the PNG grammar and passes edit‑time checks. Projects load fast and deterministically.

---

## Chunk 13 — Diagram modules: Debate, Persona, Validate, Loop, ReasonerV1

**Prompt for Codex**

Implement as first‑class modules following the existing module pattern.

- **Debate**: fan‑out N debaters (LLM subinvocations), then aggregate. Inputs: `{prompt, n, max_rounds}`. Outputs: `{final, votes[], rationales[]}`. Deterministic scheduling; non‑deterministic text allowed.
- **Persona**: injects style/constraints into `system` or `user`. Config: `{target: "system"|"user", persona_text}`.
- **Validate**: schema guard node. Zod/protobuf schema ref. Emits `{ok: payload}` or `{error: {code,msg}}` to separate ports.
- **Loop**: explicit iterator node to keep the global DAG invariant. Config: `{max_iters, until? predicate}`. Provides `iter`, `acc`, `item` ports and a side exit on `exhausted`.
- **ReasonerV1**: reducer over multiple candidate answers. Strategies: `majority_vote`, `score_by_regex`, `tool_backed_score(fn)`. Output: `{answer, trace_meta}`.

All modules must accept/produce strict sub‑schemas and pass through unknown fields. No disk logs. Lights events on state changes.

**Acceptance**

- Unit tests for schema validation and downgrade behavior. Engine executes them with deterministic event order.

---

## Chunk 14 — Loop semantics without breaking DAG

**Prompt for Codex**

- For `Loop`, model iteration as internal stepping, not graph cycles. The outer graph stays acyclic.
- API: `begin(acc0,payload) → ticks(iter,acc,item) → yield(acc)` with `pause|resume|cancel` support.
- Emit `node_state` and `edge_transfer` events each tick. Provide `Loop 1`, `Loop 3` presets in palette.

**Acceptance**

- Build phase rejects true cycles. Run phase iterates via the Loop node only. Lights show pulses per tick.

---

## Chunk 15 — Validate node and router/normalizer integration

**Prompt for Codex**

- `Validate` uses SchemaRef to check payloads. On failure route to `normalizer` chain then back to the main branch.
- Provide stock normalizers: `text_to_json`, `json_pick(fields)`, `coerce_number`.
- Compiler inserts adapters only from the allowed set. Diverter ambiguity errors are flagged at build.

**Acceptance**

- Valid data flows forward. Invalid data is normalized then forwarded. Compiler emits stable diagnostics.

---

## Chunk 16 — ReasonerV1 deterministic reducer

**Prompt for Codex**

- Define `ReasonerV1` as a reducer over K candidates `{text, score?}` with a chosen strategy.
- Deterministic tiebreak by hash of candidate IDs.
- Emits telemetry with start/stop and chosen candidate id. No stdout persistence.

**Acceptance**

- Same inputs produce the same selected candidate and identical event order.

---

## Chunk 17 — Offline model adapters and statuses

**Prompt for Codex**

- LLM module supports adapters: `mock`, `llama_cpp` (GGUF local), `none`.
- Model Manager reads `~/.voide/models/models.json`, enforces license allowlist, and installs from local paths only in free mode. External URLs show `unavailable-offline`.
- UI shows **LLAMA3.1 8B** as installable if the GGUF exists locally. **GPT‑4o** and **Gemini** appear but are greyed as `unavailable-offline`.

**Acceptance**

- Invalid licenses rejected. Local installs verified by checksum. Greyed entries cannot start downloads. Progress streams over IPC.

---

## Chunk 18 — Sample demo flow matching the PNG (editor JSON → pack to protobuf)

**Prompt for Codex**

Add `flows/demo-self-debate.flow.json`:

- Nodes: `UI`, `Prompt#A`, `Persona#A`, `LLM#Llama1`, `Prompt#B`, `Debate#K`, `LLM#Llama2`, `Tool#Calculator`, `ReasonerV1`, `Validate`, `Loop#1`, `Memory`, placeholders `GPT-4o` and `Gemini` marked `unavailable-offline`.
- Wire: UI → Persona → Prompt#A → LLM#Llama1 → Prompt#B → LLM#Llama2 → Debate#K → ReasonerV1 → Validate → Loop#1 → Memory → UI. Tool connects to Debate as auxiliary scoring.
- Provide minimal port schemas and defaults. Pack to Flow v1 protobuf via `pnpm voide pack flows/demo-self-debate.flow.json`.

**Acceptance**

- `validate` passes. `pack` produces deterministic bytes. Renderer loads and runs with `mock` or local Llama only. Lights animate across the same path shown in the PNG.

---

## Chunk 19 — Telemetry→lights mapping for new modules

**Prompt for Codex**

- Emit `telemetry:event` for: `debate_round`, `loop_tick`, `reasoner_choice`, `validate_ok|validate_fail`.
- Map to lights: `debate_round` white strobe; `validate_ok` green blink; `validate_fail` red solid; `loop_tick` pulse; `reasoner_choice` magenta flash at the chosen edge.
- Keep a volatile per‑run ring buffer for **Simulate** replay. No disk writes.

**Acceptance**

- UI updates in real time and can replay the last run using only in‑memory events.

---

## Chunk 20 — Free‑mode cuts (override PR‑05)

**Prompt for Codex**

- Remove the persistent **Log** module and any file logging. Replace with in‑memory debug buffers used only for lights and the on‑screen console.
- Memory module: SQLite file allowed; all other modules must avoid file I/O unless the user explicitly saves a project or model.

**Acceptance**

- No log files are created during runs. E2E offline tests pass.

---

## Chunk 21 — Compiler and orchestrator glue for the demo

**Prompt for Codex**

- Compiler: validate DAG, infer schemas across the new nodes, emit stable ExecPlan. Diagnostic codes: `V001`, `T101`, `A201`, `B401`.
- Orchestrator: bounded worker pool with resource hints; deterministic event ordering; cooperative cancel; per‑node timeouts.

**Acceptance**

- Same graph + same inputs → identical `Flow v1` and `ExecPlan`, and identical event traces.
