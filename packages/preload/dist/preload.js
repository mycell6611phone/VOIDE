import { contextBridge, ipcRenderer } from "electron";
const api = {
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
