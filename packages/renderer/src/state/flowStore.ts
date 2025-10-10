import { create } from "zustand";
import { type EdgeDef, type FlowDef, type NodeDef, type PayloadT } from "@voide/shared";
import {
  formatFlowValidationErrors,
  validateFlowDefinition,
  type FlowValidationError,
} from "@voide/shared/flowValidation";
import { createInitialFlow } from "../constants/mockLayout";
import { voide } from "../voide";
import { useChatStore } from "./chatStore";

const POSITION_KEY = "__position";

const DEFAULT_NODE_POSITION = { x: 360, y: 240 } as const;

const uniqueId = (prefix: string) =>
  `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

const uniqueNodeId = (type: string) => uniqueId(type || "node");

const uniqueEdgeId = (edge: EdgeDef) =>
  uniqueId(`edge-${edge.from[0]}-${edge.to[0]}-${edge.from[1]}-${edge.to[1]}`);

const cloneValue = <T,>(value: T): T => {
  if (typeof structuredClone === "function") {
    return structuredClone(value);
  }
  return JSON.parse(JSON.stringify(value)) as T;
};

type BuildStatus = "idle" | "building" | "success" | "error";
type RunStatus = "idle" | "running" | "success" | "error";

type RunPayloadRecord = { nodeId: string; port: string; payload: PayloadT };

type CompiledFlowHandle = {
  hash: string;
  version: string;
  cached: boolean;
  flow: FlowDef;
};

const RUN_PAYLOAD_FALLBACK_MS = 1500;

const pendingRunPayloads = new Map<string, RunPayloadRecord[]>();
const runPayloadWaiters = new Map<string, Set<(payloads: RunPayloadRecord[]) => void>>();
let runPayloadSubscriptionInitialized = false;

const deliverRunPayloads = (runId: string, payloads: RunPayloadRecord[]) => {
  const waiters = runPayloadWaiters.get(runId);
  if (!waiters || waiters.size === 0) {
    pendingRunPayloads.set(runId, cloneValue(payloads));
    return;
  }
  runPayloadWaiters.delete(runId);
  waiters.forEach((waiter) => {
    try {
      waiter(cloneValue(payloads));
    } catch (error) {
      console.warn("Failed to deliver run payloads to waiter", error);
    }
  });
};

const stashRunPayloads = (runId: string, payloads: RunPayloadRecord[]) => {
  pendingRunPayloads.set(runId, cloneValue(payloads));
  deliverRunPayloads(runId, payloads);
};

const ensureRunPayloadSubscription = () => {
  if (runPayloadSubscriptionInitialized) {
    return;
  }
  runPayloadSubscriptionInitialized = true;
  if (typeof voide.onRunPayloads !== "function") {
    return;
  }
  voide.onRunPayloads((event) => {
    if (!event || typeof event !== "object") {
      return;
    }
    const normalized = (event.payloads ?? []).map((entry) => ({
      nodeId: entry.nodeId,
      port: entry.port,
      payload: entry.payload,
    }));
    stashRunPayloads(event.runId, normalized);
  });
};

const waitForRunPayloads = async (runId: string): Promise<RunPayloadRecord[]> => {
  ensureRunPayloadSubscription();
  if (typeof voide.onRunPayloads !== "function") {
    const fallback = await voide.getLastRunPayloads(runId);
    return cloneValue(fallback);
  }
  const existing = pendingRunPayloads.get(runId);
  if (existing) {
    pendingRunPayloads.delete(runId);
    return cloneValue(existing);
  }
  return new Promise((resolve) => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    const finalize = (payloads: RunPayloadRecord[]) => {
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }
      const waiters = runPayloadWaiters.get(runId);
      if (waiters) {
        waiters.delete(handler);
        if (waiters.size === 0) {
          runPayloadWaiters.delete(runId);
        }
      }
      pendingRunPayloads.delete(runId);
      resolve(cloneValue(payloads));
    };
    const handler = (payloads: RunPayloadRecord[]) => {
      finalize(payloads);
    };
    const waiters = runPayloadWaiters.get(runId) ?? new Set<(payloads: RunPayloadRecord[]) => void>();
    waiters.add(handler);
    runPayloadWaiters.set(runId, waiters);
    timer = globalThis.setTimeout(async () => {
      const waitersSet = runPayloadWaiters.get(runId);
      if (waitersSet) {
        waitersSet.delete(handler);
        if (waitersSet.size === 0) {
          runPayloadWaiters.delete(runId);
        }
      }
      try {
        const fallback = await voide.getLastRunPayloads(runId);
        pendingRunPayloads.delete(runId);
        resolve(cloneValue(fallback));
      } catch (error) {
        console.warn("Failed to fetch run payloads via fallback", error);
        resolve([]);
      }
    }, RUN_PAYLOAD_FALLBACK_MS);
  });
};

ensureRunPayloadSubscription();

const indentBlock = (text: string): string => {
  const safe = text && text.trim().length > 0 ? text : "(no payload)";
  return safe
    .split(/\r?\n/)
    .map((line) => `  ${line}`)
    .join("\n");
};

const formatPayload = (payload: PayloadT): string => {
  switch (payload.kind) {
    case "text":
      return payload.text ?? "";
    case "json":
      try {
        return JSON.stringify(payload.value, null, 2);
      } catch (error) {
        return String(payload.value ?? "");
      }
    case "messages":
      return payload.messages
        .map((entry) => `${entry.role}: ${entry.content}`)
        .join("\n");
    case "vector": {
      const formatted = payload.values
        .slice(0, 8)
        .map((value) =>
          Number.isFinite(value) ? Number(value).toFixed(3) : String(value)
        )
        .join(", ");
      return `[${formatted}${
        payload.values.length > 8 ? ", …" : ""
      }]`;
    }
    case "file":
      return `File: ${payload.path} (${payload.mime})`;
    case "code":
      return `Language: ${payload.language}\n${payload.text}`;
    case "metrics":
      return JSON.stringify(payload.data, null, 2);
    default:
      return "";
  }
};

const summarizeOutputs = (
  flow: FlowDef,
  outputs: RunPayloadRecord[],
  targetNodeId: string
): string => {
  if (!outputs || outputs.length === 0) {
    return "Run completed with no payloads returned.";
  }

  const outputsByNode = new Map<string, RunPayloadRecord[]>();
  for (const record of outputs) {
    const bucket = outputsByNode.get(record.nodeId);
    if (bucket) {
      bucket.push(record);
    } else {
      outputsByNode.set(record.nodeId, [record]);
    }
  }

  const incomingEdges = flow.edges.filter((edge) => edge.to[0] === targetNodeId);
  const relevantRecords: RunPayloadRecord[] = [];

  for (const edge of incomingEdges) {
    const candidates = outputsByNode.get(edge.from[0]);
    if (!candidates) {
      continue;
    }
    for (const record of candidates) {
      if (record.port === edge.from[1]) {
        relevantRecords.push(record);
      }
    }
  }

  if (relevantRecords.length === 0) {
    const direct = outputsByNode.get(targetNodeId);
    if (direct && direct.length > 0) {
      relevantRecords.push(...direct);
    }
  }

  const records = relevantRecords.length > 0 ? relevantRecords : outputs;

  if (records.length === 0) {
    return "Run completed with no payloads returned.";
  }

  return records
    .map((record) => {
      const node = flow.nodes.find((entry) => entry.id === record.nodeId);
      const label = node?.name?.trim() || record.nodeId;
      const formattedPayload = indentBlock(formatPayload(record.payload));
      return `${label} → ${record.port}\n${formattedPayload}`;
    })
    .join("\n\n");
};

const readNodePosition = (node: NodeDef) => {
  const params = node.params as Record<string, unknown> | undefined;
  const value = params?.[POSITION_KEY];
  if (
    value &&
    typeof value === "object" &&
    typeof (value as { x?: unknown }).x === "number" &&
    typeof (value as { y?: unknown }).y === "number"
  ) {
    const position = value as { x: number; y: number };
    return { x: position.x, y: position.y };
  }
  return { ...DEFAULT_NODE_POSITION };
};

const withNodePosition = (node: NodeDef, position: { x: number; y: number }) => {
  const params = { ...(node.params ?? {}) } as Record<string, unknown>;
  params[POSITION_KEY] = { x: position.x, y: position.y };
  return params;
};

type ClipboardItem =
  | { kind: "node"; node: NodeDef; position: { x: number; y: number } }
  | { kind: "edge"; edge: EdgeDef };

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === "string" && value.trim().length > 0;

const pickFirstString = (...values: unknown[]): string | null => {
  for (const value of values) {
    if (isNonEmptyString(value)) {
      return value.trim();
    }
  }
  return null;
};

const findModelNameInCatalog = (
  catalog: unknown,
  modelId: string
): string | null => {
  if (!Array.isArray(catalog)) {
    return null;
  }

  const stack: unknown[] = [...catalog];
  while (stack.length > 0) {
    const entry = stack.pop();
    if (!entry || typeof entry !== "object") {
      continue;
    }

    const record = entry as Record<string, unknown>;
    const entryId = pickFirstString(
      record.id,
      record.modelId,
      record.model_id
    );
    if (entryId && entryId === modelId) {
      const label = pickFirstString(record.name, record.label, record.title);
      if (label) {
        return label;
      }
    }

    const nested = [record.models, record.items, record.children];
    for (const group of nested) {
      if (Array.isArray(group)) {
        stack.push(...group);
      }
    }
  }

  return null;
};

export const deriveLLMDisplayName = (
  params: Record<string, unknown>,
  catalog: unknown
): string | null => {
  const direct = pickFirstString(
    params.modelLabel,
    params.modelName,
    params.displayName,
    params.title,
    params.label
  );
  if (direct) {
    return direct;
  }

  const modelField = params.model;
  if (modelField && typeof modelField === "object") {
    const record = modelField as Record<string, unknown>;
    const nestedDirect = pickFirstString(
      record.name,
      record.label,
      record.title
    );
    if (nestedDirect) {
      return nestedDirect;
    }
    const nestedId = pickFirstString(
      record.id,
      record.modelId,
      record.model_id
    );
    if (nestedId) {
      const trimmedNestedId = nestedId.trim();
      const fromCatalog = findModelNameInCatalog(catalog, trimmedNestedId);
      if (fromCatalog) {
        return fromCatalog;
      }
      const fallback = trimmedNestedId.replace(/^model:/i, "").trim();
      if (fallback) {
        return fallback;
      }
    }
  }

  const modelIdCandidate = pickFirstString(params.modelId, params.model_id);
  if (modelIdCandidate) {
    const modelId = modelIdCandidate.trim();
    const fromCatalog = findModelNameInCatalog(catalog, modelId);
    if (fromCatalog) {
      return fromCatalog;
    }
    const fallback = modelId.replace(/^model:/i, "").trim();
    if (fallback) {
      return fallback;
    }
  }

  return null;
};

interface S {
  flow: FlowDef;
  compiledFlow: CompiledFlowHandle | null;
  buildStatus: BuildStatus;
  buildError: string | null;
  lastBuildAt: number | null;
  runStatus: RunStatus;
  runError: string | null;
  activeRunId: string | null;
  lastRunId: string | null;
  lastRunCompletedAt: number | null;
  lastRunOutputs: RunPayloadRecord[];
  setFlow: (f: FlowDef) => void;
  addNode: (node: NodeDef) => void;
  updateNodeParams: (
    nodeId: string,
    updater: (prev: Record<string, unknown>) => Record<string, unknown>
  ) => void;
  catalog: any[];
  setCatalog: (c: any[]) => void;
  activeTool: "select" | "wire";
  setActiveTool: (tool: "select" | "wire") => void;
  clipboard: ClipboardItem | null;
  setClipboard: (item: ClipboardItem | null) => void;
  copyNode: (nodeId: string) => void;
  cutNode: (nodeId: string) => void;
  deleteNode: (nodeId: string) => void;
  copyEdge: (edgeId: string) => void;
  cutEdge: (edgeId: string) => void;
  deleteEdge: (edgeId: string) => void;
  pasteClipboard: (
    preferredKind?: ClipboardItem["kind"]
  ) => NodeDef | EdgeDef | null;
  buildFlow: () => Promise<{ ok: boolean; hash?: string; error?: string }>;
  runBuiltFlow: () => Promise<{ ok: boolean; runId?: string; error?: string }>;
  stopActiveRun: () => Promise<{ ok: boolean; error?: string }>;
}
export const useFlowStore = create<S>((set, get) => ({
  flow: createInitialFlow(),
  compiledFlow: null,
  buildStatus: "idle",
  buildError: null,
  lastBuildAt: null,
  runStatus: "idle",
  runError: null,
  activeRunId: null,
  lastRunId: null,
  lastRunCompletedAt: null,
  lastRunOutputs: [],
  setFlow: (f: FlowDef) =>
    set({
      flow: f,
      compiledFlow: null,
      buildStatus: "idle",
      buildError: null,
      runStatus: "idle",
      runError: null,
      activeRunId: null,
    }),
  addNode: (node: NodeDef) =>
    set((state) => ({
      flow: {
        ...state.flow,
        nodes: [...state.flow.nodes, node]
      },
      compiledFlow: null,
      buildStatus: "idle",
      buildError: null,
    })),
  updateNodeParams: (nodeId, updater) =>
    set((state) => ({
      flow: {
        ...state.flow,
        nodes: state.flow.nodes.map((node) => {
          if (node.id !== nodeId) {
            return node;
          }

          const previous = { ...(node.params ?? {}) };
          const nextRaw = updater(previous);
          const nextParams =
            nextRaw && typeof nextRaw === "object"
              ? (nextRaw as Record<string, unknown>)
              : previous;

          if ((node.type ?? "module") === "llm") {
            const displayName = deriveLLMDisplayName(
              nextParams,
              state.catalog
            );
            if (displayName && displayName !== node.name) {
              return {
                ...node,
                name: displayName,
                params: nextParams
              };
            }
          }

          return {
            ...node,
            params: nextParams
          };
        })
      },
      compiledFlow: null,
      buildStatus: "idle",
      buildError: null,
    })),
  catalog: [],
  setCatalog: (c: any[]) => set({ catalog: c }),
  activeTool: "select",
  setActiveTool: (tool: "select" | "wire") => set({ activeTool: tool }),
  clipboard: null,
  setClipboard: (item: ClipboardItem | null) => set({ clipboard: item }),
  copyNode: (nodeId: string) => {
    const node = get().flow.nodes.find((entry) => entry.id === nodeId);
    if (!node) {
      return;
    }
    const snapshot = cloneValue(node);
    const position = readNodePosition(node);
    set({ clipboard: { kind: "node", node: snapshot, position } });
  },
  cutNode: (nodeId: string) => {
    const { copyNode, deleteNode } = get();
    copyNode(nodeId);
    deleteNode(nodeId);
  },
  deleteNode: (nodeId: string) =>
    set((state) => {
      if (!state.flow.nodes.some((node) => node.id === nodeId)) {
        return {};
      }
      const nodes = state.flow.nodes.filter((node) => node.id !== nodeId);
      const edges = state.flow.edges.filter(
        (edge) => edge.from[0] !== nodeId && edge.to[0] !== nodeId
      );
      return {
        flow: {
          ...state.flow,
          nodes,
          edges
        },
        compiledFlow: null,
        buildStatus: "idle",
        buildError: null,
      };
    }),
  copyEdge: (edgeId: string) => {
    const edge = get().flow.edges.find((entry) => entry.id === edgeId);
    if (!edge) {
      return;
    }
    set({ clipboard: { kind: "edge", edge: cloneValue(edge) } });
  },
  cutEdge: (edgeId: string) => {
    const { copyEdge, deleteEdge } = get();
    copyEdge(edgeId);
    deleteEdge(edgeId);
  },
  deleteEdge: (edgeId: string) =>
    set((state) => {
      if (!state.flow.edges.some((edge) => edge.id === edgeId)) {
        return {};
      }
      return {
        flow: {
          ...state.flow,
          edges: state.flow.edges.filter((edge) => edge.id !== edgeId)
        },
        compiledFlow: null,
        buildStatus: "idle",
        buildError: null,
      };
    }),
  pasteClipboard: (preferredKind) => {
    const clipboard = get().clipboard;
    if (!clipboard) {
      return null;
    }
    if (preferredKind && clipboard.kind !== preferredKind) {
      return null;
    }
    if (clipboard.kind === "node") {
      const reference = clipboard.node;
      const nextPosition = {
        x: clipboard.position.x + 48,
        y: clipboard.position.y + 48
      };
      const clone = cloneValue(reference);
      const nextId = uniqueNodeId(clone.type ?? "node");
      const params = withNodePosition(clone, nextPosition);
      const nextNode: NodeDef = {
        ...clone,
        id: nextId,
        params
      };
      set((state) => ({
        flow: {
          ...state.flow,
          nodes: [...state.flow.nodes, nextNode]
        },
        compiledFlow: null,
        buildStatus: "idle",
        buildError: null,
      }));
      return nextNode;
    }
    if (clipboard.kind === "edge") {
      const flow = get().flow;
      const { edge } = clipboard;
      const sourceExists = flow.nodes.some((node) => node.id === edge.from[0]);
      const targetExists = flow.nodes.some((node) => node.id === edge.to[0]);
      if (!sourceExists || !targetExists) {
        return null;
      }
      const nextEdge: EdgeDef = {
        ...cloneValue(edge),
        id: uniqueEdgeId(edge)
      };
      set((state) => ({
        flow: {
          ...state.flow,
          edges: [...state.flow.edges, nextEdge]
        },
        compiledFlow: null,
        buildStatus: "idle",
        buildError: null,
      }));
      return nextEdge;
    }
    return null;
  },
  buildFlow: async () => {
    const snapshot = cloneValue(get().flow);
    set({ buildStatus: "building", buildError: null });
    try {
      const localValidation = validateFlowDefinition(snapshot);
      if (!localValidation.ok) {
        const message =
          formatFlowValidationErrors(localValidation.errors).join("\n") ||
          "Flow validation failed.";
        set({ buildStatus: "error", buildError: message });
        return { ok: false, error: message };
      }

      const result = await voide.buildFlow(snapshot);
      if (!result.ok) {
        const message =
          formatFlowValidationErrors((result.errors ?? []) as FlowValidationError[]).join("\n") ||
          result.error ||
          "Flow validation failed.";
        set({ buildStatus: "error", buildError: message });
        return { ok: false, error: message };
      }

      const compiledHandle: CompiledFlowHandle = {
        hash: result.hash,
        version: result.version,
        cached: Boolean(result.cached),
        flow: result.flow as FlowDef,
      };

      set({
        compiledFlow: compiledHandle,
        buildStatus: "success",
        buildError: null,
        lastBuildAt: Date.now(),
      });
      return { ok: true, hash: result.hash };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      set({ buildStatus: "error", buildError: message });
      return { ok: false, error: message };
    }
  },
  runBuiltFlow: async () => {
    const compiledHandle = get().compiledFlow;
    if (!compiledHandle) {
      const message = "Build the flow before running it.";
      set({ runStatus: "error", runError: message });
      return { ok: false, error: message };
    }

    const snapshot = cloneValue(compiledHandle.flow);
    const interfaceNodes = snapshot.nodes.filter((node) => {
      const moduleKey = (node.params as { moduleKey?: unknown } | undefined)?.moduleKey;
      if (typeof moduleKey === "string" && (moduleKey === "interface" || moduleKey === "chat.input")) {
        return true;
      }
      return node.type === "chat.input";
    });
    const chatState = useChatStore.getState();
    const runtimeInputs: Record<string, unknown> = {};
    interfaceNodes.forEach((node) => {
      const thread = chatState.getThread(node.id);
      if (!thread) {
        return;
      }
      const lastUserMessage = [...thread.messages]
        .reverse()
        .find((message) => message.role === "user" && message.content.trim().length > 0);
      if (lastUserMessage) {
        runtimeInputs[node.id] = lastUserMessage.content;
      }
    });
    if (Object.keys(runtimeInputs).length > 0) {
      snapshot.runtimeInputs = { ...(snapshot.runtimeInputs ?? {}), ...runtimeInputs };
    }
    set({ runStatus: "running", runError: null });

    try {
      const { runId } = await voide.runFlow(compiledHandle.hash, runtimeInputs);
      set({ activeRunId: runId, lastRunId: runId });
      const outputs = await waitForRunPayloads(runId);
      const copiedOutputs = cloneValue(outputs);
      set({
        runStatus: "success",
        runError: null,
        activeRunId: null,
        lastRunOutputs: copiedOutputs,
        lastRunCompletedAt: Date.now(),
        lastRunId: runId,
      });

      if (interfaceNodes.length > 0) {
        const chatStore = useChatStore.getState();
        interfaceNodes.forEach((node) => {
          const summary = summarizeOutputs(snapshot, copiedOutputs, node.id);
          try {
            chatStore.addRunResultMessage(
              node.id,
              node.name || node.id,
              summary
            );
          } catch (error) {
            console.warn("Failed to append run result to chat", error);
          }
        });
      }

      return { ok: true, runId };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      set({ runStatus: "error", runError: message, activeRunId: null });
      return { ok: false, error: message };
    }
  },
  stopActiveRun: async () => {
    const runId = get().activeRunId;
    if (!runId) {
      return { ok: false, error: "No active run to stop." };
    }

    try {
      const result = await voide.stopFlow(runId);
      if (result?.ok) {
        set({ activeRunId: null, runStatus: "idle", runError: null });
        return { ok: true };
      }
      const message = "Failed to stop run.";
      set({ activeRunId: null, runStatus: "error", runError: message });
      return { ok: false, error: message };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      set({ activeRunId: null, runStatus: "error", runError: message });
      return { ok: false, error: message };
    }
  }
}));
