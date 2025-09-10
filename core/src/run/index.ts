import { NodeRegistry } from "../sdk/node";
import { registerBuiltins, Providers } from "../nodes/builtins";
import { orchestrate, TelemetryEvent, RunResult } from "./orchestrator";

export { TelemetryEvent, RunResult } from "./orchestrator";

export function runFlow(
  flowBin: Uint8Array,
  runtimeInputs: Record<string, any>,
  providers: Providers = {}
): AsyncGenerator<TelemetryEvent, RunResult> {
  const registry = new NodeRegistry();
  registerBuiltins(registry);
  return orchestrate(flowBin, runtimeInputs, registry, providers);
}

