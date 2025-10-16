import { contextBridge, ipcRenderer } from "electron";
import {
  Flow,
  catalogList,
  flowLastRunPayloads,
  flowLastOpened,
  flowOpen,
  flowRun,
  flowBuild,
  flowSave,
  flowStop,
  flowValidate,
  modelEnsure,
  appGetVersion,
  telemetryEvent,
  TelemetryPayload,
  flowRunPayloadsEvent,
  FlowRunPayloadsEvent,
  chatWindowOpen,
  appExit,
  moduleTest,
} from "@voide/ipc";

const api = {
  validateFlow: (flow: Flow) => ipcRenderer.invoke(flowValidate.name, flow),
  buildFlow: async (flow: Flow) => {
    const result = await ipcRenderer.invoke(flowBuild.name, flow);
    return flowBuild.response.parse(result);
  },
  openFlow: () => ipcRenderer.invoke(flowOpen.name),
  saveFlow: (flow: Flow, filePath?: string | null) =>
    ipcRenderer.invoke(flowSave.name, { flow, filePath: filePath ?? null }),
  runFlow: (compiledHash: string, inputs: Record<string, unknown> = {}) =>
    ipcRenderer.invoke(flowRun.name, { compiledHash, inputs }),
  stopFlow: (runId: string) => ipcRenderer.invoke(flowStop.name, { runId }),
  getLastRunPayloads: (runId: string) => ipcRenderer.invoke(flowLastRunPayloads.name, { runId }),
  getLastOpenedFlow: () => ipcRenderer.invoke(flowLastOpened.name),
  getNodeCatalog: () => ipcRenderer.invoke(catalogList.name),
  ensureModel: (modelId: string) => ipcRenderer.invoke(modelEnsure.name, { modelId }),
  sendChat: (message: string) => ipcRenderer.invoke("voide:sendChat", { message }),
  getVersion: () => ipcRenderer.invoke(appGetVersion.name),
  onTelemetry: (cb: (ev: TelemetryPayload) => void) => {
    const listener = (_e: Electron.IpcRendererEvent, ev: TelemetryPayload) => cb(ev);
    ipcRenderer.on(telemetryEvent.name, listener);
    return () => {
      ipcRenderer.off(telemetryEvent.name, listener);
    };
  },
  onRunPayloads: (cb: (event: FlowRunPayloadsEvent) => void) => {
    const listener = (
      _e: Electron.IpcRendererEvent,
      payload: { runId: string; payloads: unknown },
    ) => {
      try {
        const parsed = flowRunPayloadsEvent.payload.parse(payload);
        cb(parsed);
      } catch (error) {
        console.warn("[voide] Ignoring malformed run payload event", error);
      }
    };
    ipcRenderer.on(flowRunPayloadsEvent.name, listener);
    return () => {
      ipcRenderer.off(flowRunPayloadsEvent.name, listener);
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
  testModule: async (
    node: Flow["nodes"][number],
    inputs: Array<{ port: string; payload: unknown }> = []
  ) => {
    const result = await ipcRenderer.invoke(moduleTest.name, { node, inputs });
    return moduleTest.response.parse(result);
  },
};

contextBridge.exposeInMainWorld("voide", api);

export type VoideAPI = typeof api;

declare global {
  interface Window {
    voide: VoideAPI;
  }
}

