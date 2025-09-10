import { describe, expect, it } from "vitest";
import { makeContext, NodeRegistry, NodeHandler } from "../src/sdk/node";
import { ExecuteRequest, ExecuteResponse, NodeEvent } from "../src/proto";

function dummyExecute(req: ExecuteRequest, ctx: any): Promise<ExecuteResponse> {
  ctx.emit({ nodeId: "n1", event: "start" } as NodeEvent);
  return Promise.resolve({ events: ctx.events });
}

describe("NodeRegistry", () => {
  it("registers handlers with known types", () => {
    const reg = new NodeRegistry();
    const handler: NodeHandler = {
      kind: "ok",
      inPorts: { in: "UserText" },
      outPorts: { out: "LLMText" },
      execute: dummyExecute,
    };
    expect(() => reg.register(handler)).not.toThrow();
    expect(reg.get("ok")).toBe(handler);
  });

  it("throws for unknown type refs", () => {
    const reg = new NodeRegistry();
    const handler: NodeHandler = {
      kind: "bad",
      inPorts: { in: "Unknown" },
      outPorts: {},
      execute: dummyExecute,
    };
    expect(() => reg.register(handler)).toThrow();
  });
});

describe("makeContext", () => {
  it("collects emitted events", () => {
    const logs: any[] = [];
    const logger = { debug: (e: any) => logs.push(e) };
    const ctx = makeContext(logger);
    ctx.emit({ nodeId: "n2", event: "done" } as NodeEvent);
    expect(ctx.events).toEqual([{ nodeId: "n2", event: "done" }]);
    expect(logs.length).toBe(1);
  });
});

