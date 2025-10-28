import { describe, it, expect } from "vitest";
import { Flow, flowValidate, flowRun, flowBuild, modelEnsure, telemetryEvent, telemetryPayload, appGetVersion, } from "../src/channels.js"; // Testing against the source keeps the suite coupled to the actual TypeScript entry point.
const sampleFlow = {
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
    it("build request + response parse", () => {
        const payload = flowBuild.request.parse(sampleFlow);
        expect(payload).toEqual(sampleFlow);
        const success = {
            ok: true,
            hash: "hash-123",
            version: "1.0.0",
            cached: false,
            flow: sampleFlow,
        };
        expect(flowBuild.response.parse(success)).toEqual(success);
        const failure = { ok: false, error: "boom", errors: [] };
        expect(flowBuild.response.parse(failure)).toEqual(failure);
    });
    it("run request + response parse", () => {
        const payload = flowRun.request.parse({ compiledHash: "hash-123", inputs: { ui: "hi" } });
        expect(payload.compiledHash).toBe("hash-123");
        expect(payload.inputs).toEqual({ ui: "hi" });
        const withDefaultInputs = flowRun.request.parse({ compiledHash: "hash-321" });
        expect(withDefaultInputs.inputs).toEqual({});
        const response = { runId: "123" };
        expect(flowRun.response.parse(response)).toEqual(response);
    });
    it("validate response enforces error arrays", () => {
        const response = { ok: false, errors: ["missing node"] };
        expect(flowValidate.response.parse(response)).toEqual(response);
        expect(() => flowValidate.response.parse({ ok: false, errors: "missing" })).toThrow();
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
            type: "node_state",
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
