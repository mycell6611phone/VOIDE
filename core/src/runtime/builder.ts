import type { FlowDef, EdgeDef } from "@voide/shared";
import { getNodeType, type NodeTypeDef } from "./registry.js";

export interface RuntimeNode {
  id: string;
  type: string;
  execute: NodeTypeDef["execute"];
  params: Record<string, any>;
  inputs: string[];
  outputs: string[];
}

export interface RuntimeFlow {
  nodes: Map<string, RuntimeNode>;
  edges: EdgeDef[];
}

function collectPorts(
  defined: { port: string }[] | undefined,
  declared: Record<string, unknown>,
): string[] {
  const ports: string[] = [];
  const seen = new Set<string>();

  for (const entry of defined ?? []) {
    if (typeof entry?.port === "string" && !seen.has(entry.port)) {
      ports.push(entry.port);
      seen.add(entry.port);
    }
  }

  for (const key of Object.keys(declared ?? {})) {
    if (!seen.has(key)) {
      ports.push(key);
      seen.add(key);
    }
  }

  return ports;
}

function cloneEdge(edge: EdgeDef): EdgeDef {
  return {
    id: edge.id,
    from: [edge.from[0], edge.from[1]] as [string, string],
    to: [edge.to[0], edge.to[1]] as [string, string],
    label: edge.label,
  };
}

export function buildFlow(flowDef: FlowDef): RuntimeFlow {
  const nodes = new Map<string, RuntimeNode>();

  for (const node of flowDef.nodes ?? []) {
    const typeDef = getNodeType(node.type);
    const params = { ...(node.params ?? {}) };
    const inputs = collectPorts(node.in, typeDef.inPorts as Record<string, unknown>);
    const outputs = collectPorts(node.out, typeDef.outPorts as Record<string, unknown>);

    nodes.set(node.id, {
      id: node.id,
      type: node.type,
      execute: typeDef.execute,
      params,
      inputs,
      outputs,
    });
  }

  const edges = (flowDef.edges ?? []).map(cloneEdge);

  return { nodes, edges };
}

