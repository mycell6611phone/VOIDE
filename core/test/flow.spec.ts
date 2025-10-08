import { describe, it, expect } from "vitest";
import { parseFlow } from "../src/flow/schema.js";
import { compile } from "../src/build/compiler";
import * as pb from "../src/proto/voide/v1/flow";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import * as fs from "fs/promises";
import * as path from "path";
import * as os from "os";

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
