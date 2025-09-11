import { describe, it, expect } from "vitest";
import { parseFlow } from "../dist/flow/schema.js";
import { compile } from "../src/build/compiler";
import * as pb from "../src/proto/voide/v1/flow";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import * as fs from "fs/promises";
import * as path from "path";

const exec = promisify(execFile);

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

const cli = path.resolve(__dirname, "..", "dist", "cli.js");
const nodeBin = process.execPath;

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
    const tmp = await fs.mkdtemp("flow-");
    const good = path.join(tmp, "good.flow.json");
    await fs.writeFile(good, JSON.stringify(sample));
    await exec(nodeBin, [cli, "validate", good]);

    const bad = path.join(tmp, "bad.flow.json");
    await fs.writeFile(bad, JSON.stringify({ nodes: [], edges: [] }));
    await expect(
      exec(nodeBin, [cli, "validate", bad]),
    ).rejects.toHaveProperty("code", 1);
  });

  it("cli pack produces output", async () => {
    const tmp = await fs.mkdtemp("flow-");
    const src = path.join(tmp, "pack.flow.json");
    await fs.writeFile(src, JSON.stringify(sample));
    const out = path.join(tmp, "pack.flow.pb");
    await exec(nodeBin, [cli, "pack", src, "--out", out]);
    const buf = await fs.readFile(out);
    expect(buf.length).toBeGreaterThan(0);
  });
});
