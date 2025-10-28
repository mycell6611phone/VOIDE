import { describe, it, expect } from "vitest";
import { runLLM, MockCPUProvider, } from "../src/modules/llm.js";
import { applyPrompt } from "../src/modules/prompt.js";
import { MemoryDB } from "../src/modules/memory.js";
import { handleToolCalls, webSearchTool, } from "../src/modules/toolcall.js";
describe("LLM module", () => {
    it("inserts defaults and preserves unknown fields", async () => {
        const prov = new MockCPUProvider(true);
        const res = await runLLM(prov, { user: "hi", extra: 5 });
        expect(res.system).toBe("");
        expect(res.context).toEqual([]);
        expect(res.params).toEqual({});
        expect(res.extra).toBe(5);
    });
    it("validates schema", async () => {
        const prov = new MockCPUProvider();
        await expect(runLLM(prov, { system: 1 })).rejects.toThrow();
    });
    it("folds system into user when backend lacks support", async () => {
        const seen = [];
        const prov = {
            supportsSystem: false,
            async generate(msgs) {
                seen.push(...msgs);
                return "ok";
            },
        };
        await runLLM(prov, { system: "SYS", user: "hi" });
        expect(seen).toEqual([{ role: "user", content: "SYS\nhi" }]);
    });
});
describe("Prompt module", () => {
    it("injects text", () => {
        let obj = {};
        obj = applyPrompt(obj, { text: "S", to: "system" });
        expect(obj.system).toBe("S");
        obj = applyPrompt(obj, { text: "U", to: "user" });
        expect(obj.user).toBe("U");
    });
});
describe("Memory module", () => {
    it("stores and retrieves", () => {
        const mem = new MemoryDB();
        mem.append("1", "hello world");
        mem.append("2", "world peace");
        expect(mem.retrieve("hello")).toEqual(["hello world"]);
        mem.replace("1", "hola mundo");
        expect(mem.retrieve("hola")).toEqual(["hola mundo"]);
    });
});
describe("ToolCall module", () => {
    it("executes tools", async () => {
        const out = await handleToolCalls("Tool:search {\"query\":\"cats\"}", {
            search: webSearchTool,
        });
        expect(out).toEqual({ result: "results for cats", tool: "search" });
    });
});
describe("End-to-end", () => {
    it("runs prompt->llm->tool->memory", async () => {
        let obj = {};
        obj = applyPrompt(obj, { text: "Tool:search {\"query\":\"cats\"}", to: "user" });
        const llm = new MockCPUProvider();
        const res = await runLLM(llm, obj);
        const tool = await handleToolCalls(res.output, { search: webSearchTool });
        const mem = new MemoryDB();
        mem.append("1", tool.result);
        expect(mem.retrieve("cats")).toEqual(["results for cats"]);
    });
});
