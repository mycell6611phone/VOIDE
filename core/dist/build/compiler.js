import * as pb from "../proto/voide/v1/flow.js";
import { BuildError, validateCanvas, getPort, } from "./validate.js";
export function compile(canvas) {
    validateCanvas(canvas);
    const flow = {
        nodes: canvas.nodes.map((n) => ({ id: n.id, type: n.type })),
        edges: canvas.edges.map((e) => {
            const fromNode = canvas.nodes.find((n) => n.id === e.from[0]);
            const toNode = canvas.nodes.find((n) => n.id === e.to[0]);
            const fromSpec = getPort(fromNode, "out", e.from[1]);
            const toSpec = getPort(toNode, "in", e.to[1]);
            const type = fromSpec.types.find((t) => toSpec.types.includes(t));
            if (!type) {
                throw new BuildError("E-TYPE", `type mismatch ${e.from.join(".")} -> ${e.to.join(".")}`, e.from[0], e.from[1]);
            }
            return {
                from: `${e.from[0]}.${e.from[1]}`,
                to: `${e.to[0]}.${e.to[1]}`,
                type,
            };
        }),
    };
    return pb.Flow.encode(flow).finish();
}
export { BuildError } from "./validate.js";
