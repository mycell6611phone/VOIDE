import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import dgram from "node:dgram";
const HEADER_MAGIC = 0x4d4c5456; // 'VTLM'
const HEADER_VERSION = 1;
const RING_HEADER_SIZE = 64;
const EVENT_HEADER_SIZE = 24;
const DEFAULT_SIZE_MB = 8;
const DEFAULT_HEARTBEAT_INTERVAL_MS = 100;
const WIRE_DEDUP_NS = BigInt(10_000_000); // 10 ms
let transport;
let heartbeatTimer;
let lastWireEmit = new Map();
let currentConfig;
function fallbackEqual(a, b) {
    if (!a && !b)
        return true;
    if (!a || !b)
        return false;
    if (a.type !== b.type)
        return false;
    if (a.type === "udp" && b.type === "udp") {
        const hostA = a.host ?? "127.0.0.1";
        const hostB = b.host ?? "127.0.0.1";
        return a.port === b.port && hostA === hostB;
    }
    if (a.type === "uds" && b.type === "uds") {
        return a.path === b.path;
    }
    return false;
}
class RingTransport {
    ringPath;
    fd;
    ringSize;
    writeHead = 0n;
    readHead = 0n;
    dropped = 0n;
    dataOffset = RING_HEADER_SIZE;
    constructor(ringPath, sizeMB) {
        this.ringPath = ringPath;
        if (!Number.isFinite(sizeMB) || sizeMB <= 0) {
            throw new Error("ring size must be positive");
        }
        this.ringSize = Math.max(1024 * 64, Math.floor(sizeMB) * 1024 * 1024);
        const totalSize = this.dataOffset + this.ringSize;
        const dir = path.dirname(ringPath);
        fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
        const exists = fs.existsSync(ringPath);
        const flags = fs.constants.O_CREAT | fs.constants.O_RDWR;
        this.fd = fs.openSync(ringPath, flags, 0o600);
        if (!exists) {
            fs.ftruncateSync(this.fd, totalSize);
            this.writeHeader(this.makeHeader());
        }
        else {
            const header = Buffer.alloc(RING_HEADER_SIZE);
            const bytes = fs.readSync(this.fd, header, 0, RING_HEADER_SIZE, 0);
            if (bytes !== RING_HEADER_SIZE) {
                this.resetFile(totalSize);
            }
            else {
                const magic = header.readUInt32LE(0);
                const version = header.readUInt16LE(4);
                const storedSize = header.readUInt32LE(8);
                if (magic !== HEADER_MAGIC || version !== HEADER_VERSION || storedSize !== this.ringSize) {
                    this.resetFile(totalSize);
                }
                else {
                    this.writeHead = header.readBigUInt64LE(16);
                    this.readHead = header.readBigUInt64LE(24);
                    this.dropped = header.readBigUInt64LE(40);
                }
            }
        }
        fs.chmodSync(ringPath, 0o600);
    }
    emit(frame) {
        if (frame.length === 0)
            return;
        const frameSize = frame.length;
        if (frameSize > this.ringSize) {
            this.dropAll();
            return;
        }
        const frameBig = BigInt(frameSize);
        while (this.writeHead + frameBig - this.readHead > BigInt(this.ringSize)) {
            if (!this.dropOldest()) {
                this.readHead = this.writeHead;
                this.persistReadHead();
                break;
            }
        }
        const offset = Number(this.writeHead % BigInt(this.ringSize));
        this.writeWrap(frame, offset);
        this.writeHead += frameBig;
        this.persistWriteHead();
    }
    heartbeat(ts) {
        const buf = Buffer.alloc(8);
        buf.writeBigUInt64LE(ts);
        fs.writeSync(this.fd, buf, 0, 8, 32);
    }
    close() {
        if (this.fd !== -1) {
            fs.closeSync(this.fd);
            this.fd = -1;
        }
    }
    dropAll() {
        this.readHead = this.writeHead;
        this.dropped += 1n;
        this.persistReadHead();
        this.persistDropped();
    }
    dropOldest() {
        if (this.readHead === this.writeHead)
            return false;
        const offset = Number(this.readHead % BigInt(this.ringSize));
        const header = this.readWrap(offset, EVENT_HEADER_SIZE);
        if (header.length !== EVENT_HEADER_SIZE) {
            return false;
        }
        const magic = header.readUInt32LE(0);
        if (magic !== HEADER_MAGIC) {
            this.readHead = this.writeHead;
            this.persistReadHead();
            return false;
        }
        const payloadLen = header.readUInt32LE(16);
        const total = EVENT_HEADER_SIZE + payloadLen;
        if (total <= 0 || total > this.ringSize) {
            this.readHead = this.writeHead;
            this.persistReadHead();
            return false;
        }
        this.readHead += BigInt(total);
        this.persistReadHead();
        this.dropped += 1n;
        this.persistDropped();
        return true;
    }
    writeWrap(data, offset) {
        if (offset + data.length <= this.ringSize) {
            fs.writeSync(this.fd, data, 0, data.length, this.dataOffset + offset);
            return;
        }
        const first = this.ringSize - offset;
        fs.writeSync(this.fd, data, 0, first, this.dataOffset + offset);
        fs.writeSync(this.fd, data, first, data.length - first, this.dataOffset);
    }
    readWrap(offset, len) {
        const buf = Buffer.alloc(len);
        if (offset + len <= this.ringSize) {
            fs.readSync(this.fd, buf, 0, len, this.dataOffset + offset);
            return buf;
        }
        const first = this.ringSize - offset;
        fs.readSync(this.fd, buf, 0, first, this.dataOffset + offset);
        fs.readSync(this.fd, buf, first, len - first, this.dataOffset);
        return buf;
    }
    makeHeader() {
        const header = Buffer.alloc(RING_HEADER_SIZE);
        header.writeUInt32LE(HEADER_MAGIC, 0);
        header.writeUInt16LE(HEADER_VERSION, 4);
        header.writeUInt16LE(RING_HEADER_SIZE, 6);
        header.writeUInt32LE(this.ringSize, 8);
        header.writeUInt32LE(0, 12);
        header.writeBigUInt64LE(this.writeHead, 16);
        header.writeBigUInt64LE(this.readHead, 24);
        header.writeBigUInt64LE(0n, 32);
        header.writeBigUInt64LE(this.dropped, 40);
        return header;
    }
    writeHeader(buf) {
        fs.writeSync(this.fd, buf, 0, buf.length, 0);
    }
    persistWriteHead() {
        const buf = Buffer.alloc(8);
        buf.writeBigUInt64LE(this.writeHead);
        fs.writeSync(this.fd, buf, 0, 8, 16);
    }
    persistReadHead() {
        const buf = Buffer.alloc(8);
        buf.writeBigUInt64LE(this.readHead);
        fs.writeSync(this.fd, buf, 0, 8, 24);
    }
    persistDropped() {
        const buf = Buffer.alloc(8);
        buf.writeBigUInt64LE(this.dropped);
        fs.writeSync(this.fd, buf, 0, 8, 40);
    }
    resetFile(totalSize) {
        fs.ftruncateSync(this.fd, totalSize);
        this.writeHead = 0n;
        this.readHead = 0n;
        this.dropped = 0n;
        this.writeHeader(this.makeHeader());
    }
}
class DatagramTransport {
    socket;
    target;
    constructor(target) {
        this.target = target;
        if (target.type === "udp") {
            this.socket = dgram.createSocket("udp4");
        }
        else {
            const createUnix = dgram.createSocket;
            this.socket = createUnix({ type: "unix_dgram" });
        }
        this.socket.unref?.();
    }
    emit(frame) {
        this.send(frame);
    }
    heartbeat(ts) {
        const frame = buildFrame({
            type: 6 /* TelemetryEventType.AckClear */,
            payload: { id: "heartbeat", span: "hb", ok: true, reason: ts.toString() },
            tsNs: ts,
        });
        this.send(frame);
    }
    close() {
        this.socket.close();
    }
    send(buf) {
        if (this.target.type === "udp") {
            const host = this.target.host ?? "127.0.0.1";
            this.socket.send(buf, this.target.port, host, () => { });
        }
        else {
            this.socket.send(buf, this.target.path, () => { });
        }
    }
}
function monotonicNow() {
    return process.hrtime.bigint();
}
function defaultRingPath() {
    if (process.env.VOIDE_TLM_RING) {
        return process.env.VOIDE_TLM_RING;
    }
    const home = os.homedir();
    if (process.platform === "darwin") {
        return path.join(home, "Library", "Caches", "voide", "telemetry.ring");
    }
    if (process.platform === "win32") {
        const base = process.env.LOCALAPPDATA ?? os.tmpdir();
        return path.join(base, "VOIDE", "telemetry.ring");
    }
    return path.join(home, ".cache", "voide", "telemetry.ring");
}
function buildFrame(evt, payloadBuf) {
    const ts = evt.tsNs !== undefined ? BigInt(evt.tsNs) : monotonicNow();
    const payload = payloadBuf ?? Buffer.from(JSON.stringify(evt.payload ?? {}), "utf8");
    const frame = Buffer.alloc(EVENT_HEADER_SIZE);
    frame.writeUInt32LE(HEADER_MAGIC, 0);
    frame.writeUInt16LE(HEADER_VERSION, 4);
    frame.writeUInt16LE(evt.type, 6);
    frame.writeBigUInt64LE(ts, 8);
    frame.writeUInt32LE(payload.length, 16);
    frame.writeUInt32LE(0, 20);
    return Buffer.concat([frame, payload]);
}
function dedupeWire(evt, ts) {
    if (evt.type !== 3 /* TelemetryEventType.WireTx */)
        return false;
    const { from = "", to = "", pkt = "" } = evt.payload ?? {};
    const key = `${from}|${to}|${pkt}`;
    const prev = lastWireEmit.get(key);
    if (prev !== undefined && ts - prev < WIRE_DEDUP_NS) {
        return true;
    }
    lastWireEmit.set(key, ts);
    return false;
}
export function initTelemetry(options = {}) {
    if (transport) {
        if (currentConfig?.path === options.path &&
            currentConfig?.sizeMB === options.sizeMB &&
            fallbackEqual(currentConfig?.fallback, options.fallback)) {
            return;
        }
        shutdownTelemetry();
    }
    const pathOpt = options.path ?? defaultRingPath();
    const sizeOpt = options.sizeMB ?? DEFAULT_SIZE_MB;
    try {
        transport = new RingTransport(pathOpt, sizeOpt);
    }
    catch (err) {
        if (options.fallback) {
            transport = new DatagramTransport(options.fallback);
        }
        else {
            transport = undefined;
        }
    }
    currentConfig = { ...options, path: pathOpt, sizeMB: sizeOpt };
    lastWireEmit = new Map();
    if (transport) {
        heartbeat();
        if (heartbeatTimer) {
            clearInterval(heartbeatTimer);
        }
        const interval = options.heartbeatIntervalMs ?? DEFAULT_HEARTBEAT_INTERVAL_MS;
        heartbeatTimer = setInterval(() => {
            try {
                heartbeat();
            }
            catch {
                /* ignore heartbeat failures */
            }
        }, interval);
        heartbeatTimer.unref?.();
    }
}
export function emit(evt) {
    if (!transport)
        return;
    try {
        const ts = evt.tsNs !== undefined ? BigInt(evt.tsNs) : monotonicNow();
        if (dedupeWire(evt, ts))
            return;
        const frame = buildFrame({ ...evt, tsNs: ts });
        transport.emit(frame);
    }
    catch {
        // drop on error
    }
}
export function heartbeat() {
    if (!transport)
        return;
    try {
        transport.heartbeat(monotonicNow());
    }
    catch {
        // ignore heartbeat errors
    }
}
export function telemetryActive() {
    return Boolean(transport);
}
export function resolveTelemetryRingPath() {
    return defaultRingPath();
}
export function shutdownTelemetry() {
    if (heartbeatTimer) {
        clearInterval(heartbeatTimer);
        heartbeatTimer = undefined;
    }
    if (transport) {
        try {
            transport.close();
        }
        catch {
            // ignore
        }
        transport = undefined;
    }
    lastWireEmit.clear();
    currentConfig = undefined;
}
