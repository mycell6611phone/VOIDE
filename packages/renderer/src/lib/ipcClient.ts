import {
  catalogList,
  flowLastRunPayloads,
  flowOpen,
  flowRun,
  flowSave,
  flowLastOpened,
  flowStop,
  flowValidate,
  modelEnsure,
  telemetryEvent,
  appGetVersion,
  flowRunPayloadsEvent,
  FlowRunPayloadsEvent,
  Flow,
  FlowOpenRes,
  FlowSaveRes,
  FlowLastOpenedRes,
  FlowStopRes,
  FlowLastRunPayloadsRes,
  NodeCatalogEntry,
  TelemetryPayload,
  moduleTest,
  ModuleTestRes,
} from "@voide/ipc";
import { z } from "zod";

type ValidationError = {
  type: "validation";
  issues: unknown;
};

type IPCError = {
  type: "ipc";
  error: unknown;
};

async function invoke<Req, Res>(
  fn: (...args: any[]) => Promise<unknown>,
  reqSchema: { safeParse(v: unknown): any },
  resSchema: { safeParse(v: unknown): any },
  payload: Req,
  callArgs?: (req: Req) => unknown[],
): Promise<Res> {
  const parsed = reqSchema.safeParse(payload);
  if (!parsed.success) {
    throw <ValidationError>{ type: "validation", issues: parsed.error.issues };
  }
  const args = callArgs ? callArgs(parsed.data) : [parsed.data];
  const raw = await fn(...args);
  if (raw && typeof raw === "object" && "error" in raw) {
    throw <IPCError>{ type: "ipc", error: (raw as any).error };
  }
  const out = resSchema.safeParse(raw);
  if (!out.success) {
    throw <ValidationError>{ type: "validation", issues: out.error.issues };
  }
  return out.data as Res;
}

export const ipcClient = {
  validateFlow: (flow: Flow) =>
    invoke<Flow, z.infer<typeof flowValidate.response>>(window.voide.validateFlow, flowValidate.request, flowValidate.response,
 flow),
  openFlow: () =>
    invoke<void, FlowOpenRes>(
      window.voide.openFlow,
      flowOpen.request,
      flowOpen.response,
      undefined as unknown as void,
      () => [],
    ),
  saveFlow: (flow: Flow, filePath?: string | null) =>
    invoke<{ flow: Flow; filePath?: string | null }, FlowSaveRes>(
      window.voide.saveFlow,
      flowSave.request,
      flowSave.response,
      { flow, filePath: filePath ?? null },
      (req) => [req.flow, req.filePath ?? null],
    ),
  runFlow: (flow: Flow, inputs: Record<string, unknown> = {}) =>
    invoke<{ flow: Flow; inputs?: Record<string, unknown> }, z.infer<typeof flowRun.response>>(
      window.voide.runFlow,
      flowRun.request,
      flowRun.response,
      { flow, inputs },
      (req) => [req.flow, req.inputs ?? {}],
    ),
  stopFlow: (runId: string) =>
    invoke<{ runId: string }, FlowStopRes>(
      window.voide.stopFlow,
      flowStop.request,
      flowStop.response,
      { runId },
      (req) => [req.runId],
    ),
  getLastRunPayloads: (runId: string) =>
    invoke<{ runId: string }, FlowLastRunPayloadsRes>(
      window.voide.getLastRunPayloads,
      flowLastRunPayloads.request,
      flowLastRunPayloads.response,
      { runId },
      (req) => [req.runId],
    ),
  getLastOpenedFlow: async (): Promise<Flow | null> => {
    const result = await invoke<void, FlowLastOpenedRes>(
      window.voide.getLastOpenedFlow,
      flowLastOpened.request,
      flowLastOpened.response,
      undefined as unknown as void,
      () => [],
    );
    if (result && typeof result === "object" && "empty" in result) {
      return null;
    }
    return (result as { flow: Flow }).flow;
  },
  getNodeCatalog: () =>
    invoke<void, NodeCatalogEntry[]>(
      window.voide.getNodeCatalog,
      catalogList.request,
      catalogList.response,
      undefined as unknown as void,
      () => [],
    ),
  ensureModel: (modelId: string) =>
    invoke<{ modelId: string }, z.infer<typeof modelEnsure.response>>(
      window.voide.ensureModel,
      modelEnsure.request,
      modelEnsure.response,
      { modelId },
      (req) => [req.modelId],
    ),
  getVersion: () =>
    invoke<void, z.infer<typeof appGetVersion.response>>(
      window.voide.getVersion,
      appGetVersion.request,
      appGetVersion.response,
      undefined as unknown as void,
      () => [],
    ),
  onTelemetry: (cb: (ev: TelemetryPayload) => void) => {
    const handler = (evRaw: unknown) => {
      const parsed = telemetryEvent.payload.safeParse(evRaw);
      if (parsed.success) cb(parsed.data);
    };
    const unsubscribe = window.voide.onTelemetry(handler as (ev: TelemetryPayload) => void);
    return typeof unsubscribe === "function"
      ? () => {
          unsubscribe();
        }
      : undefined;
  },
  onRunPayloads: (cb: (event: FlowRunPayloadsEvent) => void) => {
    const handler = (evRaw: unknown) => {
      const parsed = flowRunPayloadsEvent.payload.safeParse(evRaw);
      if (parsed.success) cb(parsed.data);
    };
    const unsubscribe = window.voide.onRunPayloads?.(
      handler as (event: FlowRunPayloadsEvent) => void,
    );
    return typeof unsubscribe === "function"
      ? () => {
          unsubscribe();
        }
      : undefined;
  },
  testModule: (
    node: Flow["nodes"][number],
    inputs: Array<{ port: string; payload: unknown }> = [],
  ) =>
    invoke<{ node: Flow["nodes"][number]; inputs: typeof inputs }, ModuleTestRes>(
      window.voide.testModule,
      moduleTest.request,
      moduleTest.response,
      { node, inputs },
      (req) => [req.node, req.inputs ?? []],
    ),
};

export type IPCClient = typeof ipcClient;
