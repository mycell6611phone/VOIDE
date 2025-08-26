"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
electron_1.contextBridge.exposeInMainWorld("voide", {
    openFlow: () => electron_1.ipcRenderer.invoke("voide:openFlow"),
    saveFlow: (flow, filePath) => electron_1.ipcRenderer.invoke("voide:saveFlow", { flow, filePath }),
    validateFlow: (flow) => electron_1.ipcRenderer.invoke("voide:validateFlow", flow),
    listModels: () => electron_1.ipcRenderer.invoke("voide:listModels"),
    getNodeCatalog: () => electron_1.ipcRenderer.invoke("voide:getNodeCatalog"),
    runFlow: (flow) => electron_1.ipcRenderer.invoke("voide:runFlow", { flow }),
    stopFlow: (runId) => electron_1.ipcRenderer.invoke("voide:stopFlow", { runId }),
    stepFlow: (runId) => electron_1.ipcRenderer.invoke("voide:stepFlow", { runId }),
    getLastRunPayloads: (runId) => electron_1.ipcRenderer.invoke("voide:getLastRunPayloads", runId),
    secretSet: (scope, key, value) => electron_1.ipcRenderer.invoke("voide:secretSet", { scope, key, value }),
    secretGet: (scope, key) => electron_1.ipcRenderer.invoke("voide:secretGet", { scope, key })
});
