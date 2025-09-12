import { describe, it, expect } from "vitest";
import * as pb from "../src/proto/voide/v1/flow";
import { runFlow } from "../src/run";

function makeFlow(): Uint8Array {
  const flow: pb.Flow = {
    id: "f1",
    version: "1",
    nodes: [
      {
        id: "user",
        type: "InputNode",
        name: "",
        paramsJson: "{}",
        in: [],
        out: [{ port: "text", types: ["UserText"] }],
      },
      {
        id: "router",
        type: "RouterDividerNode",
        name: "",
        paramsJson: "{}",
        in: [{ port: "text", types: ["UserText"] }],
        out: [
          { port: "valid", types: ["LLMText"] },
          { port: "invalid", types: ["LLMText"] },
        ],
      },
      {
        id: "norm",
        type: "BulletListNormalizerNode",
        name: "",
        paramsJson: "{}",
        in: [{ port: "text", types: ["LLMText"] }],
        out: [{ port: "text", types: ["LLMText"] }],
      },
      {
        id: "out",
        type: "OutputNode",
        name: "",
        paramsJson: "{}",
        in: [{ port: "text", types: ["LLMText"] }],
        out: [],
      },
    ],
    edges: [
      {
        id: "e1",
        from: { node: "user", port: "text" },
        to: { node: "router", port: "text" },
        label: "",
        type: "UserText",
      },
      {
        id: "e2",
        from: { node: "router", port: "valid" },
        to: { node: "out", port: "text" },
        label: "",
        type: "LLMText",
      },
      {
        id: "e3",
        from: { node: "router", port: "invalid" },
        to: { node: "norm", port: "text" },
        label: "",
        type: "LLMText",
      },
      {
        id: "e4",
        from: { node: "norm", port: "text" },
        to: { node: "out", port: "text" },
        label: "",
        type: "LLMText",
      },
    ],
  };
  return pb.Flow.encode(flow).finish();
}

async function exec(input: string) {
  const iter = runFlow(makeFlow(), { user: input }, {});
  let result: any;
  const events: any[] = [];
  while (true) {
    const { value, done } = await iter.next();
    if (done) { result = value; break; }
    events.push(value);
  }
  return { result, events };
}

describe("router-divider", () => {
  it("routes valid payload forward", async () => {
    const { result, events } = await exec("- one\n- two");
    expect(result.outputs.out).toBe("- one\n- two");
    const nodes = events
      .filter((e) => e.type === "node_state" && e.state === "running")
      .map((e) => e.nodeId);
    expect(nodes).toEqual(["user", "router", "out"]);
  });

  it("normalizes invalid payload and continues", async () => {
    const { result, events } = await exec("hello world");
    expect(result.outputs.out).toBe("- hello world");
    const nodes = events
      .filter((e) => e.type === "node_state" && e.state === "running")
      .map((e) => e.nodeId);
    expect(nodes).toEqual(["user", "router", "norm", "out"]);
  });
});
