import { ipcMain, app } from "electron";
import { flowValidate, flowBuild, flowRun, modelEnsure, appGetVersion, chatWindowOpen, appExit, moduleTest, } from "@voide/ipc";
import { validateFlow } from "../services/validate.js";
import { formatFlowValidationErrors } from "@voide/shared/flowValidation";
import { compileAndCache, getCompiledFlow } from "../orchestrator/compilerCache.js";
import { runFlow, getLastRunPayloads, testNode } from "../orchestrator/engine.js";
import { getModelRegistry } from "../services/models.js";
import { emitRunPayloads } from "./telemetry.js";
import { buildCanvasFlow, isCanvasBuildInput, isCanvasRunPayload, runCanvasFlow as runCanvasPlan } from "../build/canvasPipeline.js";
function formatError(err) {
    return { error: String(err) };
}
const legacyChannelNames = {
    [flowValidate.name]: ["voide:validateFlow"],
    [flowBuild.name]: ["voide:buildFlow"],
    [flowRun.name]: ["voide:runFlow"],
};
function bindHandler(channel, handler, legacy = []) {
    const names = [channel.name, ...legacy];
    for (const name of names) {
        ipcMain.removeHandler(name);
        ipcMain.handle(name, handler);
    }
}
export function registerHandlers(deps) {
    bindHandler(flowValidate, async (_e, payload) => {
        const parsed = flowValidate.request.safeParse(payload);
        if (!parsed.success) {
            return flowValidate.response.parse({
                ok: false,
                errors: parsed.error.errors ?? [],
            });
        }
        const res = validateFlow(parsed.data);
        return flowValidate.response.parse({
            ok: res.ok,
            errors: Array.isArray(res.errors) ? res.errors : [],
        });
    }, legacyChannelNames[flowValidate.name] ?? []);
    bindHandler(flowBuild, async (_e, payload) => {
        const parsed = flowBuild.request.safeParse(payload);
        if (!parsed.success) {
            const message = parsed.error.errors?.map((issue) => issue.message).join("; ") ?? "Invalid flow build request.";
            return flowBuild.response.parse({ ok: false, error: message, errors: parsed.error.errors ?? [] });
        }
        try {
            const validation = validateFlow(parsed.data);
            if (!validation.ok) {
                const message = formatFlowValidationErrors(validation.errors).join("\n") ||
                    "Flow validation failed.";
                return flowBuild.response.parse({ ok: false, error: message, errors: validation.errors ?? [] });
            }
            const { entry, cached } = compileAndCache(parsed.data);
            return flowBuild.response.parse({
                ok: true,
                hash: entry.hash,
                version: entry.version,
                cached,
                flow: entry.flow,
            });
        }
        catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            return flowBuild.response.parse({ ok: false, error: message, errors: [] });
        }
    }, legacyChannelNames[flowBuild.name] ?? []);
    bindHandler(flowRun, async (_e, payload) => {
        const parsed = flowRun.request.safeParse(payload);
        if (!parsed.success)
            return formatError(parsed.error.flatten());
        try {
            const compiled = getCompiledFlow(parsed.data.compiledHash);
            if (!compiled) {
                return formatError(new Error(`Compiled flow not found for hash '${parsed.data.compiledHash}'.`));
            }
            const out = await runFlow(compiled.flow, parsed.data.inputs ?? {});
            try {
                const payloads = await getLastRunPayloads(out.runId);
                emitRunPayloads(out.runId, payloads);
            }
            catch (err) {
                console.warn("Failed to stream run payloads", err);
            }
            return flowRun.response.parse(out);
        }
        catch (err) {
            return formatError(err);
        }
    }, legacyChannelNames[flowRun.name] ?? []);
    bindHandler(moduleTest, async (_e, payload) => {
        const parsed = moduleTest.request.safeParse(payload);
        if (!parsed.success) {
            const message = parsed.error.errors?.map((issue) => issue.message).join("; ") ?? "Invalid module test request.";
            return moduleTest.response.parse({
                ok: false,
                error: message,
                progress: [],
                logs: []
            });
        }
        try {
            const result = await testNode(parsed.data.node, parsed.data.inputs);
            return moduleTest.response.parse(result);
        }
        catch (err) {
            return moduleTest.response.parse({
                ok: false,
                error: String(err),
                progress: [],
                logs: []
            });
        }
    });
    bindHandler(modelEnsure, async (_e, payload) => {
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
    bindHandler(appGetVersion, async () => {
        try {
            const v = app.getVersion();
            return appGetVersion.response.parse(v);
        }
        catch (err) {
            return formatError(err);
        }
    });
    bindHandler(chatWindowOpen, async () => {
        try {
            await deps.openChatWindow();
            return chatWindowOpen.response.parse({ ok: true });
        }
        catch (err) {
            return formatError(err);
        }
    });
    bindHandler(appExit, async () => {
        try {
            await deps.exitApplication();
            return appExit.response.parse({ ok: true });
        }
        catch (err) {
            return formatError(err);
        }
    });
    ipcMain.removeHandler("build-flow");
    ipcMain.handle("build-flow", async (_event, payload) => {
        if (!isCanvasBuildInput(payload)) {
            return { ok: false, errors: ["Invalid canvas payload."] };
        }
        try {
            return await buildCanvasFlow(payload);
        }
        catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            return { ok: false, errors: [message] };
        }
    });
    ipcMain.removeHandler("run-flow");
    ipcMain.handle("run-flow", async (_event, payload) => {
        if (!isCanvasRunPayload(payload)) {
            return { ok: false, error: "Invalid run payload." };
        }
        try {
            return await runCanvasPlan(payload);
        }
        catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            return { ok: false, error: message };
        }
    });
}
