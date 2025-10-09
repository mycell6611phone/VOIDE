import test from "node:test";
import assert from "node:assert/strict";
import { register } from "node:module";

register(new URL("./ts-esm-loader.mjs", import.meta.url).href, import.meta.url);

const { validateFlow } = await import("../src/services/validate.ts");
const { formatFlowValidationErrors } = await import("@voide/shared/flowValidation");

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

test("validateFlow rejects duplicate edge ids", () => {
  const flow = {
    id: "flow-dup-edges",
    version: "1",
    nodes: [
      {
        ...baseNode,
        id: "src",
        type: "input",
        out: [{ port: "out", types: ["text"] }],
      },
      {
        ...baseNode,
        id: "dst",
        type: "output",
        in: [{ port: "in", types: ["text"] }],
      },
    ],
    edges: [
      { id: "edge-1", from: ["src", "out"], to: ["dst", "in"] },
      { id: "edge-1", from: ["src", "out"], to: ["dst", "in"] },
    ],
  };

  const result = validateFlow(flow);
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((err) => err.keyword === "duplicateEdgeId"));
});

test("validateFlow rejects missing ports", () => {
  const flow = {
    id: "flow-missing-port",
    version: "1",
    nodes: [
      {
        ...baseNode,
        id: "src",
        type: "input",
        out: [],
      },
      {
        ...baseNode,
        id: "dst",
        type: "output",
        in: [{ port: "in", types: ["text"] }],
      },
    ],
    edges: [{ id: "edge-1", from: ["src", "out"], to: ["dst", "in"] }],
  };

  const result = validateFlow(flow);
  assert.equal(result.ok, false);
  const messages = formatFlowValidationErrors(result.errors);
  assert.ok(messages.some((msg) => msg.includes("missing output port")));
});

test("validateFlow rejects type mismatches", () => {
  const flow = {
    id: "flow-type-mismatch",
    version: "1",
    nodes: [
      {
        ...baseNode,
        id: "src",
        type: "input",
        out: [{ port: "out", types: ["text"] }],
      },
      {
        ...baseNode,
        id: "dst",
        type: "output",
        in: [{ port: "in", types: ["json"] }],
      },
    ],
    edges: [{ id: "edge-1", from: ["src", "out"], to: ["dst", "in"] }],
  };

  const result = validateFlow(flow);
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((err) => err.keyword === "typeMismatch"));
});
