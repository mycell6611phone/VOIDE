import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import fsp from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { runFlow, initTelemetry, shutdownTelemetry } from "../src/run";
import { StubProvider } from "../src/nodes/builtins";
import * as pb from "../src/proto/voide/v1/flow";
const HEADER_MAGIC = 0x4d4c5456;
const RING_HEADER_SIZE = 64;
const EVENT_HEADER_SIZE = 24;
function makeFlow() {
    const flow = {
        id: "f1",
        version: "1",
        nodes: [
            {
                id: "user",
                type: "InputNode",
                name: "",
                paramsJson: "{}",
                in: [],
                out: [{ port: "text", types: ["UserText"] }],
            },
            {
                id: "prompt",
                type: "PromptNode",
                name: "",
                paramsJson: "{}",
                in: [{ port: "text", types: ["UserText"] }],
                out: [{ port: "prompt", types: ["PromptText"] }],
            },
            {
                id: "llm",
                type: "LLMNode",
                name: "",
                paramsJson: "{}",
                in: [{ port: "prompt", types: ["PromptText"] }],
                out: [{ port: "text", types: ["LLMText"] }],
            },
            {
                id: "out",
                type: "OutputNode",
                name: "",
                paramsJson: "{}",
                in: [{ port: "text", types: ["LLMText"] }],
                out: [],
            },
        ],
        edges: [
            {
                id: "e1",
                from: { node: "user", port: "text" },
                to: { node: "prompt", port: "text" },
                label: "",
                type: "UserText",
            },
            {
                id: "e2",
                from: { node: "prompt", port: "prompt" },
                to: { node: "llm", port: "prompt" },
                label: "",
                type: "PromptText",
            },
            {
                id: "e3",
                from: { node: "llm", port: "text" },
                to: { node: "out", port: "text" },
                label: "",
                type: "LLMText",
            },
        ],
    };
    return pb.Flow.encode(flow).finish();
}
function readFrames(ringPath) {
    const fd = fs.openSync(ringPath, fs.constants.O_RDONLY);
    try {
        const header = Buffer.alloc(RING_HEADER_SIZE);
        fs.readSync(fd, header, 0, RING_HEADER_SIZE, 0);
        const magic = header.readUInt32LE(0);
        expect(magic).toBe(HEADER_MAGIC);
        const ringSize = header.readUInt32LE(8);
        const writeHead = header.readBigUInt64LE(16);
        const readHead = header.readBigUInt64LE(24);
        const heartbeat = header.readBigUInt64LE(32);
        const frames = [];
        const dataOffset = RING_HEADER_SIZE;
        let cursor = readHead;
        while (cursor < writeHead) {
            const offset = Number(cursor % BigInt(ringSize));
            const headerBuf = Buffer.alloc(EVENT_HEADER_SIZE);
            if (offset + EVENT_HEADER_SIZE <= ringSize) {
                fs.readSync(fd, headerBuf, 0, EVENT_HEADER_SIZE, dataOffset + offset);
            }
            else {
                const first = ringSize - offset;
                fs.readSync(fd, headerBuf, 0, first, dataOffset + offset);
                fs.readSync(fd, headerBuf, first, EVENT_HEADER_SIZE - first, dataOffset);
            }
            const evtMagic = headerBuf.readUInt32LE(0);
            if (evtMagic !== HEADER_MAGIC) {
                break;
            }
            const evtType = headerBuf.readUInt16LE(6);
            const payloadLen = headerBuf.readUInt32LE(16);
            const total = EVENT_HEADER_SIZE + payloadLen;
            const payload = Buffer.alloc(payloadLen);
            const payloadStart = (offset + EVENT_HEADER_SIZE) % ringSize;
            if (payloadStart + payloadLen <= ringSize) {
                fs.readSync(fd, payload, 0, payloadLen, dataOffset + payloadStart);
            }
            else {
                const firstPayload = ringSize - payloadStart;
                fs.readSync(fd, payload, 0, firstPayload, dataOffset + payloadStart);
                fs.readSync(fd, payload, firstPayload, payloadLen - firstPayload, dataOffset);
            }
            const body = payloadLen ? JSON.parse(payload.toString("utf8")) : {};
            frames.push({ type: evtType, payload: body });
            cursor += BigInt(total);
        }
        return { frames, heartbeat };
    }
    finally {
        fs.closeSync(fd);
    }
}
let tmpDir;
let ringPath;
beforeEach(async () => {
    tmpDir = await fsp.mkdtemp(path.join(os.tmpdir(), "voide-tlm-"));
    ringPath = path.join(tmpDir, "telemetry.ring");
});
afterEach(async () => {
    shutdownTelemetry();
    await fsp.rm(tmpDir, { recursive: true, force: true });
});
describe("telemetry ring", () => {
    it("captures scheduler events in shared ring", async () => {
        initTelemetry({ path: ringPath, sizeMB: 1, heartbeatIntervalMs: 20 });
        const iter = runFlow(makeFlow(), { user: "hi" }, { stub: new StubProvider() });
        while (true) {
            const { value, done } = await iter.next();
            if (done)
                break;
        }
        shutdownTelemetry();
        const { frames, heartbeat } = readFrames(ringPath);
        expect(heartbeat > 0n).toBe(true);
        const starts = frames
            .filter((f) => f.type === 1 /* TelemetryEventType.NodeStart */)
            .map((f) => f.payload.id);
        expect(starts).toEqual(["user", "prompt", "llm", "out"]);
        const ends = frames
            .filter((f) => f.type === 2 /* TelemetryEventType.NodeEnd */)
            .map((f) => ({ id: f.payload.id, ok: f.payload.ok }));
        expect(ends).toEqual([
            { id: "user", ok: true },
            { id: "prompt", ok: true },
            { id: "llm", ok: true },
            { id: "out", ok: true },
        ]);
        const wires = frames
            .filter((f) => f.type === 3 /* TelemetryEventType.WireTx */)
            .map((f) => ({ id: f.payload.id, from: f.payload.from, to: f.payload.to }));
        expect(wires).toEqual([
            { id: "e1", from: "user", to: "prompt" },
            { id: "e2", from: "prompt", to: "llm" },
            { id: "e3", from: "llm", to: "out" },
        ]);
    });
});
