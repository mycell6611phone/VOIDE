import {
  flowValidate,
  flowRun,
  modelEnsure,
  telemetryEvent,
  appGetVersion,
  Flow,
  RunLog,
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
  fn: (arg: any) => Promise<unknown>,
  reqSchema: { safeParse(v: unknown): any },
  resSchema: { safeParse(v: unknown): any },
  payload: Req
): Promise<Res> {
  const parsed = reqSchema.safeParse(payload);
  if (!parsed.success) {
    throw <ValidationError>{ type: "validation", issues: parsed.error.issues };
  }
  const raw = await fn(parsed.data);
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
  validateFlow: (flow: Flow) => invoke<Flow, z.infer<typeof flowValidate.response>>(window.voide.validateFlow, flowValidate.request, flowValidate.response, flow),
  runFlow: (flow: Flow) => invoke<Flow, z.infer<typeof flowRun.response>>(window.voide.runFlow, flowRun.request, flowRun.response, flow),
  ensureModel: (modelId: string) => invoke<{ modelId: string }, z.infer<typeof modelEnsure.response>>(window.voide.ensureModel, modelEnsure.request, modelEnsure.response, { modelId }),
  getVersion: () => invoke<void, z.infer<typeof appGetVersion.response>>(window.voide.getVersion, appGetVersion.request, appGetVersion.response, undefined),
  onTelemetry: (cb: (log: RunLog) => void) => {
    window.voide.onTelemetry((ev: unknown) => {
      const parsed = telemetryEvent.payload.safeParse(ev);
      if (parsed.success) cb(parsed.data);
    });
  }
};

export type IPCClient = typeof ipcClient;

