import { NodeRegistry } from "../sdk/node.js";
import { registerBuiltins, Providers } from "../nodes/builtins.js";
import {
  orchestrate,
  TelemetryEvent,
  RunResult,
  NodeStatus,
} from "./orchestrator.js";
import { Scheduler } from "./scheduler.js";
import { randomUUID } from "crypto";

export { TelemetryEvent, RunResult, NodeStatus } from "./orchestrator.js";
export { Scheduler } from "./scheduler.js";
export {
  initTelemetry,
  emit as emitTelemetry,
  heartbeat as telemetryHeartbeat,
  shutdownTelemetry,
  telemetryActive,
  TelemetryEventType,
  TelemetryEvt,
  TelemetryInitOptions,
  resolveTelemetryRingPath,
} from "./telemetry.js";

export function runFlow(
  flowBin: Uint8Array,
  runtimeInputs: Record<string, any>,
  providers: Providers = {},
  scheduler: Scheduler = new Scheduler(),
): AsyncGenerator<TelemetryEvent, RunResult> {
  const registry = new NodeRegistry();
  registerBuiltins(registry);
  const runId = randomUUID();
  return orchestrate(flowBin, runtimeInputs, registry, providers, scheduler, runId);
}

