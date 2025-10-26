function ensureArray(map, key) {
    let list = map.get(key);
    if (!list) {
        list = [];
        map.set(key, list);
    }
    return list;
}
export function topoOrder(flow) {
    const nodeIds = Array.from(flow.nodes.keys());
    const nodeSet = new Set(nodeIds);
    const indegree = new Map();
    const outgoing = new Map();
    for (const nodeId of nodeIds) {
        indegree.set(nodeId, 0);
    }
    for (const edge of flow.edges ?? []) {
        const fromId = edge.from?.[0];
        const toId = edge.to?.[0];
        if (fromId && nodeSet.has(fromId) && toId && nodeSet.has(toId)) {
            ensureArray(outgoing, fromId).push(toId);
        }
        else if (fromId && !nodeSet.has(fromId)) {
            console.warn(`[runtime] topoOrder encountered edge with unknown source node "${fromId}".`);
        }
        if (!toId) {
            continue;
        }
        if (!nodeSet.has(toId)) {
            console.warn(`[runtime] topoOrder encountered edge with unknown target node "${toId}".`);
            continue;
        }
        indegree.set(toId, (indegree.get(toId) ?? 0) + 1);
    }
    const queue = [];
    for (const [nodeId, degree] of indegree.entries()) {
        if (degree === 0) {
            queue.push(nodeId);
        }
    }
    const order = [];
    while (queue.length > 0) {
        const current = queue.shift();
        order.push(current);
        const neighbors = outgoing.get(current) ?? [];
        for (const next of neighbors) {
            const nextDegree = (indegree.get(next) ?? 0) - 1;
            indegree.set(next, nextDegree);
            if (nextDegree === 0) {
                queue.push(next);
            }
        }
    }
    if (order.length !== nodeIds.length) {
        console.warn(`[runtime] topoOrder detected a cycle or missing nodes. Expected ${nodeIds.length}, got ${order.length}.`);
    }
    return order;
}
