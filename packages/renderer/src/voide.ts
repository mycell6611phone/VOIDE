import { FlowDef, NodeDef, PayloadT } from "@voide/shared";
import {
  formatFlowValidationErrors,
  validateFlowDefinition,
  type FlowValidationResult,
} from "@voide/shared/flowValidation";
import type {
  Flow as IpcFlow,
  FlowOpenRes,
  NodeCatalogEntry as IpcNodeCatalogEntry,
  TelemetryPayload,
  ModuleTestRes,
} from "@voide/ipc";
import { ipcClient } from "./lib/ipcClient";

export type NodeCatalogEntry = IpcNodeCatalogEntry;

type RunPayloadEvent = {
  runId: string;
  payloads: Array<{ nodeId: string; port: string; payload: PayloadT }>;
};

type BuildFlowSuccess = {
  ok: true;
  hash: string;
  version: string;
  cached: boolean;
  flow: FlowDef;
};

type BuildFlowFailure = {
  ok: false;
  error: string;
  errors?: FlowValidationResult["errors"];
};

export type BuildFlowResult = BuildFlowSuccess | BuildFlowFailure;

export interface VoideApi {
  getNodeCatalog: () => Promise<NodeCatalogEntry[]>;
  buildFlow: (flow: FlowDef) => Promise<BuildFlowResult>;
  runFlow: (compiledHash: string, inputs?: Record<string, unknown>) => Promise<{ runId: string }>;
  stopFlow: (runId: string) => Promise<{ ok: boolean }>;
  openFlow: () => Promise<{ flow: FlowDef; path?: string } | null>;
  saveFlow: (flow: FlowDef) => Promise<void>;
  getLastOpenedFlow: () => Promise<FlowDef | null>;
  validateFlow: (flow: FlowDef) => Promise<FlowValidationResult>;
  getLastRunPayloads: (runId: string) => Promise<Array<{ nodeId: string; port: string; payload: PayloadT }>>;
  onTelemetry?: (cb: (event: TelemetryPayload) => void) => (() => void) | void;
  onRunPayloads?: (cb: (event: RunPayloadEvent) => void) => (() => void) | void;
  testModule: (
    node: NodeDef,
    inputs?: Array<{ port: string; payload: PayloadT }>
  ) => Promise<ModuleTestRes>;
}

const mockCatalog: NodeCatalogEntry[] = [
  {
    type: "chat.input",
    label: "ChatInput",
    inputs: [{ port: "response", types: ["text", "json"] }],
    outputs: [{ port: "text", types: ["text"] }],
    params: { message: "" },
  },
  {
    type: "prompt",
    label: "Prompt",
    inputs: [{ port: "vars", types: ["json", "text"] }],
    outputs: [{ port: "text", types: ["text"] }],
    params: { template: "" },
  },
  {
    type: "llm",
    label: "LLM",
    inputs: [{ port: "prompt", types: ["text"] }],
    outputs: [{ port: "text", types: ["text"] }],
    params: {
      adapter: "llama.cpp",
      runtime: "CPU",
      temperature: 0.7,
      maxTokens: 2048,
    },
  },
  {
    type: "debate.loop",
    label: "Debate/Loop",
    inputs: [{ port: "text", types: ["text"] }],
    outputs: [{ port: "text", types: ["text"] }],
    params: { iterations: 2, reducer: "last" },
  },
  {
    type: "cache",
    label: "Cache",
    inputs: [{ port: "text", types: ["text"] }],
    outputs: [{ port: "text", types: ["text"] }],
    params: { strategy: "read-through", key: "" },
  },
  {
    type: "log",
    label: "Log",
    inputs: [{ port: "any", types: ["text", "json", "vector"] }],
    outputs: [{ port: "any", types: ["text", "json", "vector"] }],
    params: { tag: "" },
  },
  {
    type: "memory",
    label: "Memory",
    inputs: [{ port: "text", types: ["text"] }],
    outputs: [{ port: "text", types: ["text"] }],
    params: { op: "get", namespace: "default", key: "" },
  },
  {
    type: "diverter",
    label: "Diverter",
    inputs: [{ port: "in", types: ["text", "json"] }],
    outputs: [
      { port: "a", types: ["text", "json"] },
      { port: "b", types: ["text", "json"] },
    ],
    params: { route: "all" },
  },
  {
    type: "tool.call",
    label: "Tool Call",
    inputs: [{ port: "args", types: ["json", "text"] }],
    outputs: [{ port: "result", types: ["json", "text"] }],
    params: { tool: "" },
  },
];

const sampleFlow: FlowDef = {
  id: "flow:example",
  version: "1.0.0",
  nodes: [
    {
      id: "chat-input",
      name: "Interface",
      type: "chat.input",
      params: {
        __position: { x: 120, y: 360 },
        role: "entrypoint",
        moduleKey: "chat.input",
        message: "How can I help you today?",
      },
      in: [{ port: "response", types: ["text", "json"] }],
      out: [{ port: "text", types: ["text"] }],
    },
    {
      id: "prompt",
      name: "Prompt",
      type: "prompt",
      params: {
        __position: { x: 420, y: 360 },
        moduleKey: "prompt",
        preset: "analysis",
        template: "You are a helpful assistant.\nUser: {{input}}\nAssistant:",
      },
      in: [{ port: "vars", types: ["json", "text"] }],
      out: [{ port: "text", types: ["text"] }],
    },
    {
      id: "llm",
      name: "LLAMA3.1 8B",
      type: "llm",
      params: {
        __position: { x: 720, y: 360 },
        moduleKey: "llm",
        modelId: "model:llama3.1-8b.Q4_K_M",
        adapter: "llama.cpp",
        runtime: "CPU",
        temperature: 0.2,
        maxTokens: 2048,
      },
      in: [{ port: "prompt", types: ["text"] }],
      out: [{ port: "text", types: ["text"] }],
    },
  ],
  edges: [
    { id: "edge-chat-to-prompt", from: ["chat-input", "text"], to: ["prompt", "vars"] },
    { id: "edge-prompt-to-llm", from: ["prompt", "text"], to: ["llm", "prompt"] },
    { id: "edge-llm-to-chat", from: ["llm", "text"], to: ["chat-input", "response"] },
  ],
};

const mockCompiledFlows = new Map<string, FlowDef>();

function createFallbackVoide(): VoideApi {
  let storedFlow: FlowDef = sampleFlow;
  const telemetryListeners = new Set<(event: TelemetryPayload) => void>();

  return {
    async getNodeCatalog() {
      console.info("[voide-mock] Using mock node catalog (renderer running outside Electron)");
      return mockCatalog;
    },
    async buildFlow(flow) {
      const validation = validateFlowDefinition(flow);
      if (!validation.ok) {
        const message =
          formatFlowValidationErrors(validation.errors).join("; ") ||
          "Flow validation failed.";
        return { ok: false, error: message, errors: validation.errors } satisfies BuildFlowFailure;
      }
      const serialized = JSON.stringify(flow);
      const hash = `mock:${flow.id}:${Date.now().toString(36)}:${Math.random().toString(36).slice(2)}`;
      const copy = JSON.parse(serialized) as FlowDef;
      mockCompiledFlows.set(hash, copy);
      storedFlow = copy;
      console.info(`[voide-mock] Compiled flow '${flow.id}' as ${hash}`);
      return {
        ok: true,
        hash,
        version: copy.version ?? "1.0.0",
        cached: false,
        flow: copy,
      } satisfies BuildFlowSuccess;
    },
    async runFlow(compiledHash, _inputs = {}) {
      const compiled = mockCompiledFlows.get(compiledHash);
      if (!compiled) {
        throw new Error(`No compiled flow found for hash '${compiledHash}'. Build the flow before running it.`);
      }
      console.warn("[voide-mock] Flow execution is disabled outside the Electron runtime.");
      throw new Error(
        "Mock runs have been removed. Start the Electron app with a configured llama.cpp or gpt4all backend to execute flows.",
      );
    },
    async stopFlow(runId) {
      console.warn(`[voide-mock] stopFlow(${runId}) called but no mock run is active.`);
      return { ok: true };
    },
    async openFlow() {
      console.info("[voide-mock] Returning in-memory flow");
      return { flow: storedFlow };
    },
    async saveFlow(flow) {
      storedFlow = flow;
      console.info(`[voide-mock] Saved flow '${flow.id}' in memory`);
    },
    async getLastOpenedFlow() {
      return storedFlow ?? null;
    },
    async validateFlow(flow) {
      const result = validateFlowDefinition(flow);
      if (!result.ok) {
        console.warn(
          "[voide-mock] Flow validation failed:",
          formatFlowValidationErrors(result.errors).join("; "),
        );
      }
      return result;
    },
    async getLastRunPayloads(runId) {
      console.warn(`[voide-mock] getLastRunPayloads(${runId}) requested but mock runs are disabled.`);
      return [];
    },
    async testModule(_node) {
      console.warn("[voide-mock] Module tester is unavailable outside the Electron runtime.");
      return {
        ok: false,
        error: "Module testing is only available when running the Electron app.",
        progress: [],
        logs: []
      } satisfies ModuleTestRes;
    },
    onTelemetry(cb) {
      telemetryListeners.add(cb);
      return () => {
        telemetryListeners.delete(cb);
      };
    },
    onRunPayloads(_cb) {
      console.warn("[voide-mock] onRunPayloads is unavailable outside the Electron runtime.");
      return () => {};
    },
  };
}

function mapOpenFlowResult(result: FlowOpenRes): { flow: FlowDef; path?: string } | null {
  if ("canceled" in result && result.canceled) {
    return null;
  }
  if ("flow" in result) {
    return {
      flow: result.flow as unknown as FlowDef,
      path: result.path ?? undefined,
    };
  }
  return null;
}

function createElectronVoide(): VoideApi {
  return {
    getNodeCatalog: () => ipcClient.getNodeCatalog(),
    buildFlow: async (flow) => {
      const result = await ipcClient.buildFlow(flow as unknown as IpcFlow);
      if (result.ok) {
        return {
          ok: true,
          hash: result.hash,
          version: result.version,
          cached: Boolean(result.cached),
          flow: result.flow as unknown as FlowDef,
        } satisfies BuildFlowSuccess;
      }
      return {
        ok: false,
        error: result.error,
        errors: result.errors as BuildFlowFailure["errors"],
      } satisfies BuildFlowFailure;
    },
    runFlow: (compiledHash, inputs = {}) => ipcClient.runFlow(compiledHash, inputs),
    stopFlow: (runId) => ipcClient.stopFlow(runId),
    openFlow: async () => {
      const result = await ipcClient.openFlow();
      return mapOpenFlowResult(result);
    },
    saveFlow: async (flow) => {
      await ipcClient.saveFlow(flow as unknown as IpcFlow);
    },
    getLastOpenedFlow: async () => {
      const result = await ipcClient.getLastOpenedFlow();
      return result as unknown as FlowDef | null;
    },
    validateFlow: async (flow) => {
      const result = await ipcClient.validateFlow(flow as unknown as IpcFlow);
      return {
        ok: result.ok,
        errors: result.errors as FlowValidationResult["errors"],
      };
    },
    getLastRunPayloads: async (runId) => {
      const payloads = await ipcClient.getLastRunPayloads(runId);
      return payloads.map((entry) => ({
        nodeId: entry.nodeId,
        port: entry.port,
        payload: entry.payload as PayloadT,
      }));
    },
    testModule: (node, inputs = []) =>
      ipcClient.testModule(
        node as unknown as IpcFlow["nodes"][number],
        inputs as Array<{ port: string; payload: unknown }>,
      ),
    onTelemetry: (cb) => ipcClient.onTelemetry(cb),
    onRunPayloads: (cb) =>
      ipcClient.onRunPayloads?.((event) =>
        cb({
          runId: event.runId,
          payloads: event.payloads.map((entry) => ({
            nodeId: entry.nodeId,
            port: entry.port,
            payload: entry.payload as PayloadT,
          })),
        }),
      ),
  };
}

type ElectronBridge = {
  validateFlow: (...args: any[]) => Promise<unknown>;
  buildFlow: (...args: any[]) => Promise<unknown>;
  openFlow: (...args: any[]) => Promise<unknown>;
  saveFlow: (...args: any[]) => Promise<unknown>;
  getLastOpenedFlow: (...args: any[]) => Promise<unknown>;
  runFlow: (...args: any[]) => Promise<unknown>;
  stopFlow: (...args: any[]) => Promise<unknown>;
  getLastRunPayloads: (...args: any[]) => Promise<unknown>;
  testModule: (...args: any[]) => Promise<unknown>;
  onRunPayloads?: (cb: (event: unknown) => void) => (() => void) | void;
  getNodeCatalog: (...args: any[]) => Promise<unknown>;
  onTelemetry: (cb: (event: unknown) => void) => (() => void) | void;
  [key: string]: unknown;
};

declare global {
  interface Window {
    voide?: ElectronBridge;
  }
}

const globalWindow = typeof window !== "undefined" ? (window as Window & { voide?: ElectronBridge }) : undefined;

const hasBridge = Boolean(
  globalWindow?.voide &&
    typeof globalWindow.voide.validateFlow === "function" &&
    typeof globalWindow.voide.buildFlow === "function" &&
    typeof globalWindow.voide.openFlow === "function" &&
    typeof globalWindow.voide.saveFlow === "function" &&
    typeof globalWindow.voide.getLastOpenedFlow === "function" &&
    typeof globalWindow.voide.runFlow === "function" &&
    typeof globalWindow.voide.stopFlow === "function" &&
    typeof globalWindow.voide.getLastRunPayloads === "function" &&
    typeof globalWindow.voide.testModule === "function" &&
    typeof globalWindow.voide.getNodeCatalog === "function",
);

const voideInstance: VoideApi = hasBridge ? createElectronVoide() : createFallbackVoide();

export const voide = voideInstance;
