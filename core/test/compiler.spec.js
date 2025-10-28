import { describe, expect, it } from "vitest";
import { compile } from "../src/build/compiler";
import * as pb from "../src/proto/voide/v1/flow";
function makeEnv() {
    return {
        id: "f1",
        version: "1",
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
        edges: [{ id: "e1", from: ["in", "out"], to: ["out", "in"] }],
    };
}
describe("compiler", () => {
    it("compiles a valid canvas", () => {
        const bin = compile(makeEnv());
        expect(bin).toBeInstanceOf(Uint8Array);
        const flow = pb.Flow.decode(bin);
        expect(flow.nodes.length).toBe(2);
        expect(flow.edges.length).toBe(1);
        expect(flow.edges[0]).toEqual({
            id: "e1",
            from: { node: "in", port: "out" },
            to: { node: "out", port: "in" },
            label: "",
            type: "UserText",
        });
    });
    it("detects cycles", () => {
        const env = {
            id: "c2",
            version: "1",
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
                { id: "e1", from: ["a", "out"], to: ["b", "in"] },
                { id: "e2", from: ["b", "out"], to: ["a", "in"] },
            ],
        };
        try {
            compile(env);
            expect(false).toBe(true);
        }
        catch (e) {
            const err = e;
            expect(err.code).toBe("E-CYCLE");
            expect(err.node).toBe("a");
        }
    });
    it("detects type mismatch", () => {
        const env = makeEnv();
        env.nodes[1].in[0].types = ["PromptText"];
        try {
            compile(env);
            expect(false).toBe(true);
        }
        catch (e) {
            const err = e;
            expect(err.code).toBe("E-TYPE");
            expect(err.node).toBe("in");
            expect(err.port).toBe("out");
        }
    });
    it("detects missing menus", () => {
        const env = makeEnv();
        // @ts-expect-error
        delete env.nodes[0].out;
        try {
            compile(env);
            expect(false).toBe(true);
        }
        catch (e) {
            const err = e;
            expect(err.code).toBe("E-CONFIG");
            expect(err.node).toBe("in");
        }
    });
    it("detects dangling edge", () => {
        const env = makeEnv();
        env.edges[0].to = ["missing", "in"];
        try {
            compile(env);
            expect(false).toBe(true);
        }
        catch (e) {
            const err = e;
            expect(err.code).toBe("E-DANGLING");
            expect(err.node).toBe("missing");
        }
    });
    it("detects unreachable output", () => {
        const env = {
            id: "c3",
            version: "1",
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
            edges: [{ id: "e1", from: ["start", "out"], to: ["mid", "in"] }],
        };
        try {
            compile(env);
            expect(false).toBe(true);
        }
        catch (e) {
            const err = e;
            expect(err.code).toBe("E-UNREACHABLE-OUTPUT");
            expect(err.node).toBe("mid");
            expect(err.port).toBe("out");
        }
    });
});
