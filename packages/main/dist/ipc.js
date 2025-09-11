import { ipcMain, dialog } from "electron";
import fs from "fs";
import Ajv from "ajv";
import { flowSchema } from "@voide/schemas";
import { getDB } from "./services/db.js";
import { getSecretsService } from "./services/secrets.js";
import { runFlow, stopFlow, stepFlow, getNodeCatalog, getLastRunPayloads } from "./orchestrator/engine.js";
import { getModelRegistry } from "./services/models.js";
const AjvCtor = Ajv;
const ajv = new AjvCtor({ allErrors: true, allowUnionTypes: true });
const validate = ajv.compile(flowSchema);
export function setupIPC() {
    ipcMain.handle("voide:openFlow", async () => {
        const { canceled, filePaths } = await dialog.showOpenDialog({
            filters: [{ name: "Flow", extensions: ["json"] }]
        });
        if (canceled || !filePaths[0])
            return { canceled: true };
        const json = JSON.parse(fs.readFileSync(filePaths[0], "utf-8"));
        if (!validate(json))
            return { error: ajv.errorsText(validate.errors) };
        return { path: filePaths[0], flow: json };
    });
    ipcMain.handle("voide:saveFlow", async (_e, args) => {
        const flow = args.flow;
        if (!validate(flow))
            return { error: ajv.errorsText(validate.errors) };
        const db = getDB();
        db.prepare("insert or replace into flows(id,name,json,version,updated_at) values(?,?,?,?,strftime('%s','now'))")
            .run(flow.id, flow.id, JSON.stringify(flow), flow.version);
        const savePath = args.filePath ?? (await dialog.showSaveDialog({ defaultPath: `${flow.id}.json` })).filePath;
        if (savePath)
            fs.writeFileSync(savePath, JSON.stringify(flow, null, 2));
        return { path: savePath };
    });
    ipcMain.handle("voide:validateFlow", async (_e, raw) => {
        const flow = raw;
        const ok = validate(flow);
        return { ok, errors: ok ? [] : validate.errors };
    });
    ipcMain.handle("voide:listModels", async () => getModelRegistry());
    ipcMain.handle("voide:getNodeCatalog", async () => getNodeCatalog());
    ipcMain.handle("voide:getLastRunPayloads", async (_e, runId) => getLastRunPayloads(runId));
    ipcMain.handle("voide:runFlow", async (_e, args) => {
        const flow = args.flow;
        return runFlow(flow);
    });
    ipcMain.handle("voide:stopFlow", async (_e, { runId }) => stopFlow(runId));
    ipcMain.handle("voide:stepFlow", async (_e, { runId }) => stepFlow(runId));
    ipcMain.handle("voide:secretSet", async (_e, { scope, key, value }) => getSecretsService().set(scope, key, value));
    ipcMain.handle("voide:secretGet", async (_e, { scope, key }) => getSecretsService().get(scope, key));
}
