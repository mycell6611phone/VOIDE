import type { PayloadT } from "@voide/shared";
import { topoOrder } from "./scheduler.js";
import type { RuntimeFlow } from "./builder.js";
import type { NodeContext, NodeOutput } from "../modules/nodeRegistry.js";

type PortPayloadMap = Record<string, PayloadT[]>;

function buildEdgeMaps(flow: RuntimeFlow) {
  const incoming = new Map<string, RuntimeFlow["edges"][number][]>();
  const outgoing = new Map<string, RuntimeFlow["edges"][number][]>();

  for (const edge of flow.edges ?? []) {
    const [fromNode] = edge.from;
    const [toNode] = edge.to;

    if (fromNode) {
      const outs = outgoing.get(fromNode);
      if (outs) outs.push(edge);
      else outgoing.set(fromNode, [edge]);
    }

    if (toNode) {
      const ins = incoming.get(toNode);
      if (ins) ins.push(edge);
      else incoming.set(toNode, [edge]);
    }
  }

  return { incoming, outgoing };
}

function clonePortPayloadMap(map: PortPayloadMap | undefined): PortPayloadMap {
  if (!map) return {};
  const clone: PortPayloadMap = {};
  for (const [port, values] of Object.entries(map)) {
    clone[port] = [...values];
  }
  return clone;
}

function isPayload(value: unknown): value is PayloadT {
  return Boolean(value) && typeof value === "object" && "kind" in (value as Record<string, unknown>);
}

function recordEmission(
  store: PortPayloadMap,
  port: string,
  payload: unknown,
  nodeId?: string,
): void {
  if (!port) {
    console.warn("[runtime] Ignoring emission without a port name.");
    return;
  }
  if (!isPayload(payload)) {
    const origin = nodeId ? `node "${nodeId}"` : "runtime";
    console.warn(`[runtime] ${origin} emitted invalid payload on port "${port}". Skipping.`);
    return;
  }
  if (!store[port]) {
    store[port] = [];
  }
  store[port].push(payload);
}

function mergeReturnedOutputs(result: unknown, store: PortPayloadMap, nodeId: string): void {
  if (result == null) return;

  if (Array.isArray(result)) {
    for (const entry of result) {
      if (!entry) continue;
      if (Array.isArray(entry) && entry.length >= 2) {
        const [port, payload] = entry as NodeOutput;
        recordEmission(store, String(port), payload, nodeId);
        continue;
      }
      if (typeof entry === "object") {
        const port = (entry as any).port ?? (Array.isArray(entry) ? entry[0] : undefined);
        const payload = (entry as any).payload ?? (entry as any).value ?? (Array.isArray(entry) ? entry[1] : undefined);
        if (port !== undefined && payload !== undefined) {
          recordEmission(store, String(port), payload, nodeId);
        }
      }
    }
    return;
  }

  if (typeof result === "object") {
    for (const [port, value] of Object.entries(result as Record<string, unknown>)) {
      if (Array.isArray(value)) {
        for (const item of value) {
          recordEmission(store, port, item, nodeId);
        }
      } else {
        recordEmission(store, port, value, nodeId);
      }
    }
  }
}

function normalizeEntryData(entryData: any): Map<string, PortPayloadMap> {
  const normalized = new Map<string, PortPayloadMap>();
  if (entryData == null) return normalized;

  const assign = (nodeId: string, port: string, raw: unknown) => {
    const trimmed = port.trim();
    if (!trimmed) {
      console.warn(`[runtime] Ignoring entry payload for node "${nodeId}" without a port identifier.`);
      return;
    }
    const current = normalized.get(nodeId) ?? {};
    const bucket = current[trimmed] ?? [];
    if (Array.isArray(raw)) {
      for (const value of raw) {
        if (isPayload(value)) {
          bucket.push(value);
        } else {
          console.warn(
            `[runtime] Ignoring invalid seeded payload for node "${nodeId}" port "${trimmed}".`,
          );
        }
      }
    } else if (isPayload(raw)) {
      bucket.push(raw);
    } else {
      console.warn(`[runtime] Ignoring invalid seeded payload for node "${nodeId}" port "${trimmed}".`);
    }
    if (bucket.length > 0) {
      current[trimmed] = bucket;
      normalized.set(nodeId, current);
    }
  };

  const process = (nodeId: string, value: unknown) => {
    if (value instanceof Map) {
      for (const [port, payload] of value.entries()) {
        assign(String(nodeId), String(port), payload);
      }
      return;
    }
    if (typeof value === "object" && value !== null && !Array.isArray(value)) {
      for (const [port, payload] of Object.entries(value as Record<string, unknown>)) {
        assign(String(nodeId), port, payload);
      }
      return;
    }

    console.warn(
      `[runtime] Ignoring entry payload for node "${nodeId}"; expected a map of ports to payloads.`,
    );
  };

  if (entryData instanceof Map) {
    for (const [nodeId, payloads] of entryData.entries()) {
      process(String(nodeId), payloads);
    }
  } else if (typeof entryData === "object" && entryData !== null) {
    for (const [nodeId, payloads] of Object.entries(entryData as Record<string, unknown>)) {
      process(nodeId, payloads);
    }
  } else {
    console.warn("[runtime] Ignoring entryData: unsupported format.");
  }

  return normalized;
}

export async function runFlow(
  runtimeFlow: RuntimeFlow,
  entryData?: any,
): Promise<any> {
  if (!runtimeFlow || !(runtimeFlow.nodes instanceof Map)) {
    throw new Error("Invalid runtime flow provided to runFlow.");
  }

  const order = topoOrder(runtimeFlow);
  if (order.length < runtimeFlow.nodes.size) {
    throw new Error("Runtime flow contains cycles or unresolved nodes; unable to execute.");
  }

  const { incoming, outgoing } = buildEdgeMaps(runtimeFlow);
  const nodeOutputs = new Map<string, PortPayloadMap>();
  const nodeInputs = normalizeEntryData(entryData);
  const nodeState = new Map<string, Record<string, any>>();

  for (const nodeId of order) {
    const node = runtimeFlow.nodes.get(nodeId);
    if (!node) {
      console.warn(`[runtime] Skipping unknown node "${nodeId}".`);
      continue;
    }

    const pendingInputs = nodeInputs.get(nodeId);
    const inputs = clonePortPayloadMap(pendingInputs);
    nodeInputs.delete(nodeId);

    for (const port of node.inputs ?? []) {
      if (!inputs[port]) {
        inputs[port] = [];
      }
    }

    const incomingEdges = incoming.get(nodeId) ?? [];
    for (const edge of incomingEdges) {
      const destPort = edge.to[1];
      if (!destPort) continue;
      if (!inputs[destPort]) {
        inputs[destPort] = [];
      }
    }

    const state = nodeState.get(nodeId) ?? {};
    nodeState.set(nodeId, state);

    const emissions: PortPayloadMap = {};
    nodeOutputs.set(node.id, emissions);
    const ctx: NodeContext = {
      id: node.id,
      params: node.params ?? {},
      inputs,
      emit(port: string, value: PayloadT) {
        recordEmission(emissions, port, value, node.id);
      },
      state,
    };

    try {
      const executor = node.execute as unknown as (ctx: NodeContext) => Promise<unknown>;
      const result = await executor(ctx);
      mergeReturnedOutputs(result, emissions, node.id);
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      console.error(`[runtime] Node "${node.id}" execution failed:`, err);
      const wrapped = new Error(`Node "${node.id}" execution failed.`);
      (wrapped as any).cause = err;
      throw wrapped;
    }

    const outgoingEdges = outgoing.get(node.id) ?? [];
    for (const edge of outgoingEdges) {
      const sourcePort = edge.from[1];
      const values = emissions[sourcePort];
      if (!values || values.length === 0) {
        continue;
      }
      const targetNode = edge.to[0];
      const targetPort = edge.to[1];
      if (!targetNode || !targetPort) {
        continue;
      }
      const targetInputs = nodeInputs.get(targetNode) ?? {};
      const bucket = targetInputs[targetPort] ?? [];
      bucket.push(...values);
      targetInputs[targetPort] = bucket;
      nodeInputs.set(targetNode, targetInputs);
    }
  }

  const finalOutputs: Record<string, PortPayloadMap> = {};
  for (const nodeId of runtimeFlow.nodes.keys()) {
    const downstream = outgoing.get(nodeId) ?? [];
    if (downstream.length === 0) {
      finalOutputs[nodeId] = clonePortPayloadMap(nodeOutputs.get(nodeId));
    }
  }

  return finalOutputs;
}

