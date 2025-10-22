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

type CanvasGraphLike = { nodes?: unknown; edges?: unknown };
type CanvasRunRequest = { plan: { hash: string; order?: unknown }; input?: Record<string, unknown> };

function looksLikeCanvasBuildPayload(value: unknown): value is CanvasGraphLike {
  if (!value || typeof value !== "object") return false;
  const graph = value as { nodes?: unknown; edges?: unknown };
  if (!Array.isArray(graph.nodes) || !Array.isArray(graph.edges)) return false;
  const nodes = graph.nodes as unknown[];
  const edges = graph.edges as unknown[];
  const structuredEdge = edges.find((edge) => edge && typeof edge === "object");
  if (!structuredEdge) {
    const representative = nodes.find((node) => node && typeof node === "object");
    return representative ? typeof (representative as { name?: unknown }).name !== "string" : true;
  }
  const candidate = structuredEdge as { from?: unknown; to?: unknown };
  if (Array.isArray(candidate.from) || Array.isArray(candidate.to)) {
    return false;
  }
  return Boolean(candidate.from && typeof candidate.from === "object");
}

function looksLikeCanvasRunPayload(value: unknown): value is CanvasRunRequest {
  if (!value || typeof value !== "object") return false;
  const record = value as { plan?: unknown };
  if (!record.plan || typeof record.plan !== "object") return false;
  const plan = record.plan as { hash?: unknown; order?: unknown };
  return typeof plan.hash === "string" && plan.hash.length > 0;
}

const api = {
  isElectron: true as const,
  validateFlow: (flow: Flow) => ipcRenderer.invoke(flowValidate.name, flow),
  buildFlow: async (flow: Flow | CanvasGraphLike) => {
    if (looksLikeCanvasBuildPayload(flow)) {
      return ipcRenderer.invoke("build-flow", flow);
    }
    const result = await ipcRenderer.invoke(flowBuild.name, flow);
    return flowBuild.response.parse(result);
  },
  openFlow: () => ipcRenderer.invoke(flowOpen.name),
  saveFlow: (flow: Flow, filePath?: string | null) =>
    ipcRenderer.invoke(flowSave.name, { flow, filePath: filePath ?? null }),
  runFlow: (
    ...args: [string, Record<string, unknown>?] | [CanvasRunRequest]
  ) => {
    if (args.length === 1 && looksLikeCanvasRunPayload(args[0])) {
      return ipcRenderer.invoke("run-flow", args[0]);
    }
    const [compiledHash, inputs] = args as [string, Record<string, unknown>?];
    return ipcRenderer.invoke(flowRun.name, { compiledHash, inputs: inputs ?? {} });
  },
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

