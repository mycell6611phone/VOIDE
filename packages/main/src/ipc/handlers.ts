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
import { runFlow, getLastRunPayloads } from "../orchestrator/engine.js";
import { getModelRegistry } from "../services/models.js";
import { emitRunPayloads } from "./telemetry.js";

function formatError(err: unknown) {
  return { error: String(err) };
}

type HandlerDeps = {
  openChatWindow: () => Promise<unknown> | unknown;
  exitApplication: () => Promise<void> | void;
};

const legacyChannelNames: Record<string, readonly string[]> = {
  [flowValidate.name]: ["voide:validateFlow"],
  [flowRun.name]: ["voide:runFlow"],
};

function bindHandler(
  channel: { name: string },
  handler: Parameters<typeof ipcMain.handle>[1],
  legacy: readonly string[] = [],
) {
  const names = [channel.name, ...legacy];
  for (const name of names) {
    ipcMain.removeHandler(name);
    ipcMain.handle(name, handler);
  }
}

export function registerHandlers(deps: HandlerDeps) {
  bindHandler(flowValidate, async (_e, payload) => {
    const parsed = flowValidate.request.safeParse(payload);
    if (!parsed.success) {
      return flowValidate.response.parse({
        ok: false,
        errors: parsed.error.errors ?? [],
      });
    }
    const res = validateFlow(parsed.data as any);

    return flowValidate.response.parse({
      ok: res.ok,
      errors: Array.isArray(res.errors) ? res.errors : [],
    });
  }, legacyChannelNames[flowValidate.name] ?? []);


  bindHandler(flowRun, async (_e, payload) => {
    const parsed = flowRun.request.safeParse(payload);
    if (!parsed.success) return formatError(parsed.error.flatten());
    try {
      const out = await runFlow(parsed.data.flow as any, parsed.data.inputs ?? {});
      try {
        const payloads = await getLastRunPayloads(out.runId);
        emitRunPayloads(out.runId, payloads);
      } catch (err) {
        console.warn("Failed to stream run payloads", err);
      }
      return flowRun.response.parse(out);
    } catch (err) {
      return formatError(err);
    }
  }, legacyChannelNames[flowRun.name] ?? []);

  bindHandler(modelEnsure, async (_e, payload) => {
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

  bindHandler(appGetVersion, async () => {
    try {
      const v = app.getVersion();
      return appGetVersion.response.parse(v);
    } catch (err) {
      return formatError(err);
    }
  });

  bindHandler(chatWindowOpen, async () => {
    try {
      await deps.openChatWindow();
      return chatWindowOpen.response.parse({ ok: true });
    } catch (err) {
      return formatError(err);
    }
  });

  bindHandler(appExit, async () => {
    try {
      await deps.exitApplication();
      return appExit.response.parse({ ok: true });
    } catch (err) {
      return formatError(err);
    }
  });
}

