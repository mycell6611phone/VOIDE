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

// --- Channel definitions ---------------------------------------------------

export const flowValidate = {
  name: "flow:validate",
  request: Flow,
  response: z.object({
    ok: z.boolean(),
    errors: z.array(z.string())
  })
};

export type FlowValidateReq = z.infer<typeof flowValidate.request>;
export type FlowValidateRes = z.infer<typeof flowValidate.response>;

export const flowRun = {
  name: "flow:run",
  request: Flow,
  response: z.object({ runId: z.string() })
};

export type FlowRunReq = z.infer<typeof flowRun.request>;
export type FlowRunRes = z.infer<typeof flowRun.response>;

export const modelEnsure = {
  name: "model:ensure",
  request: z.object({ modelId: z.string() }),
  response: z.object({ ok: z.boolean() })
};

export type ModelEnsureReq = z.infer<typeof modelEnsure.request>;
export type ModelEnsureRes = z.infer<typeof modelEnsure.response>;

export const runLog = z.object({
  runId: z.string(),
  nodeId: z.string(),
  tokens: z.number(),
  latencyMs: z.number(),
  status: z.enum(["ok", "error"]),
  error: z.string().optional()
});

export type RunLog = z.infer<typeof runLog>;

export const telemetryEvent = {
  name: "telemetry:event",
  payload: runLog
};

export const appGetVersion = {
  name: "app:get-version",
  request: z.undefined(),
  response: z.string()
};

export type AppGetVersionRes = z.infer<typeof appGetVersion.response>;

