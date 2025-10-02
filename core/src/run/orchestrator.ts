import * as pb from "../proto/voide/v1/flow.js";
import { NodeRegistry, makeContext } from "../sdk/node.js";
import { Providers } from "../nodes/builtins.js";
import { Scheduler } from "./scheduler.js";
import { emit as emitTelemetry, TelemetryEventType } from "./telemetry.js";

export type NodeStatus =
  | "idle"
  | "queued"
  | "running"
  | "ok"
  | "warn"
  | "error";

export type TelemetryEvent =
  | {
      type: "node_state";
      runId: string;
      nodeId: string;
      state: NodeStatus;
      at: number;
    }
  | {
      type: "edge_transfer";
      runId: string;
      edgeId: string;
      bytes: number;
      at: number;
    }
  | {
      type: "normalize";
      runId: string;
      nodeId: string;
      fromType: string;
      toType: string;
      at: number;
    }
  | {
      type: "error";
      runId: string;
      nodeId: string;
      code: string;
      message: string;
      at: number;
    };

export interface RunResult {
  outputs: Record<string, any>;
}

const DEFAULT_TIMEOUT_MS = 5000;
const DEFAULT_RETRIES = 0;

interface RuntimeEdge {
  id: string;
  fromNode: string;
  fromPort: string;
  toNode: string;
  toPort: string;
  type: string;
  mailbox: any[];
}

function parseEdge(e: pb.Edge): RuntimeEdge {
  return {
    id: e.id ?? "",
    fromNode: e.from?.node ?? "",
    fromPort: e.from?.port ?? "",
    toNode: e.to?.node ?? "",
    toPort: e.to?.port ?? "",
    type: e.type,
    mailbox: [],
  };
}

function nodeConfig(node: pb.Node): any {
  switch (node.type) {
    case "InputNode":
      return { id: node.id };
    case "OutputNode":
      return { name: node.id };
    case "LogNode":
      return { name: node.id };
    case "LLMNode":
      return { model: "stub" };
    default:
      return {};
  }
}

async function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    p,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error("timeout")), ms)
    ),
  ]);
}

export async function* orchestrate(
  flowBin: Uint8Array,
  runtimeInputs: Record<string, any>,
  registry: NodeRegistry,
  providers: Providers = {},
  scheduler: Scheduler = new Scheduler(),
  runId: string,
): AsyncGenerator<TelemetryEvent, RunResult> {
  const flow = pb.Flow.decode(flowBin);
  const ctx = makeContext();
  ctx.inputs = runtimeInputs ?? {};

  const nodes = new Map(flow.nodes.map((n) => [n.id, n]));
  const inEdges = new Map<string, RuntimeEdge[]>();
  const outEdges = new Map<string, RuntimeEdge[]>();

  for (const e of flow.edges.map(parseEdge)) {
    const outs = outEdges.get(e.fromNode) ?? [];
    outs.push(e);
    outEdges.set(e.fromNode, outs);
    const ins = inEdges.get(e.toNode) ?? [];
    ins.push(e);
    inEdges.set(e.toNode, ins);
  }

  const states = new Map<string, NodeStatus>();
  const ready: string[] = [];
  let wireSeq = 0;
  for (const n of flow.nodes) {
    states.set(n.id, "idle");
    if ((inEdges.get(n.id) ?? []).length === 0) {
      ready.push(n.id);
      states.set(n.id, "queued");
      yield {
        type: "node_state",
        runId,
        nodeId: n.id,
        state: "queued",
        at: Date.now(),
      };
    }
  }
  const executed = new Set<string>();

  while (ready.length > 0) {
    await scheduler.next();
    ready.sort();
    const nodeId = ready.shift()!;
    if (executed.has(nodeId)) continue;
    executed.add(nodeId);
    states.set(nodeId, "running");
    emitTelemetry({
      type: TelemetryEventType.NodeStart,
      payload: { id: nodeId, span: runId },
    });
    yield {
      type: "node_state",
      runId,
      nodeId,
      state: "running",
      at: Date.now(),
    };

    const cfg = nodes.get(nodeId)!;
    const handler = registry.get(cfg.type);
    const inputs: any = {};
    for (const e of inEdges.get(nodeId) ?? []) {
      if (inputs[e.toPort] === undefined && e.mailbox.length > 0) {
        inputs[e.toPort] = e.mailbox.shift();
      }
    }
    let output: any;
    let attempt = 0;
    while (true) {
      try {
        output = await withTimeout(
          handler.execute({
            config: nodeConfig(cfg),
            inputs,
            context: ctx,
            providers,
          }),
          DEFAULT_TIMEOUT_MS
        );
        break;
      } catch (err) {
        attempt++;
        if (attempt > DEFAULT_RETRIES) {
          const error = err instanceof Error ? err : new Error(String(err));
          states.set(nodeId, "error");
          emitTelemetry({
            type: TelemetryEventType.NodeEnd,
            payload: {
              id: nodeId,
              span: runId,
              ok: false,
              reason: error.message,
            },
          });
          yield {
            type: "node_state",
            runId,
            nodeId,
            state: "error",
            at: Date.now(),
          };
          yield {
            type: "error",
            runId,
            nodeId,
            code: "runtime",
            message: error.message,
            at: Date.now(),
          };
          throw error;
        }
      }
    }
    states.set(nodeId, "ok");
    emitTelemetry({
      type: TelemetryEventType.NodeEnd,
      payload: {
        id: nodeId,
        span: runId,
        ok: true,
      },
    });
    yield {
      type: "node_state",
      runId,
      nodeId,
      state: "ok",
      at: Date.now(),
    };

    for (const e of outEdges.get(nodeId) ?? []) {
      const val = output[e.fromPort];
      if (val !== undefined) {
        e.mailbox.push(val);
        const bytes = JSON.stringify(val).length;
        wireSeq += 1;
        emitTelemetry({
          type: TelemetryEventType.WireTx,
          payload: {
            id: e.id,
            span: runId,
            pkt: `${wireSeq}`,
            from: e.fromNode,
            to: e.toNode,
            outPort: e.fromPort,
            inPort: e.toPort,
          },
        });
        yield {
          type: "edge_transfer",
          runId,
          edgeId: e.id,
          bytes,
          at: Date.now(),
        };
      }
      const incoming = inEdges.get(e.toNode) ?? [];
      const portReady = new Map<string, boolean>();
      for (const ie of incoming) {
        const hasVal = ie.mailbox.length > 0;
        const prev = portReady.get(ie.toPort) ?? false;
        portReady.set(ie.toPort, prev || hasVal);
      }
      const readyFlag = Array.from(portReady.values()).every(Boolean);
      if (readyFlag && !executed.has(e.toNode) && !ready.includes(e.toNode)) {
        ready.push(e.toNode);
        states.set(e.toNode, "queued");
        yield {
          type: "node_state",
          runId,
          nodeId: e.toNode,
          state: "queued",
          at: Date.now(),
        };
      }
    }
  }

  return { outputs: ctx.outputs };
}

