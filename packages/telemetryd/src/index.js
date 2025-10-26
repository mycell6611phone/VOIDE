#!/usr/bin/env node
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import dgram from "node:dgram";
import process from "node:process";
import { TelemetryEventType, decodeTelemetryFrame, EVENT_HEADER_SIZE, } from "@voide/shared";
const HEADER_SIZE = 64;
const RING_MAGIC = "VTLR";
const HDR_CAPACITY = 8;
const HDR_WRITE_IDX = 16;
const HDR_READ_IDX = 24;
const HDR_HEARTBEAT = 32;
const HDR_DROPPED = 40;
const UDS_FALLBACK = "/tmp/voide.tlm.sock";
const UDP_FALLBACK_PORT = 43817;
const HEARTBEAT_WARN_MS = 500;
function createUnixDgramSocket() {
    const factory = dgram;
    return factory.createSocket("unix_dgram");
}
function bindUnixSocket(socket, socketPath) {
    socket.bind(socketPath);
}
function defaultRingPath() {
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
function printHelp() {
    console.log(`voide-telemetryd usage:\n\n` +
        `  voide-telemetryd [--ring <path>] [--fps <n>] [--stall-ms <n>]\n\n` +
        `Options:\n` +
        `  --ring       Override telemetry ring path (default: ${defaultRingPath()})\n` +
        `  --fps        UI refresh rate (default: 60)\n` +
        `  --stall-ms   Wire inactivity timeout for pruning (default: 3000)\n`);
}
function parseArgs(argv) {
    const options = {
        ring: defaultRingPath(),
        fps: 60,
        stallMs: 3000,
    };
    for (let i = 0; i < argv.length; i += 1) {
        const arg = argv[i];
        if (arg === "--ring" && argv[i + 1]) {
            options.ring = argv[++i];
        }
        else if (arg === "--fps" && argv[i + 1]) {
            options.fps = Math.max(1, Number(argv[++i]));
        }
        else if (arg === "--stall-ms" && argv[i + 1]) {
            options.stallMs = Math.max(500, Number(argv[++i]));
        }
        else if (arg === "--help" || arg === "-h") {
            printHelp();
            process.exit(0);
        }
    }
    return options;
}
class RingReader {
    ringPath;
    fd;
    capacity;
    readIdx = 0;
    writeIdx = 0;
    lastDropped = 0;
    constructor(ringPath) {
        this.ringPath = ringPath;
        this.fd = fs.openSync(ringPath, fs.constants.O_RDWR);
        const header = Buffer.alloc(HEADER_SIZE);
        fs.readSync(this.fd, header, 0, HEADER_SIZE, 0);
        const magic = header.toString("ascii", 0, 4);
        if (magic !== RING_MAGIC) {
            throw new Error(`Ring header mismatch (${magic})`);
        }
        this.capacity = header.readUInt32LE(HDR_CAPACITY);
        this.writeIdx = Number(header.readBigUInt64LE(HDR_WRITE_IDX));
        this.readIdx = Number(header.readBigUInt64LE(HDR_READ_IDX));
        this.lastDropped = header.readUInt32LE(HDR_DROPPED);
    }
    poll() {
        const header = Buffer.alloc(HEADER_SIZE);
        fs.readSync(this.fd, header, 0, HEADER_SIZE, 0);
        const magic = header.toString("ascii", 0, 4);
        if (magic !== RING_MAGIC) {
            throw new Error(`Ring header mismatch (${magic})`);
        }
        this.capacity = header.readUInt32LE(HDR_CAPACITY) || this.capacity;
        this.writeIdx = Number(header.readBigUInt64LE(HDR_WRITE_IDX));
        const headerReadIdx = Number(header.readBigUInt64LE(HDR_READ_IDX));
        if (headerReadIdx !== this.readIdx) {
            this.readIdx = headerReadIdx;
        }
        const heartbeatNs = header.readBigUInt64LE(HDR_HEARTBEAT);
        const totalDropped = header.readUInt32LE(HDR_DROPPED);
        const frames = [];
        while (this.readIdx !== this.writeIdx) {
            const frame = this.readFrame();
            frames.push(frame);
        }
        const droppedDelta = totalDropped - this.lastDropped;
        this.lastDropped = totalDropped;
        return { frames, droppedDelta, totalDropped, heartbeatNs };
    }
    close() {
        fs.closeSync(this.fd);
    }
    readFrame() {
        const headerBuf = this.readRingSlice(this.readIdx, EVENT_HEADER_SIZE);
        const headerView = new DataView(headerBuf.buffer, headerBuf.byteOffset, headerBuf.byteLength);
        const magic = headerBuf.toString("ascii", 0, 4);
        if (magic !== "VTLM") {
            throw new Error("Frame header magic mismatch");
        }
        const payloadLen = headerView.getUint32(16);
        const totalLen = EVENT_HEADER_SIZE + payloadLen;
        const frameBuf = Buffer.alloc(totalLen);
        headerBuf.copy(frameBuf, 0, 0, EVENT_HEADER_SIZE);
        if (payloadLen > 0) {
            const payloadBuf = this.readRingSlice((this.readIdx + EVENT_HEADER_SIZE) % this.capacity, payloadLen);
            payloadBuf.copy(frameBuf, EVENT_HEADER_SIZE);
        }
        this.readIdx = (this.readIdx + totalLen) % this.capacity;
        this.writeReadIdx();
        return decodeTelemetryFrame(new Uint8Array(frameBuf.buffer, frameBuf.byteOffset, frameBuf.byteLength));
    }
    readRingSlice(offset, length) {
        const out = Buffer.alloc(length);
        let cursor = offset;
        let remaining = length;
        let destOffset = 0;
        while (remaining > 0) {
            const chunk = Math.min(remaining, this.capacity - cursor);
            const pos = HEADER_SIZE + cursor;
            const read = fs.readSync(this.fd, out, destOffset, chunk, pos);
            if (read !== chunk) {
                throw new Error("Failed to read telemetry ring");
            }
            cursor = (cursor + chunk) % this.capacity;
            destOffset += chunk;
            remaining -= chunk;
        }
        return out;
    }
    writeReadIdx() {
        const buf = Buffer.allocUnsafe(8);
        buf.writeBigUInt64LE(BigInt(this.readIdx));
        fs.writeSync(this.fd, buf, 0, 8, HDR_READ_IDX);
    }
}
const SEVERITY_ORDER = {
    idle: 0,
    ok: 1,
    active: 2,
    warn: 3,
    stalled: 4,
};
class SocketReceiver {
    kind;
    socket;
    queue;
    lastHeartbeat = 0n;
    constructor(queue) {
        this.queue = queue;
        if (process.platform === "win32") {
            this.kind = "udp";
            this.socket = dgram.createSocket("udp4");
            this.socket.bind(UDP_FALLBACK_PORT, "127.0.0.1");
        }
        else {
            this.kind = "uds";
            try {
                if (fs.existsSync(UDS_FALLBACK)) {
                    fs.unlinkSync(UDS_FALLBACK);
                }
            }
            catch {
                // ignore unlink issues
            }
            this.socket = createUnixDgramSocket();
            bindUnixSocket(this.socket, UDS_FALLBACK);
        }
        this.socket.on("message", (msg) => {
            try {
                const frame = decodeTelemetryFrame(new Uint8Array(msg.buffer, msg.byteOffset, msg.byteLength));
                if (frame.type === TelemetryEventType.Heartbeat) {
                    this.lastHeartbeat = process.hrtime.bigint();
                }
                else {
                    this.queue.push(frame);
                }
            }
            catch (error) {
                console.warn("Failed to decode telemetry datagram:", error);
            }
        });
        this.socket.on("error", (error) => {
            console.warn("Telemetry socket error:", error);
        });
        this.socket.unref();
    }
    getHeartbeatNs(now) {
        return this.lastHeartbeat === 0n ? 0n : now - this.lastHeartbeat;
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
class TelemetryDaemon {
    nodes = new Map();
    wires = new Map();
    queue = [];
    ringReader;
    socketReceiver;
    renderTimer;
    pollTimer;
    lastHeartbeatNs = 0n;
    totalDropped = 0;
    droppedDelta = 0;
    stallMs;
    fps;
    transport;
    constructor(options) {
        this.fps = options.fps;
        this.stallMs = options.stallMs;
        try {
            this.ringReader = new RingReader(options.ring);
            this.transport = "ring";
        }
        catch (error) {
            console.warn(`Failed to attach ring at ${options.ring}:`, error);
            console.warn("Falling back to socket listener.");
            this.socketReceiver = new SocketReceiver(this.queue);
            this.transport = this.socketReceiver.kind;
        }
    }
    start() {
        if (this.ringReader) {
            this.pollTimer = setInterval(() => {
                try {
                    const result = this.ringReader.poll();
                    this.queue.push(...result.frames);
                    this.lastHeartbeatNs = result.heartbeatNs;
                    this.droppedDelta = result.droppedDelta;
                    this.totalDropped = result.totalDropped;
                }
                catch (error) {
                    console.warn("Telemetry ring poll failed:", error);
                }
            }, 16);
            this.pollTimer.unref?.();
        }
        this.renderTimer = setInterval(() => this.render(), Math.max(16, Math.trunc(1000 / this.fps)));
        this.renderTimer.unref?.();
        this.render();
    }
    stop() {
        if (this.renderTimer)
            clearInterval(this.renderTimer);
        if (this.pollTimer)
            clearInterval(this.pollTimer);
        this.ringReader?.close();
        this.socketReceiver?.close();
    }
    processQueue() {
        while (this.queue.length) {
            const frame = this.queue.shift();
            this.applyFrame(frame);
        }
    }
    applyFrame(frame) {
        const now = Date.now();
        const payload = frame.payload ?? {};
        switch (frame.type) {
            case TelemetryEventType.NodeStart:
                this.applyNodeState(payload.id, "active", now);
                break;
            case TelemetryEventType.NodeEnd:
                if (payload.ok === false) {
                    this.applyNodeState(payload.id, "warn", now, payload.reason);
                }
                else {
                    this.applyNodeState(payload.id, "ok", now);
                }
                break;
            case TelemetryEventType.WireTransfer: {
                const key = payload.id || `${payload.from ?? "?"}->${payload.to ?? "?"}`;
                this.wires.set(key, {
                    lastActive: now,
                    pkt: payload.pkt ?? 0,
                    from: payload.from,
                    to: payload.to,
                    outPort: payload.outPort,
                    inPort: payload.inPort,
                });
                this.applyNodeState(payload.from, "active", now);
                break;
            }
            case TelemetryEventType.SchemaWarn:
                this.applyNodeState(payload.id, "warn", now, payload.reason ?? "schema warning");
                break;
            case TelemetryEventType.Stalled:
                this.applyNodeState(payload.id, "stalled", now, payload.reason ?? "stalled");
                break;
            case TelemetryEventType.AckClear:
                this.applyNodeState(payload.id, "idle", now);
                break;
            case TelemetryEventType.Heartbeat:
                this.lastHeartbeatNs = process.hrtime.bigint();
                break;
            default:
                break;
        }
    }
    applyNodeState(id, severity, now, reason) {
        if (!id)
            return;
        const existing = this.nodes.get(id) ?? { severity: "idle", latched: false, lastUpdate: now };
        if (severity === "warn" || severity === "stalled") {
            existing.latched = true;
        }
        if (severity === "idle" || severity === "ok") {
            existing.latched = false;
        }
        if (existing.latched && SEVERITY_ORDER[severity] < SEVERITY_ORDER["warn"]) {
            // keep warn/stalled latched until explicit clear or ok
            if (severity === "idle") {
                existing.severity = "idle";
            }
        }
        else if (SEVERITY_ORDER[severity] >= SEVERITY_ORDER[existing.severity] || !existing.latched) {
            existing.severity = severity;
        }
        existing.lastUpdate = now;
        existing.reason = reason;
        this.nodes.set(id, existing);
    }
    render() {
        this.processQueue();
        const now = Date.now();
        for (const [id, state] of this.nodes.entries()) {
            if (!state.latched) {
                if (state.severity === "active" && now - state.lastUpdate > 500) {
                    state.severity = "ok";
                }
                if (state.severity === "ok" && now - state.lastUpdate > 1500) {
                    state.severity = "idle";
                }
            }
            this.nodes.set(id, state);
        }
        for (const [key, wire] of this.wires.entries()) {
            if (now - wire.lastActive > this.stallMs) {
                this.wires.delete(key);
            }
        }
        const heartbeatStatus = this.computeHeartbeat();
        const lines = [];
        lines.push(this.headerLine(heartbeatStatus));
        lines.push("");
        lines.push("Nodes:");
        if (this.nodes.size === 0) {
            lines.push("  (waiting for events)");
        }
        else {
            const sortedNodes = Array.from(this.nodes.entries()).sort(([a], [b]) => a.localeCompare(b));
            for (const [id, state] of sortedNodes) {
                lines.push(`  ${this.colorFor(state.severity)}${state.severity.padEnd(7)}\u001b[0m ${id}${state.reason ? ` — ${state.reason}` : ""}`);
            }
        }
        lines.push("");
        lines.push("Wires:");
        if (this.wires.size === 0) {
            lines.push("  (no recent transfers)");
        }
        else {
            const sortedWires = Array.from(this.wires.entries()).sort(([a], [b]) => a.localeCompare(b));
            for (const [key, wire] of sortedWires.slice(0, 16)) {
                const age = now - wire.lastActive;
                const ports = [wire.outPort, wire.inPort].filter(Boolean).join(" → ");
                lines.push(`  ${key}${ports ? ` (${ports})` : ""} — pkt ${wire.pkt} [${age} ms ago]`);
            }
        }
        process.stdout.write("\u001b[2J\u001b[H" + lines.join("\n") + "\n");
    }
    headerLine(status) {
        const droppedInfo = `dropped Δ${this.droppedDelta} total ${this.totalDropped}`;
        const transportLabel = this.transport === "ring" ? "shared-memory ring" : this.transport === "uds" ? "UDS socket" : "UDP socket";
        return `VOIDE telemetryd — transport: ${transportLabel} | ${status.color}${status.label}\u001b[0m (${status.ageMs.toFixed(0)} ms) | ${droppedInfo}`;
    }
    computeHeartbeat() {
        const nowNs = process.hrtime.bigint();
        let ageMs = 0;
        if (this.transport === "ring") {
            if (this.lastHeartbeatNs === 0n) {
                return { label: "waiting", color: "\u001b[33m", ageMs: 0 };
            }
            const age = nowNs - this.lastHeartbeatNs;
            ageMs = Number(age / 1000000n);
        }
        else {
            const receiver = this.socketReceiver;
            if (!receiver) {
                return { label: "offline", color: "\u001b[31m", ageMs: 0 };
            }
            const age = receiver.getHeartbeatNs(nowNs);
            ageMs = Number(age / 1000000n);
        }
        if (ageMs >= HEARTBEAT_WARN_MS) {
            return { label: "scheduler unresponsive", color: "\u001b[41m\u001b[37m", ageMs };
        }
        return { label: "active", color: "\u001b[32m", ageMs };
    }
    colorFor(severity) {
        switch (severity) {
            case "active":
                return "\u001b[32m";
            case "ok":
                return "\u001b[36m";
            case "warn":
                return "\u001b[33m";
            case "stalled":
                return "\u001b[31m";
            default:
                return "\u001b[90m";
        }
    }
}
function main() {
    const options = parseArgs(process.argv.slice(2));
    const daemon = new TelemetryDaemon(options);
    daemon.start();
    const shutdown = () => {
        daemon.stop();
        process.stdout.write("\nTelemetry daemon stopped.\n");
        process.exit(0);
    };
    process.on("SIGINT", shutdown);
    process.on("SIGTERM", shutdown);
}
main();
