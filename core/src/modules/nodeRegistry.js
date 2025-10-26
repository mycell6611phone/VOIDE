const nodeRegistry = new Map();
export function registerNodeType(def) {
    const key = def.type?.trim();
    if (!key) {
        throw new Error("Node type must be a non-empty string");
    }
    if (nodeRegistry.has(key)) {
        console.warn(`[nodeRegistry] Duplicate registration detected for "${key}". Overwriting existing definition.`);
    }
    nodeRegistry.set(key, def);
}
export function getNodeType(type) {
    const key = type?.trim();
    if (!key) {
        return undefined;
    }
    return nodeRegistry.get(key);
}
export function getAllNodeTypes() {
    return Array.from(nodeRegistry.values());
}
