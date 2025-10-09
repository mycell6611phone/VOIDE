import { ipcMain, dialog } from "electron";
import fs from "fs";
import Ajv from "ajv";
import { flowSchema } from "@voide/schemas";
import type { FlowDef } from "@voide/shared";
import {
  catalogList,
  flowLastRunPayloads,
  flowLastOpened,
  flowOpen,
  flowRun,
  flowSave,
  flowStop,
  flowValidate
} from "@voide/ipc";
import { persistFlow, rememberLastOpenedFlow, readLastOpenedFlow } from "./services/db.js";
import { getSecretsService } from "./services/secrets.js";
import { runFlow, stopFlow, stepFlow, getNodeCatalog, getLastRunPayloads } from "./orchestrator/engine.js";
import { emitRunPayloads } from "./ipc/telemetry.js";
import { getModelRegistry, installModel } from "./services/models.js";

const AjvCtor = Ajv as any;
const ajv = new AjvCtor({ allErrors: true, allowUnionTypes: true });
const validate = ajv.compile(flowSchema as any);

export function setupIPC() {
  const registerChannel = (
    name: string,
    handler: Parameters<typeof ipcMain.handle>[1],
    legacyNames: string[] = []
  ) => {
    ipcMain.handle(name, handler);
    for (const legacy of legacyNames) {
      ipcMain.handle(legacy, handler);
    }
  };

  const handleOpenFlow: Parameters<typeof ipcMain.handle>[1] = async () => {
    const { canceled, filePaths } = await dialog.showOpenDialog({
      filters: [{ name: "Flow", extensions: ["json"] }]
    });
    if (canceled || !filePaths[0]) return { canceled: true };

    try {
      const json = JSON.parse(fs.readFileSync(filePaths[0], "utf-8"));
      if (!validate(json)) return { error: ajv.errorsText(validate.errors) };
      const parsedFlow = json as FlowDef;
      persistFlow(parsedFlow);
      await rememberLastOpenedFlow(parsedFlow.id);
      return { path: filePaths[0], flow: parsedFlow };
    } catch (error) {
      return { error: error instanceof Error ? error.message : "Failed to open flow" };
    }
  };

  const handleSaveFlow: Parameters<typeof ipcMain.handle>[1] = async (_e, raw: unknown) => {
    const parsed = flowSave.request.safeParse(raw);
    if (!parsed.success) {
      return { error: parsed.error.message };
    }
    const { flow, filePath } = parsed.data;
    if (!validate(flow)) return { error: ajv.errorsText(validate.errors) };
    try {
      persistFlow(flow as FlowDef);
      await rememberLastOpenedFlow(flow.id);
      const savePath = filePath ?? null;
      if (savePath) {
        fs.writeFileSync(savePath, JSON.stringify(flow, null, 2));
      }
      return { path: savePath };
    } catch (error) {
      return { error: error instanceof Error ? error.message : "Failed to save flow" };
    }
  };

  const handleLastOpenedFlow: Parameters<typeof ipcMain.handle>[1] = async () => {
    try {
      const stored = await readLastOpenedFlow();
      if (!stored) {
        return { empty: true as const };
      }
      return { flow: stored.flow };
    } catch (error) {
      return { error: error instanceof Error ? error.message : "Failed to load stored flow" };
    }
  };

  const handleValidateFlow: Parameters<typeof ipcMain.handle>[1] = async (_e, raw: unknown) => {
    const parsed = flowValidate.request.safeParse(raw);
    if (!parsed.success) {
      return { ok: false, errors: [parsed.error.message] };
    }
    const ok = validate(parsed.data as FlowDef);
    return { ok, errors: ok ? [] : validate.errors ?? [] };
  };

  const handleRunFlow: Parameters<typeof ipcMain.handle>[1] = async (_e, raw: unknown) => {
    const parsed = flowRun.request.safeParse(raw);
    if (!parsed.success) {
      return { error: parsed.error.message };
    }
    const { flow, inputs } = parsed.data;
    const result = await runFlow(flow as FlowDef, inputs ?? {});
    try {
      const payloads = await getLastRunPayloads(result.runId);
      emitRunPayloads(result.runId, payloads);
    } catch (error) {
      console.warn("Failed to stream run payloads", error);
    }
    return result;
  };

  const handleStopFlow: Parameters<typeof ipcMain.handle>[1] = async (_e, raw: unknown) => {
    const parsed = flowStop.request.safeParse(raw);
    if (!parsed.success) {
      return { error: parsed.error.message };
    }
    return stopFlow(parsed.data.runId);
  };

  const handleLastRunPayloads: Parameters<typeof ipcMain.handle>[1] = async (_e, raw: unknown) => {
    const normalized =
      typeof raw === "string"
        ? { runId: raw }
        : raw && typeof raw === "object" && raw !== null && "runId" in raw
        ? { runId: (raw as { runId?: unknown }).runId }
        : raw;
    const parsed = flowLastRunPayloads.request.safeParse(normalized);
    if (!parsed.success) {
      return { error: parsed.error.message };
    }
    return getLastRunPayloads(parsed.data.runId);
  };

  registerChannel(flowOpen.name, handleOpenFlow, ["voide:openFlow"]);
  registerChannel(flowSave.name, handleSaveFlow, ["voide:saveFlow"]);
  registerChannel(flowLastOpened.name, handleLastOpenedFlow);
  registerChannel(flowValidate.name, handleValidateFlow, ["voide:validateFlow"]);
  registerChannel(flowRun.name, handleRunFlow, ["voide:runFlow"]);
  registerChannel(flowStop.name, handleStopFlow, ["voide:stopFlow"]);
  registerChannel(flowLastRunPayloads.name, handleLastRunPayloads, ["voide:getLastRunPayloads"]);
  registerChannel(catalogList.name, async () => getNodeCatalog(), ["voide:getNodeCatalog"]);

  ipcMain.handle("voide:listModels", async () => getModelRegistry());
  ipcMain.handle("voide:installModel", async (e, { modelId }: { modelId: string }) => {
    return installModel(modelId, p => e.sender.send("voide:modelInstallProgress", p));
  });
  ipcMain.handle("voide:stepFlow", async (_e, { runId }: { runId: string }) => stepFlow(runId));

  ipcMain.handle("voide:secretSet", async (_e, { scope, key, value }) =>
    getSecretsService().set(scope, key, value)
  );
  ipcMain.handle("voide:secretGet", async (_e, { scope, key }) =>
    getSecretsService().get(scope, key)
  );
}

