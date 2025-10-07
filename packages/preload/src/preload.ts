import { contextBridge, ipcRenderer } from "electron";
import {
  Flow,
  flowValidate,
  flowRun,
  modelEnsure,
  appGetVersion,
  telemetryEvent,
  TelemetryPayload,
  chatWindowOpen,
  appExit,
} from "@voide/ipc";

const api = {
  validateFlow: (flow: Flow) => ipcRenderer.invoke(flowValidate.name, flow),
  runFlow: (flow: Flow, inputs: Record<string, unknown> = {}) =>
    ipcRenderer.invoke(flowRun.name, { flow, inputs }),
  ensureModel: (modelId: string) => ipcRenderer.invoke(modelEnsure.name, { modelId }),
  getVersion: () => ipcRenderer.invoke(appGetVersion.name),
  onTelemetry: (cb: (ev: TelemetryPayload) => void) => {
    ipcRenderer.on(telemetryEvent.name, (_e, ev: TelemetryPayload) => cb(ev));
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

