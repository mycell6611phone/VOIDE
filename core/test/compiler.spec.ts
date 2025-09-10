import { describe, expect, it } from "vitest";
import { compile, BuildError, Canvas } from "../src/build/compiler";
import * as pb from "../src/proto/voide/v1/flow";

function makeCanvas(): Canvas {
  return {
    nodes: [
      {
        id: "in",
        type: "input",
        in: [],
        out: [{ port: "out", types: ["UserText"] }],
      },
      {
        id: "out",
        type: "output",
        in: [{ port: "in", types: ["UserText"] }],
        out: [],
      },
    ],
    edges: [{ from: ["in", "out"], to: ["out", "in"] }],
  };
}

describe("compiler", () => {
  it("compiles a valid canvas", () => {
    const bin = compile(makeCanvas());
    expect(bin).toBeInstanceOf(Uint8Array);
    const flow = pb.Flow.decode(bin);
    expect(flow.nodes.length).toBe(2);
    expect(flow.edges.length).toBe(1);
    expect(flow.edges[0]).toEqual({
      from: "in.out",
      to: "out.in",
      type: "UserText",
    });
  });

  it("detects cycles", () => {
    const canvas: Canvas = {
      nodes: [
        {
          id: "a",
          type: "node",
          in: [{ port: "in", types: ["UserText"] }],
          out: [{ port: "out", types: ["UserText"] }],
        },
        {
          id: "b",
          type: "node",
          in: [{ port: "in", types: ["UserText"] }],
          out: [{ port: "out", types: ["UserText"] }],
        },
      ],
      edges: [
        { from: ["a", "out"], to: ["b", "in"] },
        { from: ["b", "out"], to: ["a", "in"] },
      ],
    };
    try {
      compile(canvas);
      expect(false).toBe(true);
    } catch (e) {
      const err = e as BuildError;
      expect(err.code).toBe("E-CYCLE");
      expect(err.node).toBe("a");
    }
  });

  it("detects type mismatch", () => {
    const canvas = makeCanvas();
    canvas.nodes[1].in[0].types = ["PromptText"];
    try {
      compile(canvas);
      expect(false).toBe(true);
    } catch (e) {
      const err = e as BuildError;
      expect(err.code).toBe("E-TYPE");
      expect(err.node).toBe("in");
      expect(err.port).toBe("out");
    }
  });

  it("detects missing menus", () => {
    const canvas = makeCanvas();
    // remove in/out from node
    // @ts-expect-error purposely bad config
    delete (canvas.nodes[0] as any).out;
    try {
      compile(canvas);
      expect(false).toBe(true);
    } catch (e) {
      const err = e as BuildError;
      expect(err.code).toBe("E-CONFIG");
      expect(err.node).toBe("in");
    }
  });

  it("detects dangling edge", () => {
    const canvas = makeCanvas();
    canvas.edges[0].to = ["missing", "in"] as any;
    try {
      compile(canvas);
      expect(false).toBe(true);
    } catch (e) {
      const err = e as BuildError;
      expect(err.code).toBe("E-DANGLING");
      expect(err.node).toBe("missing");
    }
  });

  it("detects unreachable output", () => {
    const canvas: Canvas = {
      nodes: [
        { id: "start", type: "input", in: [], out: [{ port: "out", types: ["UserText"] }] },
        {
          id: "mid",
          type: "mid",
          in: [{ port: "in", types: ["UserText"] }],
          out: [{ port: "out", types: ["UserText"] }],
        },
        {
          id: "end",
          type: "output",
          in: [{ port: "in", types: ["UserText"] }],
          out: [],
        },
      ],
      edges: [{ from: ["start", "out"], to: ["mid", "in"] }],
    };
    try {
      compile(canvas);
      expect(false).toBe(true);
    } catch (e) {
      const err = e as BuildError;
      expect(err.code).toBe("E-UNREACHABLE-OUTPUT");
      expect(err.node).toBe("mid");
      expect(err.port).toBe("out");
    }
  });
});

