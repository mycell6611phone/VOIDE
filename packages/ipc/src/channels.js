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
const FlowBuildSuccess = z.object({
    ok: z.literal(true),
    hash: z.string(),
    version: z.string(),
    cached: z.boolean().default(false),
    flow: Flow
});
const FlowBuildFailure = z.object({
    ok: z.literal(false),
    error: z.string(),
    errors: z.array(z.unknown()).default([])
});
const Role = z.enum(["system", "user", "assistant"]);
const TextPayload = z
    .object({
    kind: z.literal("text"),
    text: z.string(),
    rawInput: z.string().optional()
})
    .passthrough();
const JsonPayload = z
    .object({
    kind: z.literal("json"),
    value: z.any()
})
    .passthrough();
const MessagesPayload = z
    .object({
    kind: z.literal("messages"),
    messages: z.array(z
        .object({
        role: Role,
        content: z.string()
    })
        .passthrough())
})
    .passthrough();
const VectorPayload = z
    .object({
    kind: z.literal("vector"),
    values: z.array(z.number())
})
    .passthrough();
const FilePayload = z
    .object({
    kind: z.literal("file"),
    path: z.string(),
    mime: z.string()
})
    .passthrough();
const CodePayload = z
    .object({
    kind: z.literal("code"),
    language: z.string(),
    text: z.string()
})
    .passthrough();
const MetricsPayload = z
    .object({
    kind: z.literal("metrics"),
    data: z.record(z.number())
})
    .passthrough();
export const Payload = z.discriminatedUnion("kind", [
    TextPayload,
    JsonPayload,
    MessagesPayload,
    VectorPayload,
    FilePayload,
    CodePayload,
    MetricsPayload
]);
export const NodeCatalogEntry = z
    .object({
    type: z.string(),
    label: z.string(),
    inputs: z.array(Port).default([]),
    outputs: z.array(Port).default([]),
    params: z.record(z.any()).default({})
})
    .passthrough();
// --- Channel definitions ---------------------------------------------------
export const flowValidate = {
    name: "flow:validate",
    request: Flow,
    response: z.object({
        ok: z.boolean(),
        errors: z.array(z.unknown())
    })
};
export const flowBuild = {
    name: "flow:build",
    request: Flow,
    response: z.union([FlowBuildSuccess, FlowBuildFailure])
};
export const flowOpen = {
    name: "flow:open",
    request: z.undefined(),
    response: z.union([
        z.object({
            canceled: z.literal(true)
        }),
        z.object({
            path: z.string().optional(),
            flow: Flow
        }),
        z.object({
            error: z.string()
        })
    ])
};
export const flowSave = {
    name: "flow:save",
    request: z.object({
        flow: Flow,
        filePath: z.string().optional().nullable()
    }),
    response: z.union([
        z.object({
            path: z.string().optional().nullable()
        }),
        z.object({
            error: z.string()
        })
    ])
};
export const flowLastOpened = {
    name: "flow:last-opened",
    request: z.undefined(),
    response: z.union([
        z.object({
            flow: Flow
        }),
        z.object({
            empty: z.literal(true)
        }),
        z.object({
            error: z.string()
        })
    ])
};
export const flowRun = {
    name: "flow:run",
    request: z.object({
        compiledHash: z.string(),
        inputs: z.record(z.any()).default({})
    }),
    response: z.object({ runId: z.string() })
};
export const flowStop = {
    name: "flow:stop",
    request: z.object({ runId: z.string() }),
    response: z.object({ ok: z.boolean() })
};
export const flowLastRunPayloads = {
    name: "flow:last-run-payloads",
    request: z.object({ runId: z.string() }),
    response: z.array(z.object({
        nodeId: z.string(),
        port: z.string(),
        payload: Payload
    }))
};
export const flowRunPayloadsEvent = {
    name: "flow:last-run-payloads:event",
    payload: z.object({
        runId: z.string(),
        payloads: flowLastRunPayloads.response,
    }),
};
export const catalogList = {
    name: "catalog:list",
    request: z.undefined(),
    response: z.array(NodeCatalogEntry)
};
const moduleTestInput = z.object({
    port: z.string(),
    payload: Payload
});
const moduleTestProgress = z
    .object({
    tokens: z.number().optional(),
    latencyMs: z.number().optional(),
    status: z.enum(["ok", "error"]).optional(),
    message: z.string().optional(),
    at: z.number().optional()
})
    .passthrough();
const moduleTestLog = z
    .object({
    tag: z.string().nullable().optional(),
    payload: z.unknown()
})
    .passthrough();
const moduleTestSuccess = z.object({
    ok: z.literal(true),
    outputs: z
        .array(z.object({
        port: z.string(),
        payload: Payload
    }))
        .default([]),
    progress: z.array(moduleTestProgress).default([]),
    logs: z.array(moduleTestLog).default([])
});
const moduleTestFailure = z.object({
    ok: z.literal(false),
    error: z.string(),
    progress: z.array(moduleTestProgress).default([]),
    logs: z.array(moduleTestLog).default([])
});
export const moduleTest = {
    name: "module:test",
    request: z.object({
        node: Node,
        inputs: z.array(moduleTestInput).default([])
    }),
    response: z.union([moduleTestSuccess, moduleTestFailure])
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
export const appExit = {
    name: "app:exit",
    request: z.undefined(),
    response: z.object({ ok: z.boolean() })
};
