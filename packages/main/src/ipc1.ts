import { ipcMain, dialog } from "electron";
import fs from "fs";
import Ajv from "ajv";
import { flowSchema } from "@voide/schemas";
import type { FlowDef } from "@voide/shared";
import {
  catalogList,
  flowLastRunPayloads,
  flowOpen,
  flowRun,
  flowSave,
  flowStop,
  flowValidate
} from "@voide/ipc";
import { getDB } from "./services/db.js";
import { getSecretsService } from "./services/secrets.js";
import { runFlow, stopFlow, stepFlow, getNodeCatalog, getLastRunPayloads } from "./orchestrator/engine.js";
import { getModelRegistry } from "./services/models.js";

const AjvCtor = Ajv as any;
const ajv = new AjvCtor({ allErrors: true, allowUnionTypes: true });
const validate = ajv.compile(flowSchema as unknown as object);

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
    const { canceled, filePaths } = await dialog.showOpenDialog({ filters: [{ name: "Flow", extensions: ["json"] }] });
    if (canceled || !filePaths[0]) return { canceled: true };
    const json = JSON.parse(fs.readFileSync(filePaths[0], "utf-8"));
    if (!validate(json)) return { error: ajv.errorsText(validate.errors) };
    return { path: filePaths[0], flow: json };
  };

  const handleSaveFlow: Parameters<typeof ipcMain.handle>[1] = async (_e, raw: unknown) => {
    const parsed = flowSave.request.safeParse(raw);
    if (!parsed.success) {
      return { error: parsed.error.message };
    }
    const { flow, filePath } = parsed.data;
    if (!validate(flow)) return { error: ajv.errorsText(validate.errors) };
    const db = getDB();
    db.prepare("insert or replace into flows(id,name,json,version,updated_at) values(?,?,?,?,strftime('%s','now'))")
      .run(flow.id, flow.id, JSON.stringify(flow), flow.version);
    const savePath = filePath ?? (await dialog.showSaveDialog({ defaultPath: `${flow.id}.json` })).filePath;
    if (savePath) fs.writeFileSync(savePath, JSON.stringify(flow, null, 2));
    return { path: savePath ?? null };
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
    return runFlow(flow as FlowDef, inputs ?? {});
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
  registerChannel(flowValidate.name, handleValidateFlow, ["voide:validateFlow"]);
  registerChannel(flowRun.name, handleRunFlow, ["voide:runFlow"]);
  registerChannel(flowStop.name, handleStopFlow, ["voide:stopFlow"]);
  registerChannel(flowLastRunPayloads.name, handleLastRunPayloads, ["voide:getLastRunPayloads"]);
  registerChannel(catalogList.name, async () => getNodeCatalog(), ["voide:getNodeCatalog"]);

  ipcMain.handle("voide:listModels", async () => getModelRegistry());
  ipcMain.handle("voide:stepFlow", async (_e, { runId }: { runId: string }) => stepFlow(runId));
  ipcMain.handle("voide:secretSet", async (_e, { scope, key, value }) => getSecretsService().set(scope, key, value));
  ipcMain.handle("voide:secretGet", async (_e, { scope, key }) => getSecretsService().get(scope, key));
}
