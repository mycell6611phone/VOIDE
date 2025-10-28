import { ipcMain, dialog } from "electron";
import fs from "fs";
import Ajv from "ajv";
import { flowSchema } from "@voide/schemas";
import { catalogList, flowLastRunPayloads, flowLastOpened, flowOpen, flowSave, flowStop, } from "@voide/ipc";
import { persistFlow, rememberLastOpenedFlow, readLastOpenedFlow } from "./services/db.js";
import { getSecretsService } from "./services/secrets.js";
import { runFlow, stopFlow, stepFlow, getNodeCatalog, getLastRunPayloads } from "./orchestrator/engine.js";
import { getModelRegistry, installModel } from "./services/models.js";
const AjvCtor = Ajv;
const ajv = new AjvCtor({ allErrors: true, allowUnionTypes: true });
const validate = ajv.compile(flowSchema);
function isInterfaceNode(node) {
    const type = typeof node.type === "string" ? node.type.toLowerCase() : "";
    if (type === "chat.input" || type === "interface" || type === "ui.interface") {
        return true;
    }
    if (type === "module") {
        const rawModuleKey = node.params?.moduleKey;
        if (typeof rawModuleKey === "string") {
            const normalized = rawModuleKey.toLowerCase();
            if (normalized === "interface" || normalized === "chat.input") {
                return true;
            }
        }
    }
    return false;
}
function collectInterfaceNodeIds(flow) {
    const ids = new Set();
    for (const node of flow.nodes ?? []) {
        if (isInterfaceNode(node)) {
            ids.add(node.id);
        }
    }
    return ids;
}
function extractChatResponse(flow, payloads) {
    const interfaceIds = collectInterfaceNodeIds(flow);
    for (let index = payloads.length - 1; index >= 0; index -= 1) {
        const entry = payloads[index];
        if (!entry || interfaceIds.has(entry.nodeId)) {
            continue;
        }
        const payload = entry.payload;
        if (payload && typeof payload === "object" && payload.kind === "text") {
            const text = payload.text;
            if (typeof text === "string" && text.trim().length > 0) {
                return text;
            }
        }
    }
    return null;
}
let currentFlow = null;
export function setupIPC() {
    void readLastOpenedFlow()
        .then((stored) => {
        if (stored?.flow) {
            currentFlow = stored.flow;
        }
    })
        .catch((error) => {
        const message = error instanceof Error ? error.message : String(error);
        if (message.toLowerCase().includes("database")) {
            console.warn("[ipc] Database not ready yet; skipping last opened flow hydration");
        }
        else {
            console.warn("[ipc] Failed to hydrate last opened flow", error);
        }
    });
    void getSecretsService()
        .get("paths", "llamaBin")
        .then(({ value }) => {
        if (typeof value === "string") {
            const trimmed = value.trim();
            if (trimmed) {
                process.env.LLAMA_BIN = trimmed;
            }
        }
    })
        .catch((error) => {
        console.warn("[ipc] Failed to hydrate stored llama binary path", error);
    });
    const registerChannel = (name, handler, legacyNames = []) => {
        const names = [name, ...legacyNames];
        for (const channelName of names) {
            ipcMain.removeHandler(channelName);
            ipcMain.handle(channelName, handler);
        }
    };
    const handleOpenFlow = async () => {
        const { canceled, filePaths } = await dialog.showOpenDialog({
            filters: [{ name: "Flow", extensions: ["json"] }]
        });
        if (canceled || !filePaths[0])
            return { canceled: true };
        try {
            const json = JSON.parse(fs.readFileSync(filePaths[0], "utf-8"));
            if (!validate(json))
                return { error: ajv.errorsText(validate.errors) };
            const parsedFlow = json;
            persistFlow(parsedFlow);
            await rememberLastOpenedFlow(parsedFlow.id);
            currentFlow = parsedFlow;
            return { path: filePaths[0], flow: parsedFlow };
        }
        catch (error) {
            return { error: error instanceof Error ? error.message : "Failed to open flow" };
        }
    };
    const handleSaveFlow = async (_e, raw) => {
        const parsed = flowSave.request.safeParse(raw);
        if (!parsed.success) {
            return { error: parsed.error.message };
        }
        const { flow, filePath } = parsed.data;
        if (!validate(flow))
            return { error: ajv.errorsText(validate.errors) };
        try {
            persistFlow(flow);
            await rememberLastOpenedFlow(flow.id);
            currentFlow = flow;
            const savePath = filePath ?? null;
            if (savePath) {
                fs.writeFileSync(savePath, JSON.stringify(flow, null, 2));
            }
            return { path: savePath };
        }
        catch (error) {
            return { error: error instanceof Error ? error.message : "Failed to save flow" };
        }
    };
    const handleLastOpenedFlow = async () => {
        try {
            const stored = await readLastOpenedFlow();
            if (!stored) {
                return { empty: true };
            }
            currentFlow = stored.flow;
            return { flow: stored.flow };
        }
        catch (error) {
            return { error: error instanceof Error ? error.message : "Failed to load stored flow" };
        }
    };
    const handleStopFlow = async (_e, raw) => {
        const parsed = flowStop.request.safeParse(raw);
        if (!parsed.success) {
            return { error: parsed.error.message };
        }
        return stopFlow(parsed.data.runId);
    };
    const handleLastRunPayloads = async (_e, raw) => {
        const normalized = typeof raw === "string"
            ? { runId: raw }
            : raw && typeof raw === "object" && raw !== null && "runId" in raw
                ? { runId: raw.runId }
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
    registerChannel(flowStop.name, handleStopFlow, ["voide:stopFlow"]);
    registerChannel(flowLastRunPayloads.name, handleLastRunPayloads, ["voide:getLastRunPayloads"]);
    registerChannel(catalogList.name, async () => getNodeCatalog(), ["voide:getNodeCatalog"]);
    ipcMain.handle("voide:listModels", async () => getModelRegistry());
    ipcMain.handle("voide:installModel", async (e, { modelId }) => {
        return installModel(modelId, p => e.sender.send("voide:modelInstallProgress", p));
    });
    ipcMain.handle("voide:selectLlamaBin", async () => {
        const { canceled, filePaths } = await dialog.showOpenDialog({
            title: "Select llama.cpp Binary",
            properties: ["openFile"],
        });
        if (canceled || !filePaths[0]) {
            return { canceled: true };
        }
        const selectedPath = filePaths[0];
        process.env.LLAMA_BIN = selectedPath;
        try {
            await getSecretsService().set("paths", "llamaBin", selectedPath);
        }
        catch (error) {
            console.warn("[ipc] Failed to persist llama binary path", error);
        }
        return { path: selectedPath };
    });
    ipcMain.handle("voide:stepFlow", async (_e, { runId }) => stepFlow(runId));
    ipcMain.removeHandler("voide:sendChat");
    ipcMain.handle("voide:sendChat", async (_event, raw) => {
        const message = typeof raw === "string"
            ? raw
            : raw && typeof raw === "object" && raw !== null && "message" in raw
                ? raw.message
                : undefined;
        const text = typeof message === "string" ? message : "";
        if (!text || text.trim().length === 0) {
            return { ok: false, error: "Message must be a non-empty string." };
        }
        if (!currentFlow) {
            return { ok: false, error: "No active flow is loaded." };
        }
        try {
            const { runId } = await runFlow(currentFlow, { userInput: text });
            const payloads = await getLastRunPayloads(runId);
            const response = extractChatResponse(currentFlow, payloads);
            return { ok: true, runId, response: response ?? "" };
        }
        catch (error) {
            return { ok: false, error: error instanceof Error ? error.message : String(error) };
        }
    });
    ipcMain.handle("voide:secretSet", async (_e, { scope, key, value }) => getSecretsService().set(scope, key, value));
    ipcMain.handle("voide:secretGet", async (_e, { scope, key }) => getSecretsService().get(scope, key));
}
