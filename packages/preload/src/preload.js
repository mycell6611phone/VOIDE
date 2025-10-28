import { contextBridge, ipcRenderer } from "electron";
import { catalogList, flowLastRunPayloads, flowLastOpened, flowOpen, flowRun, flowBuild, flowSave, flowStop, flowValidate, modelEnsure, appGetVersion, telemetryEvent, flowRunPayloadsEvent, chatWindowOpen, appExit, moduleTest, } from "@voide/ipc";
function looksLikeCanvasBuildPayload(value) {
    if (!value || typeof value !== "object")
        return false;
    const graph = value;
    if (!Array.isArray(graph.nodes) || !Array.isArray(graph.edges))
        return false;
    const nodes = graph.nodes;
    const edges = graph.edges;
    const structuredEdge = edges.find((edge) => edge && typeof edge === "object");
    if (!structuredEdge) {
        const representative = nodes.find((node) => node && typeof node === "object");
        return representative ? typeof representative.name !== "string" : true;
    }
    const candidate = structuredEdge;
    if (Array.isArray(candidate.from) || Array.isArray(candidate.to))
        return false;
    return Boolean(candidate.from && typeof candidate.from === "object");
}
function looksLikeCanvasRunPayload(value) {
    if (!value || typeof value !== "object")
        return false;
    const record = value;
    if (!record.plan || typeof record.plan !== "object")
        return false;
    const plan = record.plan;
    return typeof plan.hash === "string" && plan.hash.length > 0;
}
function looksLikeCanvasBuildResult(value) {
    if (!value || typeof value !== "object")
        return false;
    const record = value;
    return typeof record.ok === "boolean" && Array.isArray(record.errors);
}
function looksLikeCanvasRunResult(value) {
    if (!value || typeof value !== "object")
        return false;
    const record = value;
    if (typeof record.ok !== "boolean")
        return false;
    if (record.error !== undefined && typeof record.error !== "string")
        return false;
    if (record.runId !== undefined && typeof record.runId !== "string")
        return false;
    if (record.hash !== undefined && typeof record.hash !== "string")
        return false;
    return true;
}
function looksLikeSendChatResult(value) {
    if (!value || typeof value !== "object")
        return false;
    const record = value;
    if (typeof record.ok !== "boolean")
        return false;
    if (record.error !== undefined && typeof record.error !== "string")
        return false;
    if (record.response !== undefined && typeof record.response !== "string")
        return false;
    if (record.runId !== undefined && typeof record.runId !== "string")
        return false;
    return true;
}
const api = {
    isElectron: true,
    validateFlow: (flow) => ipcRenderer.invoke(flowValidate.name, flow),
    buildFlow: async (flow) => {
        if (looksLikeCanvasBuildPayload(flow))
            return ipcRenderer.invoke("build-flow", flow);
        const result = await ipcRenderer.invoke(flowBuild.name, flow);
        return flowBuild.response.parse(result);
    },
    openFlow: () => ipcRenderer.invoke(flowOpen.name),
    saveFlow: (flow, filePath) => ipcRenderer.invoke(flowSave.name, { flow, filePath: filePath ?? null }),
    runFlow: (...args) => {
        if (args.length === 1 && looksLikeCanvasRunPayload(args[0])) {
            return ipcRenderer.invoke("run-flow", args[0]);
        }
        const [compiledHash, inputs] = args;
        return ipcRenderer.invoke(flowRun.name, { compiledHash, inputs: inputs ?? {} });
    },
    stopFlow: (runId) => ipcRenderer.invoke(flowStop.name, { runId }),
    getLastRunPayloads: (runId) => ipcRenderer.invoke(flowLastRunPayloads.name, { runId }),
    getLastOpenedFlow: () => ipcRenderer.invoke(flowLastOpened.name),
    getNodeCatalog: () => ipcRenderer.invoke(catalogList.name),
    getModelRegistry: () => ipcRenderer.invoke("voide:listModels"),
    installModel: async (modelId, onProgress) => {
        let progressListener = null;
        if (typeof onProgress === "function") {
            progressListener = (_event, payload) => {
                if (!payload || typeof payload !== "object")
                    return;
                if (payload.id === modelId) {
                    const loaded = Number(payload.loaded) || 0;
                    const total = Number(payload.total) || 0;
                    onProgress({ id: modelId, loaded, total });
                }
            };
            ipcRenderer.on("voide:modelInstallProgress", progressListener);
        }
        try {
            return await ipcRenderer.invoke("voide:installModel", { modelId });
        }
        finally {
            if (progressListener)
                ipcRenderer.removeListener("voide:modelInstallProgress", progressListener);
        }
    },
    ensureModel: (modelId) => ipcRenderer.invoke(modelEnsure.name, { modelId }),
    sendChat: (message) => ipcRenderer.invoke("voide:sendChat", { message }),
    selectLlamaBinary: () => ipcRenderer.invoke("voide:selectLlamaBin"),
    secretSet: (scope, key, value) => ipcRenderer.invoke("voide:secretSet", { scope, key, value }),
    secretGet: (scope, key) => ipcRenderer.invoke("voide:secretGet", { scope, key }),
    getVersion: () => ipcRenderer.invoke(appGetVersion.name),
    onTelemetry: (cb) => {
        const listener = (_e, ev) => cb(ev);
        ipcRenderer.on(telemetryEvent.name, listener);
        return () => ipcRenderer.off(telemetryEvent.name, listener);
    },
    onRunPayloads: (cb) => {
        const listener = (_e, payload) => {
            try {
                const parsed = flowRunPayloadsEvent.payload.parse(payload);
                cb(parsed);
            }
            catch (error) {
                console.warn("[voide] Ignoring malformed run payload event", error);
            }
        };
        ipcRenderer.on(flowRunPayloadsEvent.name, listener);
        return () => ipcRenderer.off(flowRunPayloadsEvent.name, listener);
    },
    openChatWindow: async () => {
        const result = await ipcRenderer.invoke(chatWindowOpen.name);
        return chatWindowOpen.response.parse(result);
    },
    exitApp: async () => {
        const result = await ipcRenderer.invoke(appExit.name);
        return appExit.response.parse(result);
    },
    testModule: async (node, inputs = []) => {
        const result = await ipcRenderer.invoke(moduleTest.name, { node, inputs });
        return moduleTest.response.parse(result);
    },
};
contextBridge.exposeInMainWorld("voide", api);
