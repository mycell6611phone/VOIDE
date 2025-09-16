import { describe, it, expect } from "vitest";
import {
  Flow,
  flowValidate,
  flowRun,
  modelEnsure,
  telemetryEvent,
  telemetryPayload,
  appGetVersion,
} from "../src/channels.js"; // Testing against the source keeps the suite coupled to the actual TypeScript entry point.
import type { Flow as FlowData } from "../src/channels.js"; // Type import mirrors the runtime entry to ensure compile-time coverage.

const sampleFlow: FlowData = {
  id: "f1",
  version: "1.0.0",
  nodes: [],
  edges: [],
};

describe("flow schemas", () => {
  it("valid flow parses", () => {
    expect(flowValidate.request.parse(sampleFlow)).toEqual(sampleFlow);
  });

  it("applies defaults when optional collections are omitted", () => {
    const parsed = Flow.parse({ id: "f-default" });
    // We assert on defaults to catch regressions if the schema stops providing sensible fallbacks.
    expect(parsed.nodes).toEqual([]);
    expect(parsed.edges).toEqual([]);
  });

  it("invalid flow fails", () => {
    // @ts-expect-error testing invalid shape
    expect(() => flowValidate.request.parse({})).toThrow();
  });

  it("run response parses", () => {
    const r = { runId: "123" };
    expect(flowRun.response.parse(r)).toEqual(r);
  });

  it("validate response enforces error arrays", () => {
    const response = { ok: false, errors: ["missing node"] };
    expect(flowValidate.response.parse(response)).toEqual(response);

    expect(() =>
      flowValidate.response.parse({ ok: false, errors: "missing" }),
    ).toThrow();
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

  it("requires the ok flag in the response", () => {
    const response = { ok: true };
    expect(modelEnsure.response.parse(response)).toEqual(response);
    // The schema strips extras so callers never see implementation-specific data.
    expect(modelEnsure.response.parse({ ok: true, extra: true })).toEqual(response);
  });
});

describe("telemetry events", () => {
  it("parses node_state event", () => {
    const ev = {
      type: "node_state" as const,
      runId: "r",
      nodeId: "n",
      state: "running",
      at: 0,
    };
    expect(telemetryEvent.payload.parse(ev)).toEqual(ev);
  });

  it("rejects unknown telemetry variants", () => {
    const invalidPayload = {
      type: "bogus",
      runId: "r",
    };
    // Using the raw payload schema lets us fail fast when new event types are added without validation.
    expect(() => telemetryPayload.parse(invalidPayload)).toThrow();
  });
});

describe("app version", () => {
  it("response is string", () => {
    expect(appGetVersion.response.parse("1.0.0")).toBe("1.0.0");
  });

  it("requires an undefined request payload", () => {
    expect(appGetVersion.request.parse(undefined)).toBeUndefined();
    // @ts-expect-error the contract requires no payload
    expect(() => appGetVersion.request.parse("1.0.0")).toThrow();
  });
});

