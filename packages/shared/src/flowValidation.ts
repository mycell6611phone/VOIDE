import type { EdgeDef, FlowDef, NodeDef, PortDef } from "./types.js";

export interface FlowValidationError {
  keyword: string;
  instancePath: string;
  schemaPath: string;
  params: Record<string, unknown>;
  message?: string;
  [key: string]: unknown;
}

export interface FlowValidationResult {
  ok: boolean;
  errors: FlowValidationError[];
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function ensureNonEmptyString(
  value: unknown,
  instancePath: string,
  label: string,
  errors: FlowValidationError[],
) {
  if (typeof value !== "string" || value.trim().length === 0) {
    errors.push(
      createError(
        "type",
        instancePath,
        `${label} must be a non-empty string`,
        { expected: "string" },
      ),
    );
  }
}

function validatePorts(
  ports: unknown,
  instancePath: string,
  direction: "in" | "out",
  errors: FlowValidationError[],
) {
  if (!Array.isArray(ports)) {
    errors.push(
      createError(
        "type",
        instancePath,
        `Node ${direction} ports must be an array`,
        { expected: "array" },
      ),
    );
    return;
  }

  ports.forEach((port, index) => {
    const portPath = `${instancePath}/${index}`;
    if (!isPlainObject(port)) {
      errors.push(
        createError(
          "type",
          portPath,
          "Port definition must be an object",
          { expected: "object" },
        ),
      );
      return;
    }

    ensureNonEmptyString(port.port, `${portPath}/port`, "Port name", errors);

    const types = (port as Record<string, unknown>).types;
    if (!Array.isArray(types)) {
      errors.push(
        createError(
          "type",
          `${portPath}/types`,
          "Port types must be an array of strings",
          { expected: "string[]" },
        ),
      );
      return;
    }

    types.forEach((typeValue, typeIndex) => {
      ensureNonEmptyString(
        typeValue,
        `${portPath}/types/${typeIndex}`,
        "Port type",
        errors,
      );
    });
  });
}

function validateEdgeTuple(
  tuple: unknown,
  instancePath: string,
  label: string,
  errors: FlowValidationError[],
) {
  if (!Array.isArray(tuple)) {
    errors.push(
      createError(
        "type",
        instancePath,
        `${label} must be a tuple [nodeId, port]`,
        { expected: "[string, string]" },
      ),
    );
    return;
  }

  if (tuple.length !== 2) {
    errors.push(
      createError(
        "minItems",
        instancePath,
        `${label} must include node and port identifiers`,
        { expected: 2, actual: tuple.length },
      ),
    );
    return;
  }

  ensureNonEmptyString(tuple[0], `${instancePath}/0`, `${label} node id`, errors);
  ensureNonEmptyString(tuple[1], `${instancePath}/1`, `${label} port`, errors);
}

function validateFlowStructure(flow: unknown): FlowValidationError[] {
  const errors: FlowValidationError[] = [];

  if (!isPlainObject(flow)) {
    errors.push(
      createError("type", "", "Flow must be an object", { expected: "object" }),
    );
    return errors;
  }

  ensureNonEmptyString(flow.id, "/id", "Flow id", errors);
  ensureNonEmptyString(flow.version, "/version", "Flow version", errors);

  const nodes = (flow as { nodes?: unknown }).nodes;
  if (!Array.isArray(nodes)) {
    errors.push(
      createError("type", "/nodes", "Flow nodes must be an array", { expected: "array" }),
    );
  } else {
    nodes.forEach((node, index) => {
      const nodePath = `/nodes/${index}`;
      if (!isPlainObject(node)) {
        errors.push(
          createError(
            "type",
            nodePath,
            "Node entry must be an object",
            { expected: "object" },
          ),
        );
        return;
      }

      ensureNonEmptyString(node.id, `${nodePath}/id`, "Node id", errors);
      ensureNonEmptyString(node.type, `${nodePath}/type`, "Node type", errors);
      ensureNonEmptyString(node.name, `${nodePath}/name`, "Node name", errors);

      const params = (node as Record<string, unknown>).params;
      if (!isPlainObject(params)) {
        errors.push(
          createError(
            "type",
            `${nodePath}/params`,
            "Node params must be an object",
            { expected: "object" },
          ),
        );
      }

      validatePorts((node as Record<string, unknown>).in, `${nodePath}/in`, "in", errors);
      validatePorts((node as Record<string, unknown>).out, `${nodePath}/out`, "out", errors);
    });
  }

  const edges = (flow as { edges?: unknown }).edges;
  if (!Array.isArray(edges)) {
    errors.push(
      createError("type", "/edges", "Flow edges must be an array", { expected: "array" }),
    );
  } else {
    edges.forEach((edge, index) => {
      const edgePath = `/edges/${index}`;
      if (!isPlainObject(edge)) {
        errors.push(
          createError(
            "type",
            edgePath,
            "Edge entry must be an object",
            { expected: "object" },
          ),
        );
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

  const optionalObjects: Array<[keyof FlowDef, string]> = [
    ["prompts", "Prompts"],
    ["models", "Models"],
    ["profiles", "Profiles"],
    ["runtimeInputs", "Runtime inputs"],
  ];

  optionalObjects.forEach(([key, label]) => {
    const value = (flow as Record<string, unknown>)[key];
    if (value === undefined) {
      return;
    }
    if (!isPlainObject(value)) {
      errors.push(
        createError(
          "type",
          `/${key as string}`,
          `${label} must be an object`,
          { expected: "object" },
        ),
      );
    }
  });

  return errors;
}

function createError(
  keyword: string,
  instancePath: string,
  message: string,
  params: Record<string, unknown>,
): FlowValidationError {
  return {
    keyword,
    instancePath,
    schemaPath: "#",
    params,
    message,
  };
}

function collectDuplicateErrors(nodes: FlowDef["nodes"], edges: FlowDef["edges"]): FlowValidationError[] {
  const errors: FlowValidationError[] = [];
  const nodeIds = new Map<string, number>();
  nodes.forEach((node, index) => {
    const seenIndex = nodeIds.get(node.id);
    if (seenIndex !== undefined) {
      errors.push(
        createError(
          "duplicateNodeId",
          `/nodes/${index}/id`,
          `Duplicate node id "${node.id}" (first seen at index ${seenIndex})`,
          { nodeId: node.id, firstIndex: seenIndex, duplicateIndex: index },
        ),
      );
    } else {
      nodeIds.set(node.id, index);
    }
  });

  const edgeIds = new Map<string, number>();
  edges.forEach((edge, index) => {
    if (!edge.id) {
      return;
    }
    const seenIndex = edgeIds.get(edge.id);
    if (seenIndex !== undefined) {
      errors.push(
        createError(
          "duplicateEdgeId",
          `/edges/${index}/id`,
          `Duplicate edge id "${edge.id}" (first seen at index ${seenIndex})`,
          { edgeId: edge.id, firstIndex: seenIndex, duplicateIndex: index },
        ),
      );
    } else {
      edgeIds.set(edge.id, index);
    }
  });

  return errors;
}

function findPort(ports: PortDef[] | undefined, portName: string): PortDef | undefined {
  return ports?.find((port) => port.port === portName);
}

function collectWiringErrors(flow: FlowDef): FlowValidationError[] {
  const errors: FlowValidationError[] = [];
  const nodeMap = new Map<string, { node: NodeDef; index: number }>();
  flow.nodes.forEach((node, index) => {
    nodeMap.set(node.id, { node, index });
  });

  flow.edges.forEach((edge, index) => {
    const [fromNodeId, fromPortName] = edge.from;
    const [toNodeId, toPortName] = edge.to;
    const fromEntry = nodeMap.get(fromNodeId);
    if (!fromEntry) {
      errors.push(
        createError(
          "danglingEdge",
          `/edges/${index}/from`,
          `Edge ${edge.id ?? index} references missing source node "${fromNodeId}"`,
          { edgeId: edge.id ?? index, direction: "from", nodeId: fromNodeId },
        ),
      );
      return;
    }
    const toEntry = nodeMap.get(toNodeId);
    if (!toEntry) {
      errors.push(
        createError(
          "danglingEdge",
          `/edges/${index}/to`,
          `Edge ${edge.id ?? index} references missing target node "${toNodeId}"`,
          { edgeId: edge.id ?? index, direction: "to", nodeId: toNodeId },
        ),
      );
      return;
    }

    const fromPort = findPort(fromEntry.node.out, fromPortName);
    if (!fromPort) {
      errors.push(
        createError(
          "missingPort",
          `/edges/${index}/from`,
          `Edge ${edge.id ?? index} references missing output port "${fromNodeId}.${fromPortName}"`,
          { edgeId: edge.id ?? index, direction: "from", nodeId: fromNodeId, port: fromPortName },
        ),
      );
      return;
    }

    const toPort = findPort(toEntry.node.in, toPortName);
    if (!toPort) {
      errors.push(
        createError(
          "missingPort",
          `/edges/${index}/to`,
          `Edge ${edge.id ?? index} references missing input port "${toNodeId}.${toPortName}"`,
          { edgeId: edge.id ?? index, direction: "to", nodeId: toNodeId, port: toPortName },
        ),
      );
      return;
    }

    const commonTypes = fromPort.types.filter((type) => toPort.types.includes(type));
    if (commonTypes.length === 0) {
      errors.push(
        createError(
          "typeMismatch",
          `/edges/${index}`,
          `Edge ${edge.id ?? index} has incompatible types ${JSON.stringify(fromPort.types)} -> ${JSON.stringify(
            toPort.types,
          )}`,
          {
            edgeId: edge.id ?? index,
            from: { nodeId: fromNodeId, port: fromPortName, types: fromPort.types },
            to: { nodeId: toNodeId, port: toPortName, types: toPort.types },
          },
        ),
      );
    }
  });

  return errors;
}

export function validateFlowDefinition(flow: FlowDef): FlowValidationResult {
  const schemaErrors = validateFlowStructure(flow);
  const errors: FlowValidationError[] = [...schemaErrors];

  if (schemaErrors.length === 0) {
    errors.push(...collectDuplicateErrors(flow.nodes ?? [], flow.edges ?? []));
    errors.push(...collectWiringErrors(flow));
  }

  return { ok: errors.length === 0, errors };
}

export function formatFlowValidationErrors(errors: FlowValidationError[]): string[] {
  return errors.map((error) => {
    if (error.message && error.message.trim().length > 0) {
      return error.message;
    }
    const location = error.instancePath ? ` at ${error.instancePath}` : "";
    return `${error.keyword}${location}`;
  });
}

