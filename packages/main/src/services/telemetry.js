import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import dgram from "node:dgram";
import { encodeTelemetryFrame, EVENT_HEADER_SIZE, TelemetryEventType, } from "@voide/shared";
const HEADER_SIZE = 64;
const RING_MAGIC = "VTLR";
const HDR_VERSION = 4;
const HDR_CAPACITY = 8;
const HDR_WRITE_IDX = 16;
const HDR_READ_IDX = 24;
const HDR_HEARTBEAT = 32;
const HDR_DROPPED = 40;
const DEFAULT_RING_SIZE_MB = 8;
const DEFAULT_HEARTBEAT_MS = 100;
const UDS_FALLBACK = "/tmp/voide.tlm.sock";
const UDP_FALLBACK_PORT = 43817;
function createUnixDgramSocket() {
    const factory = dgram;
    return factory.createSocket("unix_dgram");
}
class RingTransport {
    ringPath;
    kind = "ring";
    fd;
    capacity;
    writeIdx = 0;
    readIdx = 0;
    dropped = 0;
    heartbeatBuffer = Buffer.allocUnsafe(8);
    idxBuffer = Buffer.allocUnsafe(8);
    dropBuffer = Buffer.allocUnsafe(4);
    constructor(ringPath, sizeMB) {
        this.ringPath = ringPath;
        if (sizeMB <= 0) {
            throw new Error("Ring size must be positive");
        }
        this.capacity = Math.max(1, Math.trunc(sizeMB * 1024 * 1024) - HEADER_SIZE);
        if (this.capacity <= EVENT_HEADER_SIZE * 2) {
            throw new Error("Ring capacity too small for telemetry frames");
        }
        const dir = path.dirname(ringPath);
        fs.mkdirSync(dir, { recursive: true });
        this.fd = fs.openSync(ringPath, fs.constants.O_RDWR | fs.constants.O_CREAT);
        const desiredSize = HEADER_SIZE + this.capacity;
        const stat = fs.fstatSync(this.fd);
        if (stat.size !== desiredSize) {
            fs.ftruncateSync(this.fd, desiredSize);
            this.initializeHeader();
        }
        else {
            this.loadHeader();
        }
    }
    initializeHeader() {
        const header = Buffer.alloc(HEADER_SIZE, 0);
        header.write(RING_MAGIC, 0, "ascii");
        header.writeUInt16LE(1, HDR_VERSION);
        header.writeUInt16LE(0, HDR_VERSION + 2);
        header.writeUInt32LE(this.capacity, HDR_CAPACITY);
        fs.writeSync(this.fd, header, 0, header.length, 0);
        this.writeIdx = 0;
        this.readIdx = 0;
        this.dropped = 0;
    }
    loadHeader() {
        const header = Buffer.alloc(HEADER_SIZE);
        fs.readSync(this.fd, header, 0, HEADER_SIZE, 0);
        const magic = header.toString("ascii", 0, 4);
        if (magic !== RING_MAGIC) {
            this.initializeHeader();
            return;
        }
        const capacity = header.readUInt32LE(HDR_CAPACITY);
        if (capacity > 0) {
            this.capacity = capacity;
        }
        this.writeIdx = Number(header.readBigUInt64LE(HDR_WRITE_IDX));
        this.readIdx = Number(header.readBigUInt64LE(HDR_READ_IDX));
        this.dropped = header.readUInt32LE(HDR_DROPPED);
    }
    usedSpace() {
        if (this.writeIdx >= this.readIdx) {
            return this.writeIdx - this.readIdx;
        }
        return this.capacity - (this.readIdx - this.writeIdx);
    }
    freeSpace() {
        return this.capacity - this.usedSpace() - 1;
    }
    updateReadIdx() {
        this.idxBuffer.writeBigUInt64LE(BigInt(this.readIdx));
        fs.writeSync(this.fd, this.idxBuffer, 0, 8, HDR_READ_IDX);
    }
    updateWriteIdx() {
        this.idxBuffer.writeBigUInt64LE(BigInt(this.writeIdx));
        fs.writeSync(this.fd, this.idxBuffer, 0, 8, HDR_WRITE_IDX);
    }
    bumpDropped(by) {
        this.dropped += by;
        this.dropBuffer.writeUInt32LE(this.dropped >>> 0);
        fs.writeSync(this.fd, this.dropBuffer, 0, 4, HDR_DROPPED);
    }
    readRing(offset, length) {
        const out = Buffer.alloc(length);
        let cursor = offset;
        let remaining = length;
        let destOffset = 0;
        while (remaining > 0) {
            const chunk = Math.min(remaining, this.capacity - cursor);
            const pos = HEADER_SIZE + cursor;
            const read = fs.readSync(this.fd, out, destOffset, chunk, pos);
            if (read !== chunk) {
                throw new Error("Failed to read telemetry frame from ring");
            }
            cursor = (cursor + chunk) % this.capacity;
            destOffset += chunk;
            remaining -= chunk;
        }
        return out;
    }
    writeRing(buffer, offset) {
        let cursor = offset;
        let remaining = buffer.length;
        let srcOffset = 0;
        while (remaining > 0) {
            const chunk = Math.min(remaining, this.capacity - cursor);
            const pos = HEADER_SIZE + cursor;
            const slice = buffer.subarray(srcOffset, srcOffset + chunk);
            fs.writeSync(this.fd, slice, 0, chunk, pos);
            cursor = (cursor + chunk) % this.capacity;
            srcOffset += chunk;
            remaining -= chunk;
        }
    }
    peekFrameLength(offset) {
        const headerBuf = this.readRing(offset, EVENT_HEADER_SIZE);
        const headerView = new DataView(headerBuf.buffer, headerBuf.byteOffset, headerBuf.byteLength);
        const magic = headerBuf.toString("ascii", 0, 4);
        if (magic !== "VTLM") {
            return 0;
        }
        const payloadLen = headerView.getUint32(16);
        return EVENT_HEADER_SIZE + payloadLen;
    }
    ensureCapacity(required) {
        if (required >= this.capacity) {
            this.bumpDropped(1);
            return false;
        }
        while (this.freeSpace() <= required) {
            const frameLen = this.peekFrameLength(this.readIdx);
            if (frameLen <= 0 || frameLen > this.capacity) {
                this.readIdx = 0;
            }
            else {
                this.readIdx = (this.readIdx + frameLen) % this.capacity;
            }
            this.updateReadIdx();
            this.bumpDropped(1);
        }
        return true;
    }
    emit(frame) {
        const buffer = Buffer.from(frame.buffer, frame.byteOffset, frame.byteLength);
        if (!this.ensureCapacity(buffer.length)) {
            return false;
        }
        this.writeRing(buffer, this.writeIdx);
        this.writeIdx = (this.writeIdx + buffer.length) % this.capacity;
        this.updateWriteIdx();
        return true;
    }
    heartbeat() {
        const nowNs = process.hrtime.bigint();
        this.heartbeatBuffer.writeBigUInt64LE(nowNs);
        fs.writeSync(this.fd, this.heartbeatBuffer, 0, 8, HDR_HEARTBEAT);
    }
    close() {
        fs.closeSync(this.fd);
    }
}
class SocketTransport {
    kind;
    socket;
    udsPath;
    udpPort;
    constructor() {
        if (process.platform === "win32") {
            this.kind = "udp";
            this.socket = dgram.createSocket("udp4");
            this.udpPort = UDP_FALLBACK_PORT;
            this.socket.unref();
        }
        else {
            this.kind = "uds";
            this.socket = createUnixDgramSocket();
            this.udsPath = UDS_FALLBACK;
            this.socket.unref();
        }
        this.socket.on("error", (error) => {
            console.warn("Telemetry socket error:", error);
        });
    }
    emit(frame) {
        const buffer = Buffer.from(frame.buffer, frame.byteOffset, frame.byteLength);
        try {
            if (this.kind === "udp") {
                this.socket.send(buffer, 0, buffer.length, this.udpPort, "127.0.0.1");
            }
            else {
                this.socket.send(buffer, 0, buffer.length, this.udsPath);
            }
            return true;
        }
        catch (error) {
            console.warn("Failed to emit telemetry frame via socket:", error);
            return false;
        }
    }
    heartbeat() {
        const frame = encodeTelemetryFrame({ type: TelemetryEventType.Heartbeat });
        this.emit(frame);
    }
    close() {
        try {
            this.socket.close();
        }
        catch (error) {
            console.warn("Failed to close telemetry socket:", error);
        }
    }
}
function resolveDefaultRingPath() {
    const home = os.homedir();
    if (process.platform === "darwin") {
        return path.join(home, "Library", "Caches", "voide", "telemetry.ring");
    }
    if (process.platform === "win32") {
        const base = process.env.LOCALAPPDATA || path.join(home, "AppData", "Local");
        return path.join(base, "Voide", "telemetry.ring");
    }
    return path.join(home, ".cache", "voide", "telemetry.ring");
}
let transport = null;
let heartbeatTimer = null;
export function initTelemetry(options = {}) {
    if (transport) {
        return;
    }
    const ringPath = options.path ?? resolveDefaultRingPath();
    const sizeMB = options.sizeMB ?? DEFAULT_RING_SIZE_MB;
    try {
        transport = new RingTransport(ringPath, sizeMB);
    }
    catch (error) {
        console.warn("Failed to initialize telemetry ring, falling back to socket:", error);
        transport = new SocketTransport();
    }
    const interval = options.heartbeatIntervalMs ?? DEFAULT_HEARTBEAT_MS;
    heartbeatTimer = setInterval(() => {
        try {
            transport?.heartbeat();
        }
        catch (error) {
            console.warn("Telemetry heartbeat failed:", error);
        }
    }, interval);
    heartbeatTimer.unref?.();
}
export function emitSchedulerTelemetry(event) {
    if (!transport) {
        return false;
    }
    try {
        const frame = encodeTelemetryFrame(event);
        return transport.emit(frame);
    }
    catch (error) {
        console.warn("Failed to encode telemetry frame:", error);
        return false;
    }
}
export function heartbeat() {
    transport?.heartbeat();
}
export function telemetryTransportKind() {
    return transport?.kind ?? "none";
}
export function shutdownTelemetry() {
    if (heartbeatTimer) {
        clearInterval(heartbeatTimer);
        heartbeatTimer = null;
    }
    try {
        transport?.close();
    }
    catch (error) {
        console.warn("Failed to close telemetry transport:", error);
    }
    finally {
        transport = null;
    }
}
