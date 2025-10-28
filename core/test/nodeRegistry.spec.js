import { describe, it, expect, beforeEach, vi } from "vitest";
async function importRegistry() {
    return await import("../src/modules/nodeRegistry.js");
}
const baseDef = {
    type: "TestNode",
    label: "Test Node",
    inputs: [],
    outputs: [],
    async execute() {
        const result = [];
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
        const second = {
            ...baseDef,
            type: "SecondNode",
            label: "Second",
        };
        registerNodeType(baseDef);
        registerNodeType(second);
        expect(getAllNodeTypes()).toEqual([baseDef, second]);
    });
    it("warns and overwrites on duplicate registration", async () => {
        const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => { });
        const { registerNodeType, getNodeType } = await importRegistry();
        const duplicate = {
            ...baseDef,
            label: "Duplicate",
        };
        registerNodeType(baseDef);
        registerNodeType(duplicate);
        expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining("TestNode"));
        expect(getNodeType("TestNode")).toBe(duplicate);
        warnSpy.mockRestore();
    });
});
