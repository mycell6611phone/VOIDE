import { contextBridge, ipcRenderer } from "electron";
import {
  Flow,
  flowValidate,
  flowRun,
  modelEnsure,
  appGetVersion,
  telemetryEvent,
  RunLog,
} from "@voide/ipc";

const api = {
  validateFlow: (flow: Flow) => ipcRenderer.invoke(flowValidate.name, flow),
  runFlow: (flow: Flow) => ipcRenderer.invoke(flowRun.name, flow),
  ensureModel: (modelId: string) => ipcRenderer.invoke(modelEnsure.name, { modelId }),
  getVersion: () => ipcRenderer.invoke(appGetVersion.name),
  onTelemetry: (cb: (log: RunLog) => void) => {
    ipcRenderer.on(telemetryEvent.name, (_e, log: RunLog) => cb(log));
  },
};

contextBridge.exposeInMainWorld("voide", api);

export type VoideAPI = typeof api;

declare global {
  interface Window {
    voide: VoideAPI;
  }
}

