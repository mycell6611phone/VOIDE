import { contextBridge, ipcRenderer } from "electron";
import {
  Flow,
  catalogList,
  flowLastRunPayloads,
  flowOpen,
  flowRun,
  flowSave,
  flowStop,
  flowValidate,
  modelEnsure,
  appGetVersion,
  telemetryEvent,
  TelemetryPayload,
  chatWindowOpen,
  appExit,
} from "@voide/ipc";

const api = {
  validateFlow: (flow: Flow) => ipcRenderer.invoke(flowValidate.name, flow),
  openFlow: () => ipcRenderer.invoke(flowOpen.name),
  saveFlow: (flow: Flow, filePath?: string | null) =>
    ipcRenderer.invoke(flowSave.name, { flow, filePath: filePath ?? null }),
  runFlow: (flow: Flow, inputs: Record<string, unknown> = {}) =>
    ipcRenderer.invoke(flowRun.name, { flow, inputs }),
  stopFlow: (runId: string) => ipcRenderer.invoke(flowStop.name, { runId }),
  getLastRunPayloads: (runId: string) => ipcRenderer.invoke(flowLastRunPayloads.name, { runId }),
  getNodeCatalog: () => ipcRenderer.invoke(catalogList.name),
  ensureModel: (modelId: string) => ipcRenderer.invoke(modelEnsure.name, { modelId }),
  getVersion: () => ipcRenderer.invoke(appGetVersion.name),
  onTelemetry: (cb: (ev: TelemetryPayload) => void) => {
    const listener = (_e: Electron.IpcRendererEvent, ev: TelemetryPayload) => cb(ev);
    ipcRenderer.on(telemetryEvent.name, listener);
    return () => {
      ipcRenderer.off(telemetryEvent.name, listener);
    };
  },
  openChatWindow: async () => {
    const result = await ipcRenderer.invoke(chatWindowOpen.name);
    return chatWindowOpen.response.parse(result);
  },
  exitApp: async () => {
    const result = await ipcRenderer.invoke(appExit.name);
    return appExit.response.parse(result);
  },
};

contextBridge.exposeInMainWorld("voide", api);

export type VoideAPI = typeof api;

declare global {
  interface Window {
    voide: VoideAPI;
  }
}

