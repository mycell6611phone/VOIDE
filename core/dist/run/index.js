import { NodeRegistry } from "../sdk/node.js";
import { registerBuiltins } from "../nodes/builtins.js";
import { orchestrate } from "./orchestrator.js";
export function runFlow(flowBin, runtimeInputs, providers = {}) {
    const registry = new NodeRegistry();
    registerBuiltins(registry);
    return orchestrate(flowBin, runtimeInputs, registry, providers);
}
