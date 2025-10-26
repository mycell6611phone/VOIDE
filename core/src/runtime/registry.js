import { NodeRegistry } from "../sdk/node.js";
import { registerBuiltins } from "../nodes/builtins.js";
const registry = new NodeRegistry();
registerBuiltins(registry);
export function getNodeType(type) {
    try {
        return registry.get(type);
    }
    catch (error) {
        if (error instanceof Error &&
            error.message.toLowerCase().includes("unknown handler kind")) {
            throw new Error(`Unknown node type: ${type}`);
        }
        throw error;
    }
}
