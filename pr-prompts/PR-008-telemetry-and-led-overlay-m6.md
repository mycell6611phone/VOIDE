# PR: Step 08 — Telemetry & LED Overlay (Milestone 6)

## Prompt for Codex
Create a telemetry event bus in main and stream updates to the renderer. Add a canvas LED overlay: green=activity, orange=schema violation, off=idle. Freeze LEDs on stop and restore on restart.

### Required Changes
- `packages/main/src/telemetry/bus.ts`: typed event emitter with backpressure-safe queue.
- IPC push channel `telemetry:event`.
- `packages/renderer/src/features/canvas/RunLEDOverlay.tsx`: subscribes to events, shows per-node LEDs.
- Persist last LED state in runtime snapshot.

### Acceptance Criteria
- LEDs reflect node activity and schema events in a running sample flow.
- LEDs freeze on stop and restore on restart.

