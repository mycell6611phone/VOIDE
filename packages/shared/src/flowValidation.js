import Ajv from "ajv";
import { createRequire } from "node:module";
const AjvCtor = Ajv;
const ajv = new AjvCtor({ allErrors: true, strict: false });
const require = createRequire(import.meta.url);
const flowSchema = require("../../../flows/schema/flow.schema.json");
const validateSchema = ajv.compile(flowSchema);
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
    const schemaOk = Boolean(validateSchema(flow));
    const errors = schemaOk ? [] : [...(validateSchema.errors ?? [])];
    if (schemaOk) {
        errors.push(...collectDuplicateErrors(flow.nodes ?? [], flow.edges ?? []));
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
