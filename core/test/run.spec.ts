import { describe, it, expect } from "vitest";
import * as pb from "../src/proto/voide/v1/flow";
import { runFlow, TelemetryEvent, RunResult } from "../src/run";
import { StubProvider } from "../src/nodes/builtins";

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
        id: "prompt",
        type: "PromptNode",
        name: "",
        paramsJson: "{}",
        in: [{ port: "text", types: ["UserText"] }],
        out: [{ port: "prompt", types: ["PromptText"] }],
      },
      {
        id: "llm",
        type: "LLMNode",
        name: "",
        paramsJson: "{}",
        in: [{ port: "prompt", types: ["PromptText"] }],
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
        to: { node: "prompt", port: "text" },
        label: "",
        type: "UserText",
      },
      {
        id: "e2",
        from: { node: "prompt", port: "prompt" },
        to: { node: "llm", port: "prompt" },
        label: "",
        type: "PromptText",
      },
      {
        id: "e3",
        from: { node: "llm", port: "text" },
        to: { node: "out", port: "text" },
        label: "",
        type: "LLMText",
      },
    ],
  };
  return pb.Flow.encode(flow).finish();
}

describe("runFlow", () => {
  it("executes flow and emits telemetry", async () => {
    const iter = runFlow(
      makeFlow(),
      { user: "hello" },
      { stub: new StubProvider() }
    );

    const events: TelemetryEvent[] = [];
    let result: RunResult | undefined;
    while (true) {
      const { value, done } = await iter.next();
      if (done) {
        result = value;
        break;
      }
      events.push(value);
    }

    expect(result?.outputs.out).toBe("hello");
    expect(
      events.map((e) =>
        e.type === "NODE_STATE"
          ? `${e.nodeId}:${e.state}`
          : `${e.from}->${e.to}`
      ),
    ).toEqual([
      "user:queued",
      "user:running",
      "user:ok",
      "user.text->prompt.text",
      "prompt:queued",
      "prompt:running",
      "prompt:ok",
      "prompt.prompt->llm.prompt",
      "llm:queued",
      "llm:running",
      "llm:ok",
      "llm.text->out.text",
      "out:queued",
      "out:running",
      "out:ok",
    ]);
  });
});
