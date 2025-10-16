import { describe, it, expect, beforeEach, vi } from "vitest";
import type { NodeTypeDef, NodeOutput } from "../src/modules/nodeRegistry.js";

async function importRegistry() {
  return await import("../src/modules/nodeRegistry.js");
}

const baseDef: NodeTypeDef = {
  type: "TestNode",
  label: "Test Node",
  inputs: [],
  outputs: [],
  async execute() {
    const result: NodeOutput[] = [];
    return result;
  },
};

describe("node registry", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("registers and retrieves node definitions", async () => {
    const { registerNodeType, getNodeType } = await importRegistry();
    registerNodeType(baseDef);
    expect(getNodeType("TestNode")).toBe(baseDef);
  });

  it("lists all registered node types", async () => {
    const { registerNodeType, getAllNodeTypes } = await importRegistry();
    const second: NodeTypeDef = {
      ...baseDef,
      type: "SecondNode",
      label: "Second",
    };
    registerNodeType(baseDef);
    registerNodeType(second);
    expect(getAllNodeTypes()).toEqual([baseDef, second]);
  });

  it("warns and overwrites on duplicate registration", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const { registerNodeType, getNodeType } = await importRegistry();
    const duplicate: NodeTypeDef = {
      ...baseDef,
      label: "Duplicate",
    };
    registerNodeType(baseDef);
    registerNodeType(duplicate);
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining("TestNode")
    );
    expect(getNodeType("TestNode")).toBe(duplicate);
    warnSpy.mockRestore();
  });
});
 
