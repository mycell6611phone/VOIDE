import { describe, it, expect } from "vitest";
import * as pb from "../src/proto/voide/v1/flow";
import { runFlow, TelemetryEvent, RunResult } from "../src/run";
import { StubProvider } from "../src/nodes/builtins";

function makeFlow(): Uint8Array {
  const flow: pb.Flow = {
    nodes: [
      { id: "user", type: "InputNode" },
      { id: "prompt", type: "PromptNode" },
      { id: "llm", type: "LLMNode" },
      { id: "out", type: "OutputNode" },
    ],
    edges: [
      { from: "user.text", to: "prompt.text", type: "UserText" },
      { from: "prompt.prompt", to: "llm.prompt", type: "PromptText" },
      { from: "llm.text", to: "out.text", type: "LLMText" },
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
    expect(events.map((e) => e.type)).toEqual([
      "NODE_START",
      "NODE_END",
      "EDGE_EMIT",
      "NODE_START",
      "NODE_END",
      "EDGE_EMIT",
      "NODE_START",
      "NODE_END",
      "EDGE_EMIT",
      "NODE_START",
      "NODE_END",
    ]);
  });
});

