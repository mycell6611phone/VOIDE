import { z } from "zod";
// --- Flow schema -----------------------------------------------------------
const Port = z
    .object({
    port: z.string(),
    types: z.array(z.string()).default([])
})
    .passthrough();
const Node = z
    .object({
    id: z.string(),
    type: z.string(),
    name: z.string().optional(),
    params: z.record(z.any()).default({}),
    in: z.array(Port).default([]),
    out: z.array(Port).default([])
})
    .passthrough();
const Edge = z
    .object({
    id: z.string().optional(),
    from: z.tuple([z.string(), z.string()]),
    to: z.tuple([z.string(), z.string()]),
    label: z.string().optional()
})
    .passthrough();
export const Flow = z
    .object({
    id: z.string(),
    version: z.string().default("1.0.0"),
    nodes: z.array(Node).default([]),
    edges: z.array(Edge).default([])
})
    .passthrough();
// --- Channel definitions ---------------------------------------------------
export const flowValidate = {
    name: "flow:validate",
    request: Flow,
    response: z.object({
        ok: z.boolean(),
        errors: z.array(z.string())
    })
};
export const flowRun = {
    name: "flow:run",
    request: Flow,
    response: z.object({ runId: z.string() })
};
export const modelEnsure = {
    name: "model:ensure",
    request: z.object({ modelId: z.string() }),
    response: z.object({ ok: z.boolean() })
};
const nodeState = z.object({
    type: z.literal("node_state"),
    runId: z.string(),
    nodeId: z.string(),
    state: z.string(),
    at: z.number(),
});
const edgeTransfer = z.object({
    type: z.literal("edge_transfer"),
    runId: z.string(),
    edgeId: z.string(),
    bytes: z.number(),
    at: z.number(),
});
const normalize = z.object({
    type: z.literal("normalize"),
    runId: z.string(),
    nodeId: z.string(),
    fromType: z.string(),
    toType: z.string(),
    at: z.number(),
});
const error = z.object({
    type: z.literal("error"),
    runId: z.string(),
    nodeId: z.string(),
    code: z.string(),
    message: z.string(),
    at: z.number(),
});
const operationProgress = z.object({
    type: z.literal("operation_progress"),
    runId: z.string(),
    nodeId: z.string(),
    tokens: z.number(),
    latencyMs: z.number(),
    status: z.enum(["ok", "error"]),
    reason: z.string().optional(),
});
export const telemetryPayload = z.union([
    nodeState,
    edgeTransfer,
    normalize,
    error,
    operationProgress,
]);
export const telemetryEvent = {
    name: "telemetry:event",
    payload: telemetryPayload,
};
export const appGetVersion = {
    name: "app:get-version",
    request: z.undefined(),
    response: z.string()
};
export const chatWindowOpen = {
    name: "chat:open",
    request: z.undefined(),
    response: z.object({ ok: z.boolean() })
};
