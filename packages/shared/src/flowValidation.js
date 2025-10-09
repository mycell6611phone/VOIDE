function isPlainObject(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function ensureNonEmptyString(value, instancePath, label, errors) {
  if (typeof value !== "string" || value.trim().length === 0) {
    errors.push(createError("type", instancePath, `${label} must be a non-empty string`, { expected: "string" }));
  }
}
function validatePorts(ports, instancePath, direction, errors) {
  if (!Array.isArray(ports)) {
    errors.push(createError("type", instancePath, `Node ${direction} ports must be an array`, { expected: "array" }));
    return;
  }
  ports.forEach((port, index) => {
    const portPath = `${instancePath}/${index}`;
    if (!isPlainObject(port)) {
      errors.push(createError("type", portPath, "Port definition must be an object", { expected: "object" }));
      return;
    }
    ensureNonEmptyString(port.port, `${portPath}/port`, "Port name", errors);
    const types = port.types;
    if (!Array.isArray(types)) {
      errors.push(createError("type", `${portPath}/types`, "Port types must be an array of strings", { expected: "string[]" }));
      return;
    }
    types.forEach((typeValue, typeIndex) => {
      ensureNonEmptyString(typeValue, `${portPath}/types/${typeIndex}`, "Port type", errors);
    });
  });
}
function validateEdgeTuple(tuple, instancePath, label, errors) {
  if (!Array.isArray(tuple)) {
    errors.push(createError("type", instancePath, `${label} must be a tuple [nodeId, port]`, { expected: "[string, string]" }));
    return;
  }
  if (tuple.length !== 2) {
    errors.push(createError("minItems", instancePath, `${label} must include node and port identifiers`, { expected: 2, actual: tuple.length }));
    return;
  }
  ensureNonEmptyString(tuple[0], `${instancePath}/0`, `${label} node id`, errors);
  ensureNonEmptyString(tuple[1], `${instancePath}/1`, `${label} port`, errors);
}
function validateFlowStructure(flow) {
  const errors = [];
  if (!isPlainObject(flow)) {
    errors.push(createError("type", "", "Flow must be an object", { expected: "object" }));
    return errors;
  }
  ensureNonEmptyString(flow.id, "/id", "Flow id", errors);
  ensureNonEmptyString(flow.version, "/version", "Flow version", errors);
  const nodes = flow.nodes;
  if (!Array.isArray(nodes)) {
    errors.push(createError("type", "/nodes", "Flow nodes must be an array", { expected: "array" }));
  }
  else {
    nodes.forEach((node, index) => {
      const nodePath = `/nodes/${index}`;
      if (!isPlainObject(node)) {
        errors.push(createError("type", nodePath, "Node entry must be an object", { expected: "object" }));
        return;
      }
      ensureNonEmptyString(node.id, `${nodePath}/id`, "Node id", errors);
      ensureNonEmptyString(node.type, `${nodePath}/type`, "Node type", errors);
      ensureNonEmptyString(node.name, `${nodePath}/name`, "Node name", errors);
      if (!isPlainObject(node.params)) {
        errors.push(createError("type", `${nodePath}/params`, "Node params must be an object", { expected: "object" }));
      }
      validatePorts(node.in, `${nodePath}/in`, "in", errors);
      validatePorts(node.out, `${nodePath}/out`, "out", errors);
    });
  }
  const edges = flow.edges;
  if (!Array.isArray(edges)) {
    errors.push(createError("type", "/edges", "Flow edges must be an array", { expected: "array" }));
  }
  else {
    edges.forEach((edge, index) => {
      const edgePath = `/edges/${index}`;
      if (!isPlainObject(edge)) {
        errors.push(createError("type", edgePath, "Edge entry must be an object", { expected: "object" }));
        return;
      }
      ensureNonEmptyString(edge.id, `${edgePath}/id`, "Edge id", errors);
      validateEdgeTuple(edge.from, `${edgePath}/from`, "Edge source", errors);
      validateEdgeTuple(edge.to, `${edgePath}/to`, "Edge target", errors);
      if ("label" in edge && edge.label !== undefined) {
        ensureNonEmptyString(edge.label, `${edgePath}/label`, "Edge label", errors);
      }
    });
  }
  [
    ["prompts", "Prompts"],
    ["models", "Models"],
    ["profiles", "Profiles"],
    ["runtimeInputs", "Runtime inputs"],
  ].forEach(([key, label]) => {
    const value = flow[key];
    if (value === undefined) {
      return;
    }
    if (!isPlainObject(value)) {
      errors.push(createError("type", `/${key}`, `${label} must be an object`, { expected: "object" }));
    }
  });
  return errors;
}
function createError(keyword, instancePath, message, params) {
    return {
        keyword,
        instancePath,
        schemaPath: "#",
        params,
        message,
    };
}
function collectDuplicateErrors(nodes, edges) {
    const errors = [];
    const nodeIds = new Map();
    nodes.forEach((node, index) => {
        const seenIndex = nodeIds.get(node.id);
        if (seenIndex !== undefined) {
            errors.push(createError("duplicateNodeId", `/nodes/${index}/id`, `Duplicate node id "${node.id}" (first seen at index ${seenIndex})`, { nodeId: node.id, firstIndex: seenIndex, duplicateIndex: index }));
        }
        else {
            nodeIds.set(node.id, index);
        }
    });
    const edgeIds = new Map();
    edges.forEach((edge, index) => {
        if (!edge.id) {
            return;
        }
        const seenIndex = edgeIds.get(edge.id);
        if (seenIndex !== undefined) {
            errors.push(createError("duplicateEdgeId", `/edges/${index}/id`, `Duplicate edge id "${edge.id}" (first seen at index ${seenIndex})`, { edgeId: edge.id, firstIndex: seenIndex, duplicateIndex: index }));
        }
        else {
            edgeIds.set(edge.id, index);
        }
    });
    return errors;
}
function findPort(ports, portName) {
    return ports?.find((port) => port.port === portName);
}
function collectWiringErrors(flow) {
    const errors = [];
    const nodeMap = new Map();
    flow.nodes.forEach((node, index) => {
        nodeMap.set(node.id, { node, index });
    });
    flow.edges.forEach((edge, index) => {
        const [fromNodeId, fromPortName] = edge.from;
        const [toNodeId, toPortName] = edge.to;
        const fromEntry = nodeMap.get(fromNodeId);
        if (!fromEntry) {
            errors.push(createError("danglingEdge", `/edges/${index}/from`, `Edge ${edge.id ?? index} references missing source node "${fromNodeId}"`, { edgeId: edge.id ?? index, direction: "from", nodeId: fromNodeId }));
            return;
        }
        const toEntry = nodeMap.get(toNodeId);
        if (!toEntry) {
            errors.push(createError("danglingEdge", `/edges/${index}/to`, `Edge ${edge.id ?? index} references missing target node "${toNodeId}"`, { edgeId: edge.id ?? index, direction: "to", nodeId: toNodeId }));
            return;
        }
        const fromPort = findPort(fromEntry.node.out, fromPortName);
        if (!fromPort) {
            errors.push(createError("missingPort", `/edges/${index}/from`, `Edge ${edge.id ?? index} references missing output port "${fromNodeId}.${fromPortName}"`, { edgeId: edge.id ?? index, direction: "from", nodeId: fromNodeId, port: fromPortName }));
            return;
        }
        const toPort = findPort(toEntry.node.in, toPortName);
        if (!toPort) {
            errors.push(createError("missingPort", `/edges/${index}/to`, `Edge ${edge.id ?? index} references missing input port "${toNodeId}.${toPortName}"`, { edgeId: edge.id ?? index, direction: "to", nodeId: toNodeId, port: toPortName }));
            return;
        }
        const commonTypes = fromPort.types.filter((type) => toPort.types.includes(type));
        if (commonTypes.length === 0) {
            errors.push(createError("typeMismatch", `/edges/${index}`, `Edge ${edge.id ?? index} has incompatible types ${JSON.stringify(fromPort.types)} -> ${JSON.stringify(toPort.types)}`, {
                edgeId: edge.id ?? index,
                from: { nodeId: fromNodeId, port: fromPortName, types: fromPort.types },
                to: { nodeId: toNodeId, port: toPortName, types: toPort.types },
            }));
        }
    });
    return errors;
}
export function validateFlowDefinition(flow) {
    const schemaErrors = validateFlowStructure(flow);
    const errors = [...schemaErrors];
    if (schemaErrors.length === 0) {
        errors.push(...collectDuplicateErrors((flow.nodes ?? []), (flow.edges ?? [])));
        errors.push(...collectWiringErrors(flow));
    }
    return { ok: errors.length === 0, errors };
}
export function formatFlowValidationErrors(errors) {
    return errors.map((error) => {
        if (error.message && error.message.trim().length > 0) {
            return error.message;
        }
        const location = error.instancePath ? ` at ${error.instancePath}` : "";
        return `${error.keyword}${location}`;
    });
}
