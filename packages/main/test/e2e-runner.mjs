import fs from "fs/promises";
import { parseFlow } from "../../../core/dist/flow/schema.js";
import { compile } from "../../../core/dist/build/compiler.js";
import { runFlow } from "../../../core/dist/run/index.js";
import { StubProvider } from "../../../core/dist/nodes/builtins.js";

const flowPath = process.argv[2];

const run = async () => {
  const raw = await fs.readFile(flowPath, "utf8");
  const flow = parseFlow(raw);
  const bin = compile(flow);
  const providers = { stub: new StubProvider() };
  const iter = runFlow(new Uint8Array(bin), {}, providers);
  const events = [];
  while (true) {
    const { value, done } = await iter.next();
    if (done) {
      console.log(JSON.stringify({ events, result: value }));
      break;
    }
    events.push(value);
  }
};

run().catch((err) => {
  console.error(err);
  process.exit(1);
});

