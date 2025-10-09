import { describe, it, expect } from "vitest";
import { parseFlow } from "../src/flow/schema.js";
import { compile } from "../src/build/compiler";
import * as pb from "../src/proto/voide/v1/flow";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import * as fs from "fs/promises";
import * as path from "path";
import * as os from "os";
import { type FlowDef } from "@voide/shared";
import { formatFlowValidationErrors, validateFlowDefinition } from "@voide/shared/flowValidation";

const exec = promisify(execFile);
const CLI_TIMEOUT = 20_000;

const sample = {
  id: "f1",
  version: "1",
  nodes: [
    {
      id: "in",
      type: "InputNode",
      in: [],
      out: [{ port: "out", types: ["UserText"] }],
    },
    {
      id: "out",
      type: "OutputNode",
      in: [{ port: "in", types: ["UserText"] }],
      out: [],
    },
  ],
  edges: [{ id: "e1", from: ["in", "out"], to: ["out", "in"] }],
  extra: { foo: 1 },
};

const coreRoot = path.resolve(__dirname, "..");
const cliEntry = path.join(coreRoot, "src", "cli.ts");
const nodeBin = process.execPath;
const nodeLoaderArgs = ["--loader", "ts-node/esm", cliEntry];
const execOptions = { cwd: coreRoot } as const;

describe("flow schema", () => {
  it("round-trip preserves unknown fields", () => {
    const txt = JSON.stringify(sample);
    const flow = parseFlow(txt);
    const obj = JSON.parse(JSON.stringify(flow));
    expect(obj.extra.foo).toBe(1);
    expect(obj.nodes[0].in.length).toBe(0);
  });

  it("compile deterministic", () => {
    const txt = JSON.stringify(sample);
    const flow = parseFlow(txt);
    const bin1 = compile(flow);
    const bin2 = compile(flow);
    expect(Buffer.from(bin1).toString("hex")).toBe(
      Buffer.from(bin2).toString("hex"),
    );
    const decoded = pb.Flow.decode(bin1);
    expect(decoded.nodes.length).toBe(2);
  });

  it("cli validate success and failure", async () => {
    const tmp = await fs.mkdtemp(path.join(os.tmpdir(), "flow-"));
    const good = path.join(tmp, "good.flow.json");
    await fs.writeFile(good, JSON.stringify(sample));
    await exec(nodeBin, [...nodeLoaderArgs, "validate", good], execOptions);

    const bad = path.join(tmp, "bad.flow.json");
    await fs.writeFile(bad, JSON.stringify({ nodes: [], edges: [] }));
    await expect(
      exec(nodeBin, [...nodeLoaderArgs, "validate", bad], execOptions),
    ).rejects.toHaveProperty("code", 1);
  }, CLI_TIMEOUT);

  it("cli pack produces output", async () => {
    const tmp = await fs.mkdtemp(path.join(os.tmpdir(), "flow-"));
    const src = path.join(tmp, "pack.flow.json");
    await fs.writeFile(src, JSON.stringify(sample));
    const out = path.join(tmp, "pack.flow.pb");
    await exec(
      nodeBin,
      [...nodeLoaderArgs, "pack", src, "--out", out],
      execOptions,
    );
    const buf = await fs.readFile(out);
    expect(buf.length).toBeGreaterThan(0);
  }, CLI_TIMEOUT);
});

describe("flow validation", () => {
  const baseNode = {
    name: "Node",
    params: {},
    in: [],
    out: [],
  } as const;

  it("rejects duplicate node ids", () => {
    const flow: FlowDef = {
      id: "flow-dup-nodes",
      version: "1",
      nodes: [
        { ...baseNode, id: "a", type: "input" },
        { ...baseNode, id: "a", type: "log" },
      ],
      edges: [],
    };
    const result = validateFlowDefinition(flow);
    expect(result.ok).toBe(false);
    const messages = formatFlowValidationErrors(result.errors);
    expect(messages.some((msg) => msg.includes("Duplicate node id \"a\""))).toBe(true);
  });

  it("rejects dangling edges", () => {
    const flow: FlowDef = {
      id: "flow-dangling",
      version: "1",
      nodes: [
        { ...baseNode, id: "src", type: "input", out: [{ port: "out", types: ["text"] }] },
      ],
      edges: [
        { id: "e1", from: ["src", "out"], to: ["missing", "in"] },
      ],
    };
    const result = validateFlowDefinition(flow);
    expect(result.ok).toBe(false);
    const messages = formatFlowValidationErrors(result.errors);
    expect(messages.some((msg) => msg.includes("missing target node \"missing\""))).toBe(true);
  });

  it("rejects duplicate edge ids", () => {
    const flow: FlowDef = {
      id: "flow-dup-edges",
      version: "1",
      nodes: [
        { ...baseNode, id: "src", type: "input", out: [{ port: "out", types: ["text"] }] },
        { ...baseNode, id: "dst", type: "output", in: [{ port: "in", types: ["text"] }] },
      ],
      edges: [
        { id: "edge-1", from: ["src", "out"], to: ["dst", "in"] },
        { id: "edge-1", from: ["src", "out"], to: ["dst", "in"] },
      ],
    };
    const result = validateFlowDefinition(flow);
    expect(result.ok).toBe(false);
    const messages = formatFlowValidationErrors(result.errors);
    expect(messages.some((msg) => msg.includes("Duplicate edge id \"edge-1\""))).toBe(true);
  });

  it("rejects incompatible edge types", () => {
    const flow: FlowDef = {
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
      edges: [
        { id: "e1", from: ["src", "out"], to: ["dst", "in"] },
      ],
    };
    const result = validateFlowDefinition(flow);
    expect(result.ok).toBe(false);
    const messages = formatFlowValidationErrors(result.errors);
    expect(messages.some((msg) => msg.includes("incompatible types"))).toBe(true);
  });

  it("rejects missing ports", () => {
    const flow: FlowDef = {
      id: "flow-missing-port",
      version: "1",
      nodes: [
        { ...baseNode, id: "src", type: "input", out: [] },
        { ...baseNode, id: "dst", type: "output", in: [{ port: "in", types: ["text"] }] },
      ],
      edges: [
        { id: "edge-1", from: ["src", "out"], to: ["dst", "in"] },
      ],
    };
    const result = validateFlowDefinition(flow);
    expect(result.ok).toBe(false);
    const messages = formatFlowValidationErrors(result.errors);
    expect(messages.some((msg) => msg.includes("missing output port"))).toBe(true);
  });

  it("rejects schema mismatches", () => {
    const invalid = {
      id: "flow-invalid",
      version: "1",
      nodes: [
        {
          id: "src",
          type: "input",
          in: [],
          out: [],
          params: {},
        },
      ],
      edges: [],
    } as unknown as FlowDef;
    const result = validateFlowDefinition(invalid);
    expect(result.ok).toBe(false);
    const messages = formatFlowValidationErrors(result.errors);
    expect(messages.length).toBeGreaterThan(0);
  });
});
