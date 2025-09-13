import { NodeRegistry } from "../sdk/node";
import { registerBuiltins, Providers } from "../nodes/builtins";
import {
  orchestrate,
  TelemetryEvent,
  RunResult,
  NodeStatus,
} from "./orchestrator";
import { Scheduler } from "./scheduler";
import { randomUUID } from "crypto";

export { TelemetryEvent, RunResult, NodeStatus } from "./orchestrator";
export { Scheduler } from "./scheduler";

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

