import { NodeRegistry } from "../sdk/node.js";
import { registerBuiltins } from "../nodes/builtins.js";
import { orchestrate, } from "./orchestrator.js";
import { Scheduler } from "./scheduler.js";
import { randomUUID } from "crypto";
export { Scheduler } from "./scheduler.js";
export { initTelemetry, emit as emitTelemetry, heartbeat as telemetryHeartbeat, shutdownTelemetry, telemetryActive, resolveTelemetryRingPath, } from "./telemetry.js";
export function runFlow(flowBin, runtimeInputs, providers = {}, scheduler = new Scheduler()) {
    const registry = new NodeRegistry();
    registerBuiltins(registry);
    const runId = randomUUID();
    return orchestrate(flowBin, runtimeInputs, registry, providers, scheduler, runId);
}
