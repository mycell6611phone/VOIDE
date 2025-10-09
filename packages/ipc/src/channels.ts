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

export type Flow = z.infer<typeof Flow>;

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
    messages: z.array(
      z
        .object({
          role: Role,
          content: z.string()
        })
        .passthrough()
    )
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

export type Payload = z.infer<typeof Payload>;

export const NodeCatalogEntry = z
  .object({
    type: z.string(),
    label: z.string(),
    inputs: z.array(Port).default([]),
    outputs: z.array(Port).default([]),
    params: z.record(z.any()).default({})
  })
  .passthrough();

export type NodeCatalogEntry = z.infer<typeof NodeCatalogEntry>;

// --- Channel definitions ---------------------------------------------------

export const flowValidate = {
  name: "flow:validate",
  request: Flow,
  response: z.object({
    ok: z.boolean(),
    errors: z.array(z.unknown())
  })
};

export type FlowValidateReq = z.infer<typeof flowValidate.request>;
export type FlowValidateRes = z.infer<typeof flowValidate.response>;

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

export type FlowOpenReq = z.infer<typeof flowOpen.request>;
export type FlowOpenRes = z.infer<typeof flowOpen.response>;

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

export type FlowSaveReq = z.infer<typeof flowSave.request>;
export type FlowSaveRes = z.infer<typeof flowSave.response>;

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

export type FlowLastOpenedReq = z.infer<typeof flowLastOpened.request>;
export type FlowLastOpenedRes = z.infer<typeof flowLastOpened.response>;

export const flowRun = {
  name: "flow:run",
  request: z.object({
    flow: Flow,
    inputs: z.record(z.any()).default({})
  }),
  response: z.object({ runId: z.string() })
};

export type FlowRunReq = z.infer<typeof flowRun.request>;
export type FlowRunRes = z.infer<typeof flowRun.response>;

export const flowStop = {
  name: "flow:stop",
  request: z.object({ runId: z.string() }),
  response: z.object({ ok: z.boolean() })
};

export type FlowStopReq = z.infer<typeof flowStop.request>;
export type FlowStopRes = z.infer<typeof flowStop.response>;

export const flowLastRunPayloads = {
  name: "flow:last-run-payloads",
  request: z.object({ runId: z.string() }),
  response: z.array(
    z.object({
      nodeId: z.string(),
      port: z.string(),
      payload: Payload
    })
  )
};

export type FlowLastRunPayloadsReq = z.infer<typeof flowLastRunPayloads.request>;
export type FlowLastRunPayloadsRes = z.infer<typeof flowLastRunPayloads.response>;

export const flowRunPayloadsEvent = {
  name: "flow:last-run-payloads:event",
  payload: z.object({
    runId: z.string(),
    payloads: flowLastRunPayloads.response,
  }),
};

export type FlowRunPayloadsEvent = z.infer<typeof flowRunPayloadsEvent.payload>;

export const catalogList = {
  name: "catalog:list",
  request: z.undefined(),
  response: z.array(NodeCatalogEntry)
};

export type CatalogListReq = z.infer<typeof catalogList.request>;
export type CatalogListRes = z.infer<typeof catalogList.response>;

export const modelEnsure = {
  name: "model:ensure",
  request: z.object({ modelId: z.string() }),
  response: z.object({ ok: z.boolean() })
};

export type ModelEnsureReq = z.infer<typeof modelEnsure.request>;
export type ModelEnsureRes = z.infer<typeof modelEnsure.response>;

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

export type TelemetryPayload = z.infer<typeof telemetryPayload>;

export const telemetryEvent = {
  name: "telemetry:event",
  payload: telemetryPayload,
};

export const appGetVersion = {
  name: "app:get-version",
  request: z.undefined(),
  response: z.string()
};

export type AppGetVersionRes = z.infer<typeof appGetVersion.response>;

export const chatWindowOpen = {
  name: "chat:open",
  request: z.undefined(),
  response: z.object({ ok: z.boolean() })
};

export type ChatWindowOpenRes = z.infer<typeof chatWindowOpen.response>;

export const appExit = {
  name: "app:exit",
  request: z.undefined(),
  response: z.object({ ok: z.boolean() })
};

export type AppExitRes = z.infer<typeof appExit.response>;

