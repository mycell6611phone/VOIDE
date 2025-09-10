0) Repo scaffold

Prompt:
Generate a minimal monorepo for “voide” with two packages:

core/ (TypeScript, Node 20)

ui/ (React + Vite + TypeScript)
Include workspace package.json, tsconfig, eslint, and scripts. No sample code yet. Output full file tree and all file contents.

1) Protobuf schemas

Prompt:
Create core/protos/voide/v1/flow.proto defining: UserText, PromptText, LLMText, AnyBlob, NodeConfig, Edge, Flow, InputCfg, PromptCfg, LLMCfg, BranchCfg, LogCfg, OutputCfg, and an execution RPC ABI: ExecuteRequest, PortValue, ExecuteResponse, NodeEvent. Use proto3, package voide.v1. Then add core/scripts/gen-proto.ts and core/src/proto/index.ts to compile with ts-proto. Update core/package.json scripts: proto:gen. Output all files.

2) Type registry and strong typing

Prompt:
In core/src/runtime/types.ts, implement a Type Registry that maps logical port type names to protobuf message types: "UserText", "PromptText", "LLMText", "AnyBlob", plus extensible ext:*. Provide encode/decode helpers returning Uint8Array and typed objects. Add tests in core/test/types.spec.ts using vitest. Output files and update scripts.

3) Node SDK (stable ABI)

Prompt:
Implement core/src/sdk/node.ts exporting:

TypeRef = string

PortSpec = Record<string, TypeRef>

NodeHandler interface { kind, inPorts, outPorts, execute(req): Promise<ExecuteResponse> }

makeContext(logger) to emit NodeEvents
Also provide a registry NodeRegistry with register(handler) and get(kind). Include runtime validation that in/out ports use known TypeRefs. Output code and tests.

4) Built-in nodes v0

Prompt:
Implement built-in handlers in core/src/nodes/ with full code and unit tests:

InputNode: no inputs, one output UserText. Reads runtime input from runner context.

PromptNode: in UserText, out PromptText. Template {{text}} using a safe formatter.

LLMNode: in PromptText, out LLMText. Providers: "stub"|"openai"|"llama". Implement "stub" now: if prompt contains “bullet”, return a deterministic bulleted response; else echo refined text. Provider interface pluggable.

BranchNode: in LLMText, two outputs pass:LLMText, fail:LLMText. Menu: contains.

LogNode: accepts any payload, logs to console with label, returns pass-through output identical to input.

OutputNode: in LLMText, stores final text to runner context for UI retrieval.
Export registerBuiltins(registry). Provide tests for each handler.

5) Compiler (build phase)

Prompt:
Create core/src/build/compiler.ts that accepts a Canvas JSON (nodes with NodeConfig, edges with Edge). Validate: acyclic, all port types match, menus present. On error, throw typed errors E-CYCLE, E-TYPE, E-CONFIG, E-DANGLING, E-UNREACHABLE-OUTPUT with node/port ids. Emit a Flow protobuf binary (Uint8Array). Add core/src/build/validate.ts helpers and tests covering success and all failures. Output files and tests.

6) Orchestrator (run phase)

Prompt:
Implement core/src/run/orchestrator.ts that loads a Flow binary, constructs mailboxes per edge, computes ready set, and executes nodes sequentially. Provide per-node timeout and retry defaults. Emit telemetry events (NODE_START, NODE_END, NODE_ERROR, EDGE_EMIT) through an async iterator. Persist final OutputNode value in RunResult. Add core/src/run/index.ts with runFlow(flowBin, runtimeInputs, providers) API and tests.

7) CLI parity

Prompt:
Add a CLI in core/src/cli.ts using commander with commands:

voide build <canvas.json> -o <flow.bin>

voide run <flow.bin> --input 'text=Hello world' --provider stub
Wire to compiler and orchestrator. Stream telemetry to stdout with simple colors. Update core/package.json bin field and scripts. Provide example examples/bulletizer.canvas.json and instructions in README.md.

8) UI canvas app

Prompt:
In ui/, build a React + Vite app implementing:

Left palette with nodes: Input, Prompt, LLM, Branch, Log, Output.

Konva canvas: drag nodes, snap to grid, zoom/pan, connect ports with type checking.

Inspector panel: auto-generated forms from the proto menu messages for the selected node.

Buttons: Build and Run. Build calls compiler exposed via a web worker. Run calls orchestrator via a worker and shows per-node badges: blue running, green success, red error, yellow warning.

Output panel shows final text.
Provide complete components, minimal styling with Tailwind, and state model with Zustand. No placeholders.

9) Web workers bridge

Prompt:
Create ui/src/workers/buildWorker.ts and ui/src/workers/runWorker.ts. The build worker wraps compiler.ts from core packaged for the browser. The run worker wraps a browser version of orchestrator with only the "stub" provider. Define message types, error forwarding, and progress events. Output code and integration in UI.

10) Determinism and seeding

Prompt:
Add seed handling: extend LLMCfg with seed. Make "stub" provider deterministic given seed. Record run metadata {flowHash, cfgHashes, seed, timings} and expose via RunResult. Update tests to assert reproducibility.

11) Telemetry and logs

Prompt:
Implement an event bus in core/src/telemetry/bus.ts and a console sink core/src/telemetry/consoleSink.ts. UI subscribes to worker events to color nodes and highlight the taken Branch edge. Provide NDJSON export of events in CLI with --ndjson flag.

12) Packaging and CI

Prompt:
Add GitHub Actions workflow .github/workflows/ci.yml to run pnpm -w install, pnpm -w build, and pnpm -w test on pull requests. Cache pnpm and protobuf outputs. Ensure ui build references core via workspace.

13) Demo flows

Prompt:
Add two sample canvases and screenshots to examples/ and wire a menu in the UI to load them:

Bulletizer with Branch failover.

Rewrite + Log.
Ensure both run completely with the stub provider offline.

14) Documentation

Prompt:
Write README.md at repo root. Include: motivation, architecture diagram, dataflow principles, protobuf as source of truth, how to build, how to run CLI and UI, node kinds, extensibility plan, and roadmap for Map node, retries, plugins, structured outputs.

15) Hardening tests

Prompt:
Create integration tests in core/test/integration.spec.ts that:

Build examples/bulletizer.canvas.json to flow.bin.

Run with input and assert final output contains a dash.

Verify deterministic output with fixed seed.

Verify compiler rejects a type mismatch connection.

16) Extension stubs (future)

Prompt:
Stub files only, no implementation:

core/src/nodes/MapNode.ts and type List<T> design sketch.

core/src/plugins/abi.md describing gRPC plugin contract.

core/src/security/secrets.ts placeholder interface.
Document how these will plug in without changing existing APIs.

These prompts should produce a running base system with strict typing, visual canvas, build/run, telemetry, and deterministic stub LLM, while keeping the architecture open for growth.
