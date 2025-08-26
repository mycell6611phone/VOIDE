import { contextBridge, ipcRenderer } from "electron";
contextBridge.exposeInMainWorld("voide", {
  openFlow: () => ipcRenderer.invoke("voide:openFlow"),
  saveFlow: (flow: any, filePath?: string) => ipcRenderer.invoke("voide:saveFlow", { flow, filePath }),
  validateFlow: (flow: any) => ipcRenderer.invoke("voide:validateFlow", flow),
  listModels: () => ipcRenderer.invoke("voide:listModels"),
  getNodeCatalog: () => ipcRenderer.invoke("voide:getNodeCatalog"),
  runFlow: (flow: any) => ipcRenderer.invoke("voide:runFlow", { flow }),
  stopFlow: (runId: string) => ipcRenderer.invoke("voide:stopFlow", { runId }),
  stepFlow: (runId: string) => ipcRenderer.invoke("voide:stepFlow", { runId }),
  getLastRunPayloads: (runId: string) => ipcRenderer.invoke("voide:getLastRunPayloads", runId),
  secretSet: (scope: string, key: string, value: string) => ipcRenderer.invoke("voide:secretSet", { scope, key, value }),
  secretGet: (scope: string, key: string) => ipcRenderer.invoke("voide:secretGet", { scope, key })
});
