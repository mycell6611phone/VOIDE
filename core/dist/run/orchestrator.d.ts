import { NodeRegistry } from "../sdk/node.js";
import { Providers } from "../nodes/builtins.js";
import { Scheduler } from "./scheduler.js";
export type NodeStatus = "idle" | "queued" | "running" | "ok" | "warn" | "error";
export type TelemetryEvent = {
    type: "node_state";
    runId: string;
    nodeId: string;
    state: NodeStatus;
    at: number;
} | {
    type: "edge_transfer";
    runId: string;
    edgeId: string;
    bytes: number;
    at: number;
} | {
    type: "normalize";
    runId: string;
    nodeId: string;
    fromType: string;
    toType: string;
    at: number;
} | {
    type: "error";
    runId: string;
    nodeId: string;
    code: string;
    message: string;
    at: number;
};
export interface RunResult {
    outputs: Record<string, any>;
}
export declare function orchestrate(flowBin: Uint8Array, runtimeInputs: Record<string, any>, registry: NodeRegistry, providers: Providers | undefined, scheduler: Scheduler | undefined, runId: string): AsyncGenerator<TelemetryEvent, RunResult>;
