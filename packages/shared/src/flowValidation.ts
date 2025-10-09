import Ajv from "ajv";
import type { ErrorObject } from "ajv";
import { createRequire } from "node:module";
import type { EdgeDef, FlowDef, NodeDef, PortDef } from "./types.js";

export type FlowValidationError = ErrorObject<string, Record<string, unknown>, unknown>;

export interface FlowValidationResult {
  ok: boolean;
  errors: FlowValidationError[];
}

type AjvValidator<T> = ((data: T) => boolean) & { errors?: FlowValidationError[] | null };
type AjvInstance = { compile<T>(schema: unknown): AjvValidator<T> };
type AjvConstructor = new (options?: Record<string, unknown>) => AjvInstance;

const AjvCtor = Ajv as unknown as AjvConstructor;
const ajv = new AjvCtor({ allErrors: true, strict: false });
const require = createRequire(import.meta.url);
const flowSchema = require("../../../flows/schema/flow.schema.json") as Record<string, unknown>;
const validateSchema = ajv.compile<FlowDef>(flowSchema);

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
  const schemaOk = Boolean(validateSchema(flow));
  const errors: FlowValidationError[] = schemaOk ? [] : [...(validateSchema.errors ?? [])];

  if (schemaOk) {
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

