import { describe, expect, it } from "vitest";
import { makeContext, NodeRegistry, NodeHandler } from "../src/sdk/node";

describe("NodeRegistry", () => {
  it("registers handlers with known types", () => {
    const reg = new NodeRegistry();
    const handler: NodeHandler = {
      kind: "ok",
      inPorts: { in: "UserText" },
      outPorts: { out: "LLMText" },
      async execute() {
        return { out: { text: "" } } as any;
      },
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
      async execute() {
        return {};
      },
    };
    expect(() => reg.register(handler)).toThrow();
  });
});

describe("makeContext", () => {
  it("creates context with logger", () => {
    const logs: any[] = [];
    const ctx = makeContext((...args) => logs.push(args));
    ctx.log?.("hello", 1);
    expect(logs[0]).toEqual(["hello", 1]);
    expect(ctx.inputs).toEqual({});
    expect(ctx.outputs).toEqual({});
  });
});

