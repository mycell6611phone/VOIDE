import { NodeRegistry } from "../sdk/node";
import { registerBuiltins } from "../nodes/builtins";
import { orchestrate, } from "./orchestrator";
import { Scheduler } from "./scheduler";
import { randomUUID } from "crypto";
export { Scheduler } from "./scheduler";
export function runFlow(flowBin, runtimeInputs, providers = {}, scheduler = new Scheduler()) {
    const registry = new NodeRegistry();
    registerBuiltins(registry);
    const runId = randomUUID();
    return orchestrate(flowBin, runtimeInputs, registry, providers, scheduler, runId);
}
