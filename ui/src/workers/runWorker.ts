import { orchestrate } from "../../../core/src/run/orchestrator";
import { NodeRegistry } from "../../../core/src/sdk/node";
import {
  registerBuiltins,
  StubProvider,
} from "../../../core/src/nodes/builtins";

interface RunMsg {
  flowBin: Uint8Array;
}

self.onmessage = async (e: MessageEvent<RunMsg>) => {
  const registry = new NodeRegistry();
  registerBuiltins(registry);
  const providers = { stub: new StubProvider() };
  const gen = orchestrate(e.data.flowBin, {}, registry, providers);
  while (true) {
    const { value, done } = await gen.next();
    if (done) {
      self.postMessage({ type: "done", result: value });
      break;
    } else {
      self.postMessage(value);
    }
  }
};

export {};

