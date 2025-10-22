import { contextBridge, ipcRenderer } from "electron";
import {
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
  flowRunPayloadsEvent,
  chatWindowOpen,
  appExit,
  moduleTest,
} from "@voide/ipc";
import type {
  AppExitRes,
  AppGetVersionRes,
  CatalogListRes,
  ChatWindowOpenRes,
  Flow,
  FlowOpenRes,
  FlowBuildRes,
  FlowLastOpenedRes,
  FlowLastRunPayloadsRes,
  FlowRunRes,
  FlowSaveRes,
  FlowStopRes,
  FlowValidateRes,
  ModelEnsureRes,
  ModuleTestRes,
  TelemetryPayload,
  FlowRunPayloadsEvent,
} from "@voide/ipc";

type CanvasGraphLike = { nodes?: unknown; edges?: unknown };
type CanvasRunRequest = { plan: { hash: string; order?: unknown }; input?: Record<string, unknown> };

type CanvasBuildResult = {
  ok: boolean;
  hash?: string;
  plan?: CanvasRunRequest["plan"];
  outFile?: string;
  cached?: boolean;
  dir?: string;
  errors: string[];
};

type CanvasRunResult = {
  ok: boolean;
  hash?: string;
  runId?: string;
  outputs?: unknown;
  error?: string;
};

type SendChatResult = {
  ok: boolean;
  runId?: string;
  response?: string;
  error?: string;
};

type BuildFlowResult = FlowBuildRes | CanvasBuildResult;
type RunFlowResult = FlowRunRes | CanvasRunResult;

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
  if (Array.isArray(candidate.from) || Array.isArray(candidate.to)) return false;
  return Boolean(candidate.from && typeof candidate.from === "object");
}

function looksLikeCanvasRunPayload(value: unknown): value is CanvasRunRequest {
  if (!value || typeof value !== "object") return false;
  const record = value as { plan?: unknown };
  if (!record.plan || typeof record.plan !== "object") return false;
  const plan = record.plan as { hash?: unknown; order?: unknown };
  return typeof plan.hash === "string" && plan.hash.length > 0;
}

function looksLikeCanvasBuildResult(value: unknown): value is CanvasBuildResult {
  if (!value || typeof value !== "object") return false;
  const record = value as { ok?: unknown; errors?: unknown };
  return typeof record.ok === "boolean" && Array.isArray(record.errors);
}

function looksLikeCanvasRunResult(value: unknown): value is CanvasRunResult {
  if (!value || typeof value !== "object") return false;
  const record = value as { ok?: unknown; error?: unknown; runId?: unknown; hash?: unknown };
  if (typeof record.ok !== "boolean") return false;
  if (record.error !== undefined && typeof record.error !== "string") return false;
  if (record.runId !== undefined && typeof record.runId !== "string") return false;
  if (record.hash !== undefined && typeof record.hash !== "string") return false;
  return true;
}

function looksLikeSendChatResult(value: unknown): value is SendChatResult {
  if (!value || typeof value !== "object") return false;
  const record = value as { ok?: unknown; error?: unknown; response?: unknown; runId?: unknown };
  if (typeof record.ok !== "boolean") return false;
  if (record.error !== undefined && typeof record.error !== "string") return false;
  if (record.response !== undefined && typeof record.response !== "string") return false;
  if (record.runId !== undefined && typeof record.runId !== "string") return false;
  return true;
}

type ModelInstallProgress = { id: string; loaded: number; total: number };

export type VoideAPI = {
  isElectron: true;
  validateFlow(flow: Flow): Promise<FlowValidateRes>;
  buildFlow(flow: Flow | CanvasGraphLike): Promise<BuildFlowResult>;
  openFlow(): Promise<FlowOpenRes>;
  saveFlow(flow: Flow, filePath?: string | null): Promise<FlowSaveRes>;
  runFlow(...args: [string, Record<string, unknown>?] | [CanvasRunRequest]): Promise<RunFlowResult>;
  stopFlow(runId: string): Promise<FlowStopRes>;
  getLastRunPayloads(runId: string): Promise<FlowLastRunPayloadsRes>;
  getLastOpenedFlow(): Promise<FlowLastOpenedRes>;
  getNodeCatalog(): Promise<CatalogListRes>;
  ensureModel(modelId: string): Promise<ModelEnsureRes>;
  getModelRegistry(): Promise<unknown>;
  installModel(modelId: string, onProgress?: (payload: ModelInstallProgress) => void): Promise<unknown>;
  selectLlamaBinary(): Promise<{ path?: string } | { canceled: true }>;
  secretSet(scope: string, key: string, value: string): Promise<unknown>;
  secretGet(scope: string, key: string): Promise<unknown>;
  sendChat(message: string): Promise<SendChatResult>;
  getVersion(): Promise<AppGetVersionRes>;
  onTelemetry(cb: (ev: TelemetryPayload) => void): () => void;
  onRunPayloads(cb: (event: FlowRunPayloadsEvent) => void): () => void;
  openChatWindow(): Promise<ChatWindowOpenRes>;
  exitApp(): Promise<AppExitRes>;
  testModule(node: Flow["nodes"][number], inputs?: Array<{ port: string; payload: unknown }>): Promise<ModuleTestRes>;
};

const api: VoideAPI = {
  isElectron: true as const,
  validateFlow: (flow: Flow) => ipcRenderer.invoke(flowValidate.name, flow),
  buildFlow: async (flow: Flow | CanvasGraphLike) => {
    if (looksLikeCanvasBuildPayload(flow)) return ipcRenderer.invoke("build-flow", flow);
    const result = await ipcRenderer.invoke(flowBuild.name, flow);
    return flowBuild.response.parse(result);
  },
  openFlow: () => ipcRenderer.invoke(flowOpen.name),
  saveFlow: (flow: Flow, filePath?: string | null) =>
    ipcRenderer.invoke(flowSave.name, { flow, filePath: filePath ?? null }),
  runFlow: (...args: [string, Record<string, unknown>?] | [CanvasRunRequest]) => {
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

  getModelRegistry: () => ipcRenderer.invoke("voide:listModels"),
  installModel: async (modelId: string, onProgress?: (payload: ModelInstallProgress) => void) => {
    let progressListener:
      | ((event: Electron.IpcRendererEvent, payload: ModelInstallProgress) => void)
      | null = null;
    if (typeof onProgress === "function") {
      progressListener = (_event, payload) => {
        if (!payload || typeof payload !== "object") return;
        if ((payload as { id?: unknown }).id === modelId) {
          const loaded = Number((payload as { loaded?: unknown }).loaded) || 0;
          const total = Number((payload as { total?: unknown }).total) || 0;
          onProgress({ id: modelId, loaded, total });
        }
      };
      ipcRenderer.on("voide:modelInstallProgress", progressListener);
    }
    try {
      return await ipcRenderer.invoke("voide:installModel", { modelId });
    } finally {
      if (progressListener) ipcRenderer.removeListener("voide:modelInstallProgress", progressListener);
    }
  },
  ensureModel: (modelId: string) => ipcRenderer.invoke(modelEnsure.name, { modelId }),
  sendChat: (message: string) => ipcRenderer.invoke("voide:sendChat", { message }),
  selectLlamaBinary: () => ipcRenderer.invoke("voide:selectLlamaBin"),
  secretSet: (scope: string, key: string, value: string) =>
    ipcRenderer.invoke("voide:secretSet", { scope, key, value }),
  secretGet: (scope: string, key: string) => ipcRenderer.invoke("voide:secretGet", { scope, key }),

  getVersion: () => ipcRenderer.invoke(appGetVersion.name),

  onTelemetry: (cb: (ev: TelemetryPayload) => void) => {
    const listener = (_e: Electron.IpcRendererEvent, ev: TelemetryPayload) => cb(ev);
    ipcRenderer.on(telemetryEvent.name, listener);
    return () => ipcRenderer.off(telemetryEvent.name, listener);
  },

  onRunPayloads: (cb: (event: FlowRunPayloadsEvent) => void) => {
    const listener = (_e: Electron.IpcRendererEvent, payload: { runId: string; payloads: unknown }) => {
      try {
        const parsed = flowRunPayloadsEvent.payload.parse(payload);
        cb(parsed);
      } catch (error) {
        console.warn("[voide] Ignoring malformed run payload event", error);
      }
    };
    ipcRenderer.on(flowRunPayloadsEvent.name, listener);
    return () => ipcRenderer.off(flowRunPayloadsEvent.name, listener);
  },

  openChatWindow: async () => {
    const result = await ipcRenderer.invoke(chatWindowOpen.name);
    return chatWindowOpen.response.parse(result);
  },

  exitApp: async () => {
    const result = await ipcRenderer.invoke(appExit.name);
    return appExit.response.parse(result);
  },

  testModule: async (node: Flow["nodes"][number], inputs: Array<{ port: string; payload: unknown }> = []) => {
    const result = await ipcRenderer.invoke(moduleTest.name, { node, inputs });
    return moduleTest.response.parse(result);
  },
};

contextBridge.exposeInMainWorld("voide", api);

declare global {
  interface Window {
    voide: VoideAPI;
  }
}

