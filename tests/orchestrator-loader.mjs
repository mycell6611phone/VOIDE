import path from "node:path";

const ORCH_DIST_SEGMENT = `${path.sep}packages${path.sep}main${path.sep}dist${path.sep}orchestrator${path.sep}`;
const SPECIFIERS = new Map([
  ["piscina", "voide://mock/piscina"],
  ["../services/models.js", "voide://mock/models"],
  ["../services/db.js", "voide://mock/db"],
  ["../services/telemetry.js", "voide://mock/telemetry"],
  ["../services/secrets.js", "voide://mock/secrets"],
  ["../ipc/telemetry.js", "voide://mock/ipcTelemetry"],
  ["@voide/shared", "voide://mock/shared"],
]);

export function resolve(specifier, context, defaultResolve) {
  if (context.parentURL?.includes(ORCH_DIST_SEGMENT) && SPECIFIERS.has(specifier)) {
    return { url: SPECIFIERS.get(specifier), shortCircuit: true };
  }
  return defaultResolve(specifier, context, defaultResolve);
}

export async function load(url, context, defaultLoad) {
  switch (url) {
    case "voide://mock/piscina":
      return {
        format: "module",
        source: `export default class PiscinaMock {\n  constructor(options) { this.options = options; }\n  async run(payload) {\n    const state = globalThis.__voideOrchestratorMock;\n    state.runs.push({ options: this.options, payload });\n    return state.poolResult ?? { text: \"ok\", tokens: 1, latencyMs: 1 };\n  }\n  async destroy() {}\n}`,
        shortCircuit: true,
      };
    case "voide://mock/models":
      return {
        format: "module",
        source: `export async function getModelRegistry() {\n  const state = globalThis.__voideOrchestratorMock;\n  return state.registry;\n}`,
        shortCircuit: true,
      };
    case "voide://mock/db":
      return {
        format: "module",
        source: `export async function recordRunLog() {}\nexport async function createRun() {}\nexport async function updateRunStatus() {}\nexport async function savePayload() {}\nexport async function getPayloadsForRun() { return []; }\nexport async function insertLogEntry() {}\nexport async function readMemory() { return null; }\nexport async function writeMemory() {}\nexport async function appendMemory(namespace, key, value) { return value; }`,
        shortCircuit: true,
      };
    case "voide://mock/telemetry":
      return {
        format: "module",
        source: `export function emitSchedulerTelemetry() {}\nexport async function shutdownTelemetry() {}`,
        shortCircuit: true,
      };
    case "voide://mock/ipcTelemetry":
      return {
        format: "module",
        source: `export function emitTelemetry() {}
export function emitNodeState() {}
export function emitEdgeTransfer() {}
export function emitNodeError() {}
export function emitRunPayloads() {}`,
        shortCircuit: true,
      };
    case "voide://mock/secrets":
      return {
        format: "module",
        source: `const secrets = {
  async set() { return { ok: true, backend: "mock" }; },
  async get() { return { value: null }; },
};
export function getSecretsService() { return secrets; }`,
        shortCircuit: true,
      };
    case "voide://mock/shared":
      return {
        format: "module",
        source: `export const TelemetryEventType = { NodeStart: "NodeStart", NodeEnd: "NodeEnd", AckClear: "AckClear", Stalled: "Stalled" };\nexport const EVENT_HEADER_SIZE = 0;\nexport function encodeTelemetryFrame() { return Buffer.alloc(0); }`,
        shortCircuit: true,
      };
    default:
      return defaultLoad(url, context, defaultLoad);
  }
}
