import { compile } from "@voide/core/dist/build/compiler.js";
import { FLOW_IR_VERSION } from "@voide/core/dist/build/ir.js";
import { hashCompiledFlow } from "@voide/core/dist/build/hash.js";
import * as pb from "@voide/core/dist/proto/voide/v1/flow.js";
import type { Flow as FlowGraph } from "@voide/ipc";
import type { FlowDef, NodeDef, EdgeDef } from "@voide/shared";

export type CompiledFlowEntry = {
  hash: string;
  version: string;
  flow: FlowDef;
  runtimeInputs: Record<string, unknown>;
  bytes: Uint8Array;
  cachedAt: number;
};

type CompileResult = {
  entry: CompiledFlowEntry;
  cached: boolean;
};

const compiledFlows = new Map<string, CompiledFlowEntry>();

function parseParams(json: string): Record<string, unknown> {
  if (!json) return {};
  try {
    const parsed = JSON.parse(json);
    return parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : {};
  } catch (error) {
    console.warn("[orchestrator] Failed to parse node params", error);
    return {};
  }
}

function convertNode(node: pb.Node): NodeDef {
  return {
    id: node.id,
    type: node.type,
    name: node.name,
    params: parseParams(node.paramsJson),
    in: node.in.map((port) => ({ port: port.port, types: [...port.types] })),
    out: node.out.map((port) => ({ port: port.port, types: [...port.types] })),
  };
}

function convertEdge(edge: pb.Edge): EdgeDef {
  return {
    id: edge.id,
    from: [edge.from?.node ?? "", edge.from?.port ?? ""],
    to: [edge.to?.node ?? "", edge.to?.port ?? ""],
    label: edge.label || undefined,
  };
}

function fromProto(flow: pb.Flow, runtimeInputs: Record<string, unknown>): FlowDef {
  return {
    id: flow.id,
    version: flow.version,
    nodes: flow.nodes.map(convertNode),
    edges: flow.edges.map(convertEdge),
    runtimeInputs: { ...runtimeInputs },
  };
}

function sanitizeFlow(flow: FlowGraph): FlowGraph {
  const sanitizedNodes = flow.nodes?.map((node) => ({
    ...node,
    params: { ...(node.params ?? {}) },
    in: node.in?.map((port) => ({ port: port.port, types: [...(port.types ?? [])] })) ?? [],
    out: node.out?.map((port) => ({ port: port.port, types: [...(port.types ?? [])] })) ?? [],
  })) ?? [];

  const sanitizedEdges = flow.edges?.map((edge) => ({
    id: edge.id ?? "",
    from: [edge.from[0], edge.from[1]] as [string, string],
    to: [edge.to[0], edge.to[1]] as [string, string],
    label: edge.label,
  })) ?? [];

  return {
    id: flow.id,
    version: flow.version ?? "1.0.0",
    nodes: sanitizedNodes,
    edges: sanitizedEdges,
  } as FlowGraph;
}

export function compileAndCache(flow: FlowGraph): CompileResult {
  const runtimeInputs = { ...(flow.runtimeInputs ?? {}) };
  const sanitized = sanitizeFlow(flow);
  const bytes = compile(sanitized as any);
  const hash = hashCompiledFlow(bytes);

  const existing = compiledFlows.get(hash);
  if (existing) {
    existing.runtimeInputs = { ...runtimeInputs };
    existing.flow = {
      ...existing.flow,
      runtimeInputs: { ...runtimeInputs },
    };
    return { entry: existing, cached: true };
  }

  const proto = pb.Flow.decode(bytes);
  const flowDef = fromProto(proto, runtimeInputs);
  const entry: CompiledFlowEntry = {
    hash,
    version: FLOW_IR_VERSION,
    flow: flowDef,
    runtimeInputs: { ...runtimeInputs },
    bytes,
    cachedAt: Date.now(),
  };
  compiledFlows.set(hash, entry);
  return { entry, cached: false };
}

export function getCompiledFlow(hash: string): CompiledFlowEntry | undefined {
  return compiledFlows.get(hash);
}

export function clearCompiledFlows(): void {
  compiledFlows.clear();
}
