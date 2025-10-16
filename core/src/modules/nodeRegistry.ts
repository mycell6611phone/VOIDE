import type { PayloadT, PortDef } from "@voide/shared";

export interface NodeTypeDef {
  type: string;
  label: string;
  inputs: PortDef[];
  outputs: PortDef[];
  execute: (ctx: NodeContext) => Promise<NodeOutput[]>;
}

export interface NodeContext {
  id: string;
  params: Record<string, any>;
  inputs: Record<string, PayloadT[]>;
  emit: (port: string, value: PayloadT) => void;
  state: Record<string, any>;
}

export type NodeOutput = [string, PayloadT];

const nodeRegistry = new Map<string, NodeTypeDef>();

export function registerNodeType(def: NodeTypeDef): void {
  const key = def.type?.trim();
  if (!key) {
    throw new Error("Node type must be a non-empty string");
  }

  if (nodeRegistry.has(key)) {
    console.warn(
      `[nodeRegistry] Duplicate registration detected for "${key}". Overwriting existing definition.`
    );
  }

  nodeRegistry.set(key, def);
}

export function getNodeType(type: string): NodeTypeDef | undefined {
  const key = type?.trim();
  if (!key) {
    return undefined;
  }
  return nodeRegistry.get(key);
}

export function getAllNodeTypes(): NodeTypeDef[] {
  return Array.from(nodeRegistry.values());
}

