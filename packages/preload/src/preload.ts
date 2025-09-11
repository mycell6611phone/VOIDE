import { contextBridge, ipcRenderer } from "electron";

export type VoideAPI = {
  openFlow: () => Promise<unknown>;
  saveFlow: (flow: unknown, filePath?: string) => Promise<unknown>;
  validateFlow: (flow: unknown) => Promise<unknown>;
  listModels: () => Promise<unknown>;
  getNodeCatalog: () => Promise<unknown>;
  runFlow: (flow: unknown) => Promise<unknown>;
  stopFlow: (runId: string) => Promise<unknown>;
  stepFlow: (runId: string) => Promise<unknown>;
  getLastRunPayloads: (runId: string) => Promise<unknown>;
  secretSet: (scope: string, key: string, value: string) => Promise<unknown>;
  secretGet: (scope: string, key: string) => Promise<unknown>;
};

declare global {
  interface Window {
    voide: VoideAPI;
  }
}

const api: VoideAPI = {
  openFlow: () => ipcRenderer.invoke("voide:openFlow"),
  saveFlow: (flow, filePath) => ipcRenderer.invoke("voide:saveFlow", { flow, filePath }),
  validateFlow: flow => ipcRenderer.invoke("voide:validateFlow", flow),
  listModels: () => ipcRenderer.invoke("voide:listModels"),
  getNodeCatalog: () => ipcRenderer.invoke("voide:getNodeCatalog"),
  runFlow: flow => ipcRenderer.invoke("voide:runFlow", { flow }),
  stopFlow: runId => ipcRenderer.invoke("voide:stopFlow", { runId }),
  stepFlow: runId => ipcRenderer.invoke("voide:stepFlow", { runId }),
  getLastRunPayloads: runId => ipcRenderer.invoke("voide:getLastRunPayloads", runId),
  secretSet: (scope, key, value) => ipcRenderer.invoke("voide:secretSet", { scope, key, value }),
  secretGet: (scope, key) => ipcRenderer.invoke("voide:secretGet", { scope, key })
};

contextBridge.exposeInMainWorld("voide", api);
