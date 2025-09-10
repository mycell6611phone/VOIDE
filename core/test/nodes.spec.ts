import { describe, it, expect } from "vitest";
import { NodeRegistry, makeContext } from "../src/sdk/node";
import { registerBuiltins, StubProvider } from "../src/nodes/builtins";

describe("built-in nodes", () => {
  const registry = new NodeRegistry();
  registerBuiltins(registry);

  it("InputNode outputs runtime text", async () => {
    const ctx = makeContext();
    ctx.inputs["user"] = "hello";
    const handler = registry.get("InputNode");
    const out = await handler.execute({ config: { id: "user" }, inputs: {}, context: ctx });
    expect(out.text.text).toBe("hello");
  });

  it("PromptNode formats template", async () => {
    const ctx = makeContext();
    const handler = registry.get("PromptNode");
    const out = await handler.execute({ config: {}, inputs: { text: { text: "hi" } }, context: ctx });
    expect(out.prompt.text).toBe("hi");
  });

  it("LLMNode uses stub provider", async () => {
    const ctx = makeContext();
    const handler = registry.get("LLMNode");
    const providers = { stub: new StubProvider() };
    const bullet = await handler.execute({
      config: { model: "stub" },
      inputs: { prompt: { text: "make bullet list" } },
      context: ctx,
      providers,
    });
    expect(bullet.text.text).toBe("- one\n- two");
    const echo = await handler.execute({
      config: { model: "stub" },
      inputs: { prompt: { text: "hello" } },
      context: ctx,
      providers,
    });
    expect(echo.text.text).toBe("hello");
  });

  it("BranchNode routes based on condition", async () => {
    const ctx = makeContext();
    const handler = registry.get("BranchNode");
    const pass = await handler.execute({
      config: { condition: "ok" },
      inputs: { text: { text: "ok done" } },
      context: ctx,
    });
    expect(pass.pass?.text).toBe("ok done");
    const fail = await handler.execute({
      config: { condition: "no" },
      inputs: { text: { text: "ok done" } },
      context: ctx,
    });
    expect(fail.fail?.text).toBe("ok done");
  });

  it("LogNode logs and passes through", async () => {
    const logs: any[] = [];
    const ctx = makeContext((...args) => logs.push(args));
    const handler = registry.get("LogNode");
    const val = { data: new Uint8Array([1]) };
    const out = await handler.execute({
      config: { name: "test" },
      inputs: { value: val },
      context: ctx,
    });
    expect(logs.length).toBe(1);
    expect(out.value).toBe(val);
  });

  it("OutputNode stores final text", async () => {
    const ctx = makeContext();
    const handler = registry.get("OutputNode");
    await handler.execute({
      config: { name: "final" },
      inputs: { text: { text: "done" } },
      context: ctx,
    });
    expect(ctx.outputs.final).toBe("done");
  });
});
