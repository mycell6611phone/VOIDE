import test from "node:test";
import assert from "node:assert/strict";
import { register } from "node:module";

register("ts-node/esm", import.meta.url);

const { validateFlow } = await import("../src/services/validate.ts");

const baseNode = {
  name: "Node",
  params: {},
  in: [],
  out: [],
};

test("validateFlow passes on well-formed flow", () => {
  const flow = {
    id: "flow-valid",
    version: "1",
    nodes: [
      { ...baseNode, id: "src", type: "input", out: [{ port: "out", types: ["text"] }] },
      { ...baseNode, id: "dst", type: "output", in: [{ port: "in", types: ["text"] }] },
    ],
    edges: [{ id: "e1", from: ["src", "out"], to: ["dst", "in"] }],
  };

  const result = validateFlow(flow);
  assert.equal(result.ok, true);
  assert.equal(result.errors.length, 0);
});

test("validateFlow rejects duplicate node ids", () => {
  const flow = {
    id: "flow-dup",
    version: "1",
    nodes: [
      { ...baseNode, id: "a", type: "input" },
      { ...baseNode, id: "a", type: "log" },
    ],
    edges: [],
  };

  const result = validateFlow(flow);
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((err) => err.keyword === "duplicateNodeId"));
});

test("validateFlow rejects dangling edge", () => {
  const flow = {
    id: "flow-dangling",
    version: "1",
    nodes: [{ ...baseNode, id: "src", type: "input", out: [{ port: "out", types: ["text"] }] }],
    edges: [{ id: "e1", from: ["src", "out"], to: ["missing", "in"] }],
  };

  const result = validateFlow(flow);
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((err) => err.keyword === "danglingEdge"));
});

test("validateFlow rejects schema mismatch", () => {
  const flow = {
    id: "flow-schema",
    version: "1",
    nodes: [
      {
        id: "src",
        type: "input",
        params: {},
        in: [],
        out: [],
      },
    ],
    edges: [],
  };

  const result = validateFlow(flow);
  assert.equal(result.ok, false);
  assert.ok(result.errors.length > 0);
});
