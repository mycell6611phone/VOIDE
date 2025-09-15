import { ipcMain, app } from "electron";
import { flowValidate, flowRun, modelEnsure, appGetVersion, } from "@voide/ipc";
import { validateFlow } from "../services/validate.js";
import { runFlow } from "../orchestrator/engine.js";
import { getModelRegistry } from "../services/models.js";
function formatError(err) {
    return { error: String(err) };
}
export function registerHandlers() {
    ipcMain.handle(flowValidate.name, async (_e, payload) => {
        const parsed = flowValidate.request.safeParse(payload);
        if (!parsed.success)
            return formatError(parsed.error.flatten());
        const res = validateFlow(parsed.data);
        const errs = res.errors.map((e) => JSON.stringify(e));
        return flowValidate.response.parse({ ok: res.ok, errors: errs });
    });
    ipcMain.handle(flowRun.name, async (_e, payload) => {
        const parsed = flowRun.request.safeParse(payload);
        if (!parsed.success)
            return formatError(parsed.error.flatten());
        try {
            const out = await runFlow(parsed.data);
            return flowRun.response.parse(out);
        }
        catch (err) {
            return formatError(err);
        }
    });
    ipcMain.handle(modelEnsure.name, async (_e, payload) => {
        const parsed = modelEnsure.request.safeParse(payload);
        if (!parsed.success)
            return formatError(parsed.error.flatten());
        try {
            const reg = await getModelRegistry();
            const ok = Array.isArray(reg.models) && reg.models.some((m) => m.id === parsed.data.modelId);
            return modelEnsure.response.parse({ ok });
        }
        catch (err) {
            return formatError(err);
        }
    });
    ipcMain.handle(appGetVersion.name, async () => {
        try {
            const v = app.getVersion();
            return appGetVersion.response.parse(v);
        }
        catch (err) {
            return formatError(err);
        }
    });
}
