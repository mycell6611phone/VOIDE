import { ipcMain, app } from "electron";
import {
  flowValidate,
  flowRun,
  modelEnsure,
  appGetVersion,
  chatWindowOpen,
  appExit,
} from "@voide/ipc";
import { validateFlow } from "../services/validate.js";
import { runFlow } from "../orchestrator/engine.js";
import { getModelRegistry } from "../services/models.js";

function formatError(err: unknown) {
  return { error: String(err) };
}

type HandlerDeps = {
  openChatWindow: () => Promise<unknown> | unknown;
  exitApplication: () => Promise<void> | void;
};

export function registerHandlers(deps: HandlerDeps) {
  ipcMain.handle(flowValidate.name, async (_e, payload) => {
    const parsed = flowValidate.request.safeParse(payload);
    if (!parsed.success) return formatError(parsed.error.flatten());
    const res = validateFlow(parsed.data as any);
    const errs = res.errors.map((e: any) => JSON.stringify(e));
    return flowValidate.response.parse({ ok: res.ok, errors: errs });
  });

  ipcMain.handle(flowRun.name, async (_e, payload) => {
    const parsed = flowRun.request.safeParse(payload);
    if (!parsed.success) return formatError(parsed.error.flatten());
    try {
      const out = await runFlow(parsed.data as any);
      return flowRun.response.parse(out);
    } catch (err) {
      return formatError(err);
    }
  });

  ipcMain.handle(modelEnsure.name, async (_e, payload) => {
    const parsed = modelEnsure.request.safeParse(payload);
    if (!parsed.success) return formatError(parsed.error.flatten());
    try {
      const reg = await getModelRegistry();
      const ok = Array.isArray(reg.models) && reg.models.some((m: any) => m.id === parsed.data.modelId);
      return modelEnsure.response.parse({ ok });
    } catch (err) {
      return formatError(err);
    }
  });

  ipcMain.handle(appGetVersion.name, async () => {
    try {
      const v = app.getVersion();
      return appGetVersion.response.parse(v);
    } catch (err) {
      return formatError(err);
    }
  });

  ipcMain.handle(chatWindowOpen.name, async () => {
    try {
      await deps.openChatWindow();
      return chatWindowOpen.response.parse({ ok: true });
    } catch (err) {
      return formatError(err);
    }
  });

  ipcMain.handle(appExit.name, async () => {
    try {
      await deps.exitApplication();
      return appExit.response.parse({ ok: true });
    } catch (err) {
      return formatError(err);
    }
  });
}

