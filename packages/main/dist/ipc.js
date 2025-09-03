"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.setupIPC = setupIPC;
const electron_1 = require("electron");
const ajv_1 = __importDefault(require("ajv"));
const schemas_1 = require("@voide/schemas");
const db_1 = require("./services/db");
const secrets_1 = require("./services/secrets");
const engine_1 = require("./orchestrator/engine");
const models_1 = require("./services/models");
const ajv = new ajv_1.default({ allErrors: true, allowUnionTypes: true });
const validate = ajv.compile(schemas_1.flowSchema);
function setupIPC() {
    electron_1.ipcMain.handle("voide:openFlow", async () => {
        const { canceled, filePaths } = await electron_1.dialog.showOpenDialog({
            filters: [{ name: "Flow", extensions: ["json"] }]
        });
        if (canceled || !filePaths[0])
            return { canceled: true };
        const flow = (0, db_1.loadProject)(filePaths[0]);
        if (!validate(flow))
            return { error: ajv.errorsText(validate.errors) };
        return { path: filePaths[0], flow };
    });
    electron_1.ipcMain.handle("voide:saveFlow", async (_e, args) => {
        const flow = args.flow;
        if (!validate(flow))
            return { error: ajv.errorsText(validate.errors) };
        const savePath = args.filePath ?? (await electron_1.dialog.showSaveDialog({ defaultPath: `${flow.id}.json` })).filePath;
        if (savePath)
            (0, db_1.saveProject)(flow, savePath);
        return { path: savePath };
    });
    electron_1.ipcMain.handle("voide:validateFlow", async (_e, raw) => {
        const flow = raw;
        const ok = validate(flow);
        return { ok, errors: ok ? [] : validate.errors };
    });
    electron_1.ipcMain.handle("voide:listModels", async () => (0, models_1.getModelRegistry)());
    electron_1.ipcMain.handle("voide:getNodeCatalog", async () => (0, engine_1.getNodeCatalog)());
    electron_1.ipcMain.handle("voide:getLastRunPayloads", async (_e, runId) => (0, engine_1.getLastRunPayloads)(runId));
    electron_1.ipcMain.handle("voide:runFlow", async (_e, args) => {
        const flow = args.flow;
        return (0, engine_1.runFlow)(flow);
    });
    electron_1.ipcMain.handle("voide:stopFlow", async (_e, { runId }) => (0, engine_1.stopFlow)(runId));
    electron_1.ipcMain.handle("voide:stepFlow", async (_e, { runId }) => (0, engine_1.stepFlow)(runId));
    electron_1.ipcMain.handle("voide:secretSet", async (_e, { scope, key, value }) => (0, secrets_1.getSecretsService)().set(scope, key, value));
    electron_1.ipcMain.handle("voide:secretGet", async (_e, { scope, key }) => (0, secrets_1.getSecretsService)().get(scope, key));
}
