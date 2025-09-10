import { NodeRegistry } from "../sdk/node.js";
import { registerBuiltins, Providers } from "../nodes/builtins.js";
import { orchestrate, TelemetryEvent, RunResult } from "./orchestrator.js";

export { TelemetryEvent, RunResult } from "./orchestrator.js";

export function runFlow(
  flowBin: Uint8Array,
  runtimeInputs: Record<string, any>,
  providers: Providers = {}
): AsyncGenerator<TelemetryEvent, RunResult> {
  const registry = new NodeRegistry();
  registerBuiltins(registry);
  return orchestrate(flowBin, runtimeInputs, registry, providers);
}

