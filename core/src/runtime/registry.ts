import { NodeRegistry, type NodeHandler } from "../sdk/node.js";
import { registerBuiltins } from "../nodes/builtins.js";

export type NodeTypeDef = NodeHandler;

const registry = new NodeRegistry();
registerBuiltins(registry);

export function getNodeType(type: string): NodeTypeDef {
  try {
    return registry.get(type);
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.toLowerCase().includes("unknown handler kind")
    ) {
      throw new Error(`Unknown node type: ${type}`);
    }
    throw error;
  }
}

