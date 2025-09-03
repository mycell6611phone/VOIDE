import { ipcMain, dialog } from "electron";
import Ajv from "ajv";
import { flowSchema } from "@voide/schemas";
import type { FlowDef } from "@voide/shared";
import { saveProject, loadProject } from "./services/db";
import { getSecretsService } from "./services/secrets";
import { runFlow, stopFlow, stepFlow, getNodeCatalog, getLastRunPayloads } from "./orchestrator/engine";
import { getModelRegistry } from "./services/models";

const ajv = new Ajv({ allErrors: true, allowUnionTypes: true });
const validate = ajv.compile(flowSchema as unknown as object);

export function setupIPC() {
  ipcMain.handle("voide:openFlow", async (_e, _args) => {
    const { canceled, filePaths } = await dialog.showOpenDialog({ filters: [{ name: "Flow", extensions: ["json"] }] });
    if (canceled || !filePaths[0]) return { canceled: true };
    const flow = loadProject(filePaths[0]);
    if (!validate(flow)) return { error: ajv.errorsText(validate.errors) };
    return { path: filePaths[0], flow };
  });

  ipcMain.handle("voide:saveFlow", async (_e, { flow, filePath }: { flow: FlowDef; filePath?: string }) => {
    if (!validate(flow)) return { error: ajv.errorsText(validate.errors) };
    const savePath = filePath ?? (await dialog.showSaveDialog({ defaultPath: `${flow.id}.json` })).filePath;
    if (savePath) saveProject(flow, savePath);
    return { path: savePath };
  });

  ipcMain.handle("voide:validateFlow", async (_e, flow: FlowDef) => {
    const ok = validate(flow);
    return { ok, errors: ok ? [] : validate.errors };
  });

  ipcMain.handle("voide:listModels", async () => getModelRegistry());
  ipcMain.handle("voide:getNodeCatalog", async () => getNodeCatalog());
  ipcMain.handle("voide:getLastRunPayloads", async (_e, runId: string) => getLastRunPayloads(runId));

  ipcMain.handle("voide:runFlow", async (_e, { flow }: { flow: FlowDef }) => runFlow(flow));
  ipcMain.handle("voide:stopFlow", async (_e, { runId }: { runId: string }) => stopFlow(runId));
  ipcMain.handle("voide:stepFlow", async (_e, { runId }: { runId: string }) => stepFlow(runId));

  ipcMain.handle("voide:secretSet", async (_e, { scope, key, value }) => getSecretsService().set(scope, key, value));
  ipcMain.handle("voide:secretGet", async (_e, { scope, key }) => getSecretsService().get(scope, key));
}
