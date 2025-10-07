import {
  flowValidate,
  flowRun,
  modelEnsure,
  telemetryEvent,
  appGetVersion,
  Flow,
  TelemetryPayload,
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
  callArgs?: (req: Req) => unknown[]
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
    invoke<Flow, z.infer<typeof flowValidate.response>>(window.voide.validateFlow, flowValidate.request, flowValidate.response, flow),
  runFlow: (flow: Flow, inputs: Record<string, unknown> = {}) =>
    invoke<{ flow: Flow; inputs?: Record<string, unknown> }, z.infer<typeof flowRun.response>>(
      window.voide.runFlow,
      flowRun.request,
      flowRun.response,
      { flow, inputs },
      (req) => [req.flow, req.inputs ?? {}]
    ),
  ensureModel: (modelId: string) =>
    invoke<{ modelId: string }, z.infer<typeof modelEnsure.response>>(window.voide.ensureModel, modelEnsure.request, modelEnsure.response, { modelId }),
  getVersion: () =>
    invoke<void, z.infer<typeof appGetVersion.response>>(window.voide.getVersion, appGetVersion.request, appGetVersion.response, undefined),
  onTelemetry: (cb: (ev: TelemetryPayload) => void) => {
    window.voide.onTelemetry((evRaw: unknown) => {
      const parsed = telemetryEvent.payload.safeParse(evRaw);
      if (parsed.success) cb(parsed.data);
    });
  }
};

export type IPCClient = typeof ipcClient;

