Module Details:

Module | line location
Prompt    8 to 39
Log      42 to 82
Debate   86 to 142
LLM     146 to 221

Prompt Module Blueprint:

  Placement & Dataflow

  The Prompt module is dragged from the palette and can be placed upstream on any wire between modules on the canvas.

  It injects a system prompt into the data flowing to the next LLM in the pipeline.

  Visual Representation

  Rendered as a small rectangle with the label “Prompt” centered inside the box.

  Configuration Menu

  Right-clicking the Prompt module opens a pop-up configuration menu.

  The menu provides:

  A dropdown list of default system prompts the user can select.

  A text input area where the user can enter a custom prompt (overrides default if provided).

  Behavior

  When the flow is executed, the Prompt module injects the configured system/custom prompt as a system message or context field to the immediate downstream LLM module.

  The prompt text is passed forward exactly as entered/selected, preserving formatting and line breaks.

  Integration

  The module only affects the data on its outbound wire; it does not modify other parts of the flow.

  Multiple Prompt modules can be used in series or parallel, and their output is always routed to the next module as per user wiring.
--------------------------------------------------

Log Module Blueprint:

   Placement

   The Log module is dragged from the palette and can be placed anywhere on the canvas.

   Visual Representation

   Rendered as a small rectangle with the label “Log” centered inside the box.

   Connection

   The module has one input port and can be connected to any data stream wire or module output.

   Only a single inbound connection is allowed; multiple inputs require multiple Log modules.

   Configuration Menu

   When the Log module is connected, its configuration menu automatically updates to display the schema of the incoming data.

   The user can:

   Select which data fields to log (multi-select from the schema).

   Specify the log file location (file path or selector UI).

   Optionally choose log format (e.g., plain text, CSV, JSON).

   Behavior

   On execution, the Log module records the selected data fields from each incoming message to the specified log file.

   Logging occurs in real time as data flows through the module.

   The Log module is primarily intended for debugging but can be used for any purpose requiring data capture or audit.

   Integration

   The module does not alter the data it receives; it only logs a copy and passes the data unchanged to downstream modules (if any).

   Multiple Log modules can be used in a flow as needed for capturing different streams or subsets of data.
----------------------------------------------------------

Debate Module Blueprint:

   Visual Representation

   Rendered as a rectangle with the label “Debate” centered inside the box.

   Placement

   The Debate module is dragged from the palette and can be placed next to any LLM module on the canvas.

   Connections

   The module has two ports: one input and one output.

   Input connects to an upstream module (usually an LLM).

   Output connects to the next module in the flow or to additional debate rounds.

   Configuration Menu

   Right-clicking the Debate module opens a pop-up configuration menu.

   Menu options include:

   Debate format selection, such as:

   Single Pass Validate

   Conciseness Multi-Pass

   Debate Add-On (expand or refine first response)

   (Other custom or predefined formats)

   Once a format is selected, the menu updates to display the configuration fields relevant for that format.

   The user can select a debate prompt from defaults or type a custom prompt for this round.

   Debate Rounds and Chaining

   Each debate round is represented by a separate Debate module placed and configured by the user.

   For multi-round debates, the user must:

   Place a new Debate module for each additional round.

   Select the round number and debate format for each round.

   Place a matching Loop module if iterative debate is required.

   The flow diagram must explicitly wire each round/module (see draft layout for visual reference).

   Behavior

   When executed, the Debate module applies the selected debate prompt and format to the input data, and passes the output downstream to the next module (LLM, Debate, or otherwise).

   Each Debate module operates independently based on its configuration, allowing flexible debate structures and chaining.
------------------------------------------------------------------------

LLM Module Blueprint:

   Visual Representation

   Rendered as an oval shape on the canvas.

   Default label: “LLM” in the center.

   Placement

   User drags the LLM module from the palette onto any location on the canvas.

   Function

   Input: Receives user/system prompt as input.

   Output: Produces the response from the selected LLM.

   Configuration Menu

   Right-clicking the LLM module opens a pop-up configuration menu.

   The menu is a choice-based UI (dropdowns, sliders, etc.), letting the user select the model, backend, and all relevant parameters in a single panel.

   Configurable Options

   LLM model selection (dropdown of available models)

   Backend selection (e.g., llama.cpp, gpt4all, ollama)

   Token limit, temperature, top-k, top-p, and any other available parameters

   Label Update

   When an LLM model is selected, the module label updates from “LLM” to the selected model’s name.

   Settings Update

   All available parameters for the selected LLM (as defined in models.json) are exposed and editable in the config panel.

   Once model & backend are selected, the module’s input schema is automatically adjusted to match model/backend requirements.

   Token Pruner

   Adjustable slider/input to set the maximum input token count (cannot exceed the model’s max token limit).

   Model Metadata

   All LLM details and options are loaded from the local models.json manifest, including templates, quant, RAM requirements, and descriptions.

   Model Selection & File Check

   Upon selecting a model:

   The system searches the local LLM directory for the model file.

   If missing: The system attempts to download the model, verifies md5sum, and retries on checksum failure until successful or cancelled.

   If present and valid: The model is used for all inference.

   Model Download Errors

   If download fails, a simple pop-up error informs the user. The system does not crash or remove the module; user can retry or select another model.

   Input Schema Mismatch / Flexible Flow

   If a user wires a module (e.g., Tool Call) to the LLM module and the selected LLM does not support that input type:

   The LLM module never breaks or rejects the connection.

   Unsupported input (like tool calls or metadata) is stripped and inserted into the user prompt sent to the LLM, as plain text.

   All data is delivered to the LLM node somehow; nothing is dropped or blocked.

   General Rule: No hard errors or broken connections. Any unsupported input is embedded as text into the prompt, so VOIDE always preserves user intent and workflow integrity.

===============================================================================
TITLE: VOIDE Backend Architecture (Modular Nodes + Protobuf)
===============================================================================

## 0) Repo map (authoritative paths)
- Engine orchestration: `packages/main/src/orchestrator/engine.ts`
- IPC bridge (renderer↔main): `packages/preload/dist/preload.js`
- Shared types: `packages/shared/src/types.ts`
- Flow JSON schema: `packages/schemas/dist/flows/schema/flow.schema.json`

These files define flow validation, orchestration, and IPC exposure.

---

## 1) Overview
VOIDE is a visual AI workflow builder. Users design LLM pipelines by dragging nodes (modules) on a canvas and wiring ports. The backend executes the flow graph defined by the canvas.

Pipeline lifecycle:
Canvas (UI Graph / Flow JSON)
↓
Engine (orchestration in engine.ts)
↓
Node Registry (dynamic node definitions)
↓
Workers (Piscina) for heavy compute
↓
DB (runs, payloads, logs)

---

## 2) Flow and Types (what the system validates)
- Flow objects must conform to `flow.schema.json` (`id`, `version`, `nodes`, `edges`).
- Each node has `in` and `out` arrays of ports with `types: string[]`.
- The runtime payload union is in `packages/shared/src/types.ts` (`PayloadT`).

Compatibility note for Protobuf transport:
- Option A: wrap protobuf bytes as a `PayloadT.file` with `mime: "application/x-protobuf"`.
- Option B: extend `PayloadT` with a binary variant (documented here for future use).

Example (documentation only, not a code change):
```ts
// Conceptual extension
export type PayloadT =
  | { kind: 'text'; text: string }
  | { kind: 'json'; value: unknown }
  | { kind: 'messages'; messages: { role: 'system'|'user'|'assistant'; content: string }[] }
  | { kind: 'vector'; values: number[] }
  | { kind: 'file'; path: string; mime: string }
  | { kind: 'binary'; bytes: Uint8Array; mime?: string }; // optional future addition
```

## 3) Engine (`packages/main/src/orchestrator/engine.ts`)

Responsibilities:

- Load and validate flows.
- Compute topological order.
- Execute nodes, dispatching per type (LLM, embeddings, etc.) via Piscina pools.
- Persist run logs and payloads to the DB.
- Expose `getNodeCatalog()` via IPC for the renderer palette.

Engine remains orchestration-only when using the node registry.

Lifecycle:
Flow JSON → topo order → execute node(type, params, inputs) → store payloads/logs → continue

## 4) Modular Node Registry (target design)

Purpose: add new node types by dropping a file; no engine edits.

Document the registry interface (for `packages/main/src/orchestrator/nodeRegistry.ts`):

```ts
export interface NodeModule {
  type: string;                 // unique node type id
  inputs: string[];             // input port names
  outputs: string[];            // output port names
  run: (ctx: {
    get: (portKey: string) => Promise<unknown[]>; // read upstream payloads
    put: (port: string, payload: unknown) => Promise<void>; // emit downstream
    params: Record<string, unknown>;
  }) => Promise<void>;
}

const registry = new Map<string, NodeModule>();

export function registerNode(node: NodeModule) { registry.set(node.type, node); }
export function getNode(type: string) { return registry.get(type); }
export function listNodes() {
  return Array.from(registry.values()).map(n => ({
    type: n.type,
    in: n.inputs.map(p => ({ port: p, types: ["protobuf","json","text"] })),
    out: n.outputs.map(p => ({ port: p, types: ["protobuf","json","text"] })),
  }));
}
```

Auto-load all nodes at startup (conceptual pattern):

```ts
import fs from "fs";
import path from "path";

const nodesPath = path.join(__dirname, "../nodes");
if (fs.existsSync(nodesPath)) {
  for (const file of fs.readdirSync(nodesPath)) {
    if (/\.(cjs|mjs|js)$/i.test(file)) {
      await import(path.join(nodesPath, file)); // each file calls registerNode(...)
    }
  }
}
```

Engine integration with the registry (conceptual):

```ts
// engine.ts
import { getNode, listNodes } from "./nodeRegistry";

export function getNodeCatalog() { return listNodes(); }

async function executeNode(st, node) {
  const mod = getNode(node.type);
  if (!mod) throw new Error(`Unknown node type: ${node.type}`);

  const ctx = {
    get: async (portKey: string) => st.values.get(portKey) ?? [],
    put: async (port: string, payload: unknown) => {
      const key = `${node.id}:${port}`;
      const arr = st.values.get(key) ?? [];
      arr.push(payload);
      st.values.set(key, arr);
    },
    params: node.params ?? {},
  };

  await mod.run(ctx);
}
```

## 5) Ports and Node Catalog aligned with the UI palette

Declare nodes and ports so the renderer palette and backend agree. Accept `["protobuf","json","text"]` for flexibility:

```ts
// Example shape of listNodes() output (documentation)
[
  { type: "ui",
    in:  [{ port: "response_in", types: ["protobuf","json","text"] }],
    out: [{ port: "user_message", types: ["protobuf","json","text"] }] },

  { type: "llm",
    in:  [{ port: "model_input", types: ["protobuf","json","text"] }],
    out: [{ port: "model_output", types: ["protobuf","json","text"] }] },

  { type: "prompt",
    in:  [{ port: "in", types: ["protobuf","json","text"] }],
    out: [{ port: "out", types: ["protobuf","json","text"] }] },

  { type: "memory",
    in: [
      { port: "memory_base", types: ["protobuf","json"] },
      { port: "save_data",   types: ["protobuf","json","text"] }
    ],
    out: [{ port: "retrieved_memory", types: ["protobuf","json","text"] }] },

  { type: "debate",
    in:  [{ port: "configurable_in", types: ["protobuf","json","text"] }],
    out: [{ port: "configurable_out", types: ["protobuf","json","text"] }] },

  { type: "log",
    in:  [{ port: "input", types: ["protobuf","json","text"] }],
    out: [] },

  { type: "cache",
    in: [
      { port: "pass_through", types: ["protobuf","json","text"] },
      { port: "save_input",   types: ["protobuf","json","text"] }
    ],
    out: [{ port: "cached_output", types: ["protobuf","json","text"] }] },

  { type: "divider",
    in:  [{ port: "in", types: ["protobuf","json","text"] }],
    out: [
      { port: "and_out", types: ["protobuf","json","text"] },
      { port: "or_out",  types: ["protobuf","json","text"] }
    ] },

  { type: "loop",
    in:  [{ port: "in", types: ["protobuf","json","text"] }],
    out: [
      { port: "body", types: ["protobuf","json","text"] },
      { port: "out",  types: ["protobuf","json","text"] }
    ] }
]
```

## 6) Protobuf usage and decoding (module-local)

Rule: inter-node transport may use protobuf. Each node decodes/encodes locally.

Decoder pattern (documentation):

```ts
function decodeInput(x: unknown) {
  // Option A: protobuf carried as PayloadT.file
  if (typeof x === 'object' && x && (x as any).kind === 'file' && (x as any).mime === 'application/x-protobuf') {
    // read bytes from file path or buffer according to your implementation
    // return MyProtoMessage.decode(bytes).toJSON();
  }
  // Option B: extended PayloadT.binary
  if (typeof x === 'object' && x && (x as any).kind === 'binary') {
    // return MyProtoMessage.decode((x as any).bytes).toJSON();
  }
  if (typeof x === 'string') {
    try { return JSON.parse(x); } catch { return { text: x }; }
  }
  return x; // already JSON or object
}
```

LLM input/output expectations:

- Input: JSON or text; protobuf schema can wrap messages, system prompt, temperature, etc.
- Output: JSON or text; modules may re-encode to protobuf for downstream.

## 7) Workers (Piscina) and heavy compute

Heavy tasks run in worker threads. The engine already uses Piscina.

Example (documentation):

```ts
const poolLLM = new Piscina({ filename: path.join(__dirname, "../../workers/dist/llm.js") });
const result = await poolLLM.run({ params, prompt, modelFile });
```

Nodes that need workers call the pool inside their `run()`.

## 8) Persistence and logging

The engine records run logs and payloads to the DB.

Persisted payloads remain PayloadT-compatible (file path or JSON), regardless of wire format.

## 9) Adding a new node (minimal steps)

1. Create `packages/main/src/nodes/<type>.ts`.
2. Import and call `registerNode({...})` with type, inputs, outputs, and `run()`.
3. Ensure auto-loader imports the file at startup.
4. If using protobuf, include the `.proto` reference and local decoding logic.
5. No changes to `engine.ts` or IPC required.

## 10) Example node stubs (documentation)

UI node:

```ts
registerNode({
  type: "ui",
  inputs: ["response_in"],
  outputs: ["user_message"],
  async run({ get, put, params }) {
    // Bridge renderer user input to PayloadT, emit on "user_message"
  }
});
```

LLM node:

```ts
registerNode({
  type: "llm",
  inputs: ["model_input"],
  outputs: ["model_output"],
  async run({ get, put, params }) {
    // Decode input (protobuf/json/text), call worker, emit result
  }
});
```

Divider (AND/OR):

```ts
registerNode({
  type: "divider",
  inputs: ["in"],
  outputs: ["and_out","or_out"],
  async run({ get, put, params }) {
    // Route per params.mode ('and' | 'or')
  }
});
```

## 11) Compatibility with existing catalog

The repo currently exposes legacy node types in `getNodeCatalog()`.
This document describes the target modular palette-aligned nodes: `ui`, `llm`, `prompt`, `memory`, `debate`, `log`, `cache`, `divider`, `loop`.
Aligning backend to this document means updating `getNodeCatalog()` to return the registry’s `listNodes()` output.

## 12) Summary

- Engine orchestrates; registry defines nodes; nodes are drop-in files.
- Inter-node transport supports protobuf; modules decode locally.
- Workers handle heavy compute; DB stores outputs/logs.
- Adding a node requires a single file that registers itself; no engine edits.

End of document.
