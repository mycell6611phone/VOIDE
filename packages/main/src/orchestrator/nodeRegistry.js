const registry = new Map();
export function registerNode(impl) {
    const key = impl.type.trim();
    if (!key) {
        throw new Error("Node type key must be a non-empty string.");
    }
    registry.set(key, impl);
}
export function clearAndRegister(impls) {
    registry.clear();
    impls.forEach(registerNode);
}
export function listNodes() {
    return Array.from(registry.values()).filter((entry) => entry.hidden !== true);
}
export function getNode(type) {
    return registry.get(type);
}
