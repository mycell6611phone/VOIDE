# Agent Instructions

## Project Focus
- Primary development has shifted to backend systems. Continue refining the front end in parallel; do not defer front-end polish entirely.
- Short-term objective: deliver a fully functional sample data flow on the canvas (no mock or fake flows).

## Data Flow Milestones
1. **Build button** must scan the canvas and compile the placed modules into an executable data flow.
2. **Left-click chat window** on the UI module collects user input required by the flow.
3. **Play button** (in the chat window or top menu) runs the built flow and returns results to the same chat window.

Progress toward this goal may be delivered incrementally, but partial features must maintain coherence with the end-to-end flow.

## Backend Contract
- Protocol definition: author all flow, run-control, and telemetry messages in `proto/voide.proto`. This proto is the single source of truth for wire contracts.
- Code generation: use `ts-proto` targeting `grpc-js` (`outputServices=grpc-js`). Commit generated TypeScript types and stubs.
- Service surface: expose an `Orchestrator` service with `StartRun`, `StopRun`, and server-streaming `StreamTelemetry`. Optionally include a bi-directional `Control` stream for live commands.
- Transport: rely exclusively on `@grpc/grpc-js` over Protocol Buffers. Use JSON solely for debugging purposes.
- Telemetry log: persist `TelemetryEvent` data as length-delimited protobuf frames (encodeDelimited/decodeDelimited) for replay.
- Compatibility: never reuse removed field numbers; mark them reserved when deprecating. Stick to proto3 defaults only.

## Scope Guard
These backend directives must not alter existing UI behavior, IPC semantics, or other business logic outside the defined interfaces.
