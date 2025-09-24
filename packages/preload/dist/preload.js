import { contextBridge, ipcRenderer } from "electron";
import { flowValidate, flowRun, modelEnsure, appGetVersion, telemetryEvent, chatWindowOpen, } from "@voide/ipc";
const api = {
    validateFlow: (flow) => ipcRenderer.invoke(flowValidate.name, flow),
    runFlow: (flow) => ipcRenderer.invoke(flowRun.name, flow),
    ensureModel: (modelId) => ipcRenderer.invoke(modelEnsure.name, { modelId }),
    getVersion: () => ipcRenderer.invoke(appGetVersion.name),
    onTelemetry: (cb) => {
        ipcRenderer.on(telemetryEvent.name, (_e, ev) => cb(ev));
    },
    openChatWindow: async () => {
        const result = await ipcRenderer.invoke(chatWindowOpen.name);
        return chatWindowOpen.response.parse(result);
    },
};
contextBridge.exposeInMainWorld("voide", api);
