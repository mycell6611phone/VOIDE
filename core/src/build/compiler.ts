import * as pb from "../proto/voide/v1/flow";
import {
  Canvas,
  BuildError,
  validateCanvas,
  getPort,
} from "./validate";
import type { FlowEnvelope, Node, Edge as EdgeSpec, Port } from "../flow/schema";

export function compile(env: FlowEnvelope): Uint8Array {
  const canvas: Canvas = {
    nodes: env.nodes.map((n: Node) => ({
      id: n.id,
      type: n.type,
      in: n.in,
      out: n.out,
    })),
    edges: env.edges.map((e: EdgeSpec) => ({ from: e.from, to: e.to })),
  };
  validateCanvas(canvas);

  const flow: pb.Flow = {
    id: env.id,
    version: env.version,
    nodes: env.nodes.map((n: Node) => ({
      id: n.id,
      type: n.type,
      name: n.name ?? "",
      paramsJson: JSON.stringify(n.params ?? {}),
      in: n.in.map((p: Port) => ({ port: p.port, types: [...p.types] })),
      out: n.out.map((p: Port) => ({ port: p.port, types: [...p.types] })),
    })),
    edges: env.edges.map((e: EdgeSpec) => {
      const fromNode = canvas.nodes.find((n) => n.id === e.from[0])!;
      const toNode = canvas.nodes.find((n) => n.id === e.to[0])!;
      const fromSpec = getPort(fromNode, "out", e.from[1])!;
      const toSpec = getPort(toNode, "in", e.to[1])!;
      const type = fromSpec.types.find((t) => toSpec.types.includes(t));
      if (!type) {
        throw new BuildError(
          "E-TYPE",
          `type mismatch ${e.from.join(".")} -> ${e.to.join(".")}`,
          e.from[0],
          e.from[1]
        );
      }
      return {
        id: e.id ?? "",
        from: { node: e.from[0], port: e.from[1] },
        to: { node: e.to[0], port: e.to[1] },
        label: e.label ?? "",
        type,
      };
    }),
  };

  return pb.Flow.encode(flow).finish();
}

export { Canvas } from "./validate";

export { BuildError } from "./validate";

