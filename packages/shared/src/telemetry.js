// packages/shared/src/telemetry.ts
// Shared telemetry frame definitions and helpers used by both the scheduler
// and the external telemetry daemon. This module intentionally avoids Node
// specific globals so it can be consumed from either Electron or plain
// browser runtimes if needed.
const MAGIC = 0x56544c4d; // 'VTLM'
export const EVENT_HEADER_SIZE = 24;
export const TELEMETRY_VERSION = 1;
export var TelemetryEventType;
(function (TelemetryEventType) {
    TelemetryEventType[TelemetryEventType["Heartbeat"] = 0] = "Heartbeat";
    TelemetryEventType[TelemetryEventType["NodeStart"] = 1] = "NodeStart";
    TelemetryEventType[TelemetryEventType["NodeEnd"] = 2] = "NodeEnd";
    TelemetryEventType[TelemetryEventType["WireTransfer"] = 3] = "WireTransfer";
    TelemetryEventType[TelemetryEventType["SchemaWarn"] = 4] = "SchemaWarn";
    TelemetryEventType[TelemetryEventType["Stalled"] = 5] = "Stalled";
    TelemetryEventType[TelemetryEventType["AckClear"] = 6] = "AckClear";
})(TelemetryEventType || (TelemetryEventType = {}));
function encodeHeader(type, timestampNs, payloadLength, crc32 = 0) {
    const buffer = new ArrayBuffer(EVENT_HEADER_SIZE);
    const view = new DataView(buffer);
    view.setUint32(0, MAGIC); // big endian by default (network order)
    view.setUint16(4, TELEMETRY_VERSION);
    view.setUint16(6, type);
    view.setBigUint64(8, timestampNs);
    view.setUint32(16, payloadLength);
    view.setUint32(20, crc32 >>> 0);
    return new Uint8Array(buffer);
}
export function encodeTelemetryFrame(event) {
    const payload = event.payload ?? {};
    const payloadJson = JSON.stringify(payload);
    const encoder = new TextEncoder();
    const payloadBytes = encoder.encode(payloadJson);
    const timestampNs = event.timestampNs ?? BigInt(Date.now()) * 1000000n;
    const header = encodeHeader(event.type, timestampNs, payloadBytes.length);
    const out = new Uint8Array(header.length + payloadBytes.length);
    out.set(header, 0);
    out.set(payloadBytes, header.length);
    return out;
}
export function decodeTelemetryFrame(data) {
    if (data.length < EVENT_HEADER_SIZE) {
        throw new Error("Telemetry frame too small");
    }
    const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
    const magic = view.getUint32(0);
    if (magic !== MAGIC) {
        throw new Error("Invalid telemetry magic");
    }
    const version = view.getUint16(4);
    if (version !== TELEMETRY_VERSION) {
        throw new Error(`Unsupported telemetry version ${version}`);
    }
    const type = view.getUint16(6);
    const timestampNs = view.getBigUint64(8);
    const len = view.getUint32(16);
    if (EVENT_HEADER_SIZE + len > data.length) {
        throw new Error("Telemetry payload length exceeds frame bounds");
    }
    const payloadSlice = data.slice(EVENT_HEADER_SIZE, EVENT_HEADER_SIZE + len);
    const decoder = new TextDecoder();
    const payloadJson = decoder.decode(payloadSlice);
    let payload = {};
    if (payloadJson.length) {
        try {
            payload = JSON.parse(payloadJson);
        }
        catch (error) {
            throw new Error(`Failed to parse telemetry payload: ${String(error)}`);
        }
    }
    return { type, timestampNs, payload };
}
