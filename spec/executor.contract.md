# VOIDE Executor Contract

## Runtime entrypoint
- **API:** `runFlow(flowBin, runtimeInputs, providers?, scheduler?)` in `core/src/run/index.ts`.
- **Compiled artifact:** `flowBin` must be a protobuf produced by `core/src/build/compiler.ts` from a validated JSON flow.
- **Context bootstrap:** `runFlow` creates a fresh `NodeRegistry`, registers builtin handlers via `registerBuiltins`, generates a `runId` (UUID), and returns the async generator from `orchestrate`.

## Node registry
- **Handler shape:** Each handler implements `{ kind, inPorts, outPorts, execute({ config, inputs, context, providers }) }` (`core/src/sdk/node.ts`).
- **Type gating:** Registration encodes a sample value for every declared port through `globalTypeRegistry` to ensure codecs exist (`core/src/runtime/types.ts`). Unknown types throw during registration.
- **Builtin coverage:** `registerBuiltins` wires Input, Prompt, LLM, Branch, RouterDivider, BulletListNormalizer, Log, and Output nodes (see `core/src/nodes/builtins.ts`). Additional handlers can be registered before invoking `orchestrate` for custom modules.

## Execution model (`core/src/run/orchestrator.ts`)
1. **Decode** the protobuf into `pb.Flow`, keeping `Map` lookups for nodes and adjacency lists for inbound/outbound edges.
2. **Seed** node state: nodes with zero inbound edges enter the `ready` queue and emit an initial `node_state: queued` event.
3. **Scheduling loop:**
   - Await `scheduler.next()` before each dispatch. The default `Scheduler` supports pause/resume/step/cancel semantics (`core/src/run/scheduler.ts`).
   - Pop the next node id (alphabetically after sort), mark it `running`, and emit `node_state: running`.
   - Build the `inputs` object by draining edge mailboxes destined for each inbound port.
   - Resolve the handler via `NodeRegistry.get(kind)` and derive `config` via `nodeConfig(node)` (builtin defaults such as `InputNode.id := node.id`, `OutputNode.name := node.id`).
   - Execute `handler.execute` under a 5 000 ms timeout (`withTimeout`). `DEFAULT_RETRIES` is currently `0`; the first failure terminates execution.
4. **Output fan-out:**
   - Push returned values into each outbound edge mailbox by port name.
   - Emit `edge_transfer` telemetry with the JSON-stringified payload length as `bytes`.
   - Check if downstream nodes now have values for every inbound port; enqueue and emit `node_state: queued` as soon as they are unblocked.
5. **Completion:** When the queue drains without error, emit `node_state: ok` for the finished node and eventually return `{ outputs: ctx.outputs }` (populated by handlers like `OutputNode`).

## Telemetry events
- `node_state` – `{ runId, nodeId, state, at }` for lifecycle transitions (`queued`, `running`, `ok`, `warn`, `error`).
- `edge_transfer` – `{ runId, edgeId, bytes, at }` whenever data leaves a node.
- `normalize` – reserved for type coercions (currently unused but part of the union type).
- `error` – `{ runId, nodeId, code: "runtime", message, at }` emitted alongside the `node_state:error` transition.

## Error handling
- **Timeouts:** Any handler exceeding 5 s triggers an `Error("timeout")`, emits telemetry for the offending node, and the exception bubbles to the consumer.
- **Handler errors:** Thrown errors are surfaced verbatim after telemetry. With `DEFAULT_RETRIES = 0`, there is no automatic retry.
- **Scheduler cancellation:** Calling `scheduler.cancel()` causes `scheduler.next()` to throw `Error("cancelled")`, halting orchestration.

## Providers and inputs
- **Providers map:** Optional `providers` argument is a dictionary of LLM adapters. Builtins expect at least a `StubProvider` keyed by the requested `config.model`.
- **Runtime inputs:** CLI users supply `--input key=value`; `runFlow` stores them on `RunnerContext.inputs`. `InputNode` reads `context.inputs[config.id]` (node id by default).
- **Outputs:** Modules that need to surface values should write to `context.outputs`. The CLI prints the resulting object after emitting `DONE`.

## Extensibility guidelines
- **New node kinds:** Register new handlers before calling `runFlow` so `NodeRegistry` can validate port codecs and make them available during orchestration.
- **Custom schedulers:** Provide a scheduler subclass (e.g., to enforce concurrency limits) by implementing the same `next/pause/resume/step/cancel` API contract.
- **Telemetry consumers:** Treat the async generator as a hot stream—callers should iterate until completion to observe `DONE` or capture the first thrown error.
