import { describe, it, expect } from "vitest";
import {
  Flow,
  flowValidate,
  flowRun,
  modelEnsure,
  telemetryEvent,
  appGetVersion,
} from "../src/channels.js";

const sampleFlow: Flow = {
  id: "f1",
  version: "1.0.0",
  nodes: [],
  edges: [],
};

describe("flow schemas", () => {
  it("valid flow parses", () => {
    expect(flowValidate.request.parse(sampleFlow)).toEqual(sampleFlow);
  });

  it("invalid flow fails", () => {
    // @ts-expect-error testing invalid shape
    expect(() => flowValidate.request.parse({})).toThrow();
  });

  it("run response parses", () => {
    const r = { runId: "123" };
    expect(flowRun.response.parse(r)).toEqual(r);
  });
});

describe("model ensure", () => {
  it("rejects missing model id", () => {
    // @ts-expect-error testing invalid shape
    expect(() => modelEnsure.request.parse({})).toThrow();
  });

  it("accepts model id", () => {
    expect(modelEnsure.request.parse({ modelId: "m" })).toEqual({ modelId: "m" });
  });
});

describe("telemetry events", () => {
  it("parses run log", () => {
    const log = {
      runId: "r",
      nodeId: "n",
      tokens: 1,
      latencyMs: 2,
      status: "ok" as const,
    };
    expect(telemetryEvent.payload.parse(log)).toEqual(log);
  });
});

describe("app version", () => {
  it("response is string", () => {
    expect(appGetVersion.response.parse("1.0.0")).toBe("1.0.0");
  });
});

