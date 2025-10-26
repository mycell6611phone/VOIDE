#!/usr/bin/env node
import { Command } from "commander";
import fs from "node:fs";
import process from "node:process";
import { resolveTelemetryRingPath, } from "./run/telemetry.js";
const HEADER_MAGIC = 0x4d4c5456;
const RING_HEADER_SIZE = 64;
const EVENT_HEADER_SIZE = 24;
const WIRE_DECAY_NS = BigInt(200_000_000); // 200 ms
class RingReader {
    ringPath;
    fd;
    ringSize;
    readHead;
    writeHead;
    heartbeatNs;
    dropped;
    dataOffset = RING_HEADER_SIZE;
    constructor(ringPath) {
        this.ringPath = ringPath;
        if (!fs.existsSync(ringPath)) {
            throw new Error(`ring file not found: ${ringPath}`);
        }
        this.fd = fs.openSync(ringPath, fs.constants.O_RDWR);
        const header = Buffer.alloc(RING_HEADER_SIZE);
        if (fs.readSync(this.fd, header, 0, RING_HEADER_SIZE, 0) !== RING_HEADER_SIZE) {
            throw new Error("telemetry ring header truncated");
        }
        const magic = header.readUInt32LE(0);
        if (magic !== HEADER_MAGIC) {
            throw new Error("invalid telemetry ring magic");
        }
        this.ringSize = header.readUInt32LE(8);
        this.writeHead = header.readBigUInt64LE(16);
        this.readHead = header.readBigUInt64LE(24);
        this.heartbeatNs = header.readBigUInt64LE(32);
        this.dropped = header.readBigUInt64LE(40);
    }
    next() {
        this.refreshHeader();
        if (this.readHead >= this.writeHead) {
            return null;
        }
        const offset = Number(this.readHead % BigInt(this.ringSize));
        const header = Buffer.alloc(EVENT_HEADER_SIZE);
        this.readWrap(header, offset);
        const magic = header.readUInt32LE(0);
        if (magic !== HEADER_MAGIC) {
            this.readHead = this.writeHead;
            this.persistReadHead();
            return null;
        }
        const type = header.readUInt16LE(6);
        const tsNs = header.readBigUInt64LE(8);
        const payloadLen = header.readUInt32LE(16);
        if (payloadLen > this.ringSize) {
            this.readHead = this.writeHead;
            this.persistReadHead();
            return null;
        }
        const total = EVENT_HEADER_SIZE + payloadLen;
        const payloadBuf = Buffer.alloc(payloadLen);
        const payloadOffset = (offset + EVENT_HEADER_SIZE) % this.ringSize;
        this.readWrap(payloadBuf, payloadOffset);
        this.readHead += BigInt(total);
        this.persistReadHead();
        let payload = {};
        if (payloadLen > 0) {
            try {
                payload = JSON.parse(payloadBuf.toString("utf8"));
            }
            catch {
                payload = {};
            }
        }
        return { type, payload, tsNs };
    }
    getHeartbeatNs() {
        return this.heartbeatNs;
    }
    getDropped() {
        return this.dropped;
    }
    close() {
        if (this.fd !== -1) {
            fs.closeSync(this.fd);
            this.fd = -1;
        }
    }
    refreshHeader() {
        const buf = Buffer.alloc(8);
        fs.readSync(this.fd, buf, 0, 8, 16);
        this.writeHead = buf.readBigUInt64LE(0);
        fs.readSync(this.fd, buf, 0, 8, 32);
        this.heartbeatNs = buf.readBigUInt64LE(0);
        fs.readSync(this.fd, buf, 0, 8, 40);
        this.dropped = buf.readBigUInt64LE(0);
    }
    readWrap(target, offset) {
        if (target.length === 0)
            return;
        if (offset + target.length <= this.ringSize) {
            fs.readSync(this.fd, target, 0, target.length, this.dataOffset + offset);
            return;
        }
        const first = this.ringSize - offset;
        fs.readSync(this.fd, target, 0, first, this.dataOffset + offset);
        fs.readSync(this.fd, target, first, target.length - first, this.dataOffset);
    }
    persistReadHead() {
        const buf = Buffer.alloc(8);
        buf.writeBigUInt64LE(this.readHead);
        fs.writeSync(this.fd, buf, 0, 8, 24);
    }
}
const COLORS = {
    reset: "\u001b[0m",
    red: "\u001b[31m",
    yellow: "\u001b[33m",
    green: "\u001b[32m",
    cyan: "\u001b[36m",
    magenta: "\u001b[35m",
    dim: "\u001b[2m",
};
const NODE_SEVERITY = {
    idle: 0,
    ok: 1,
    active: 2,
    warn: 3,
    stalled: 4,
};
class TelemetryDaemon {
    options;
    reader;
    pollTimer;
    renderTimer;
    lastNonTtyLog = 0;
    stallThresholdNs;
    nodes = new Map();
    wires = new Map();
    constructor(options) {
        this.options = options;
        this.reader = new RingReader(options.ringPath);
        this.stallThresholdNs = BigInt(Math.max(options.stallMs, 100)) * 1000000n;
    }
    start() {
        this.poll();
        this.pollTimer = setInterval(() => this.poll(), 15);
        const interval = Math.max(16, Math.floor(1000 / this.options.fps));
        this.renderTimer = setInterval(() => this.render(), interval);
        this.render();
    }
    stop() {
        if (this.pollTimer)
            clearInterval(this.pollTimer);
        if (this.renderTimer)
            clearInterval(this.renderTimer);
        this.reader.close();
    }
    poll() {
        while (true) {
            const frame = this.reader.next();
            if (!frame)
                break;
            this.apply(frame);
        }
    }
    apply(frame) {
        switch (frame.type) {
            case 1 /* TelemetryEventType.NodeStart */:
                this.handleNodeStart(frame.payload);
                break;
            case 2 /* TelemetryEventType.NodeEnd */:
                this.handleNodeEnd(frame.payload);
                break;
            case 3 /* TelemetryEventType.WireTx */:
                this.handleWire(frame.payload, frame.tsNs);
                break;
            case 4 /* TelemetryEventType.SchemaWarn */:
                this.handleSchemaWarn(frame.payload);
                break;
            case 5 /* TelemetryEventType.Stalled */:
                this.handleStalled(frame.payload);
                break;
            case 6 /* TelemetryEventType.AckClear */:
                this.handleAck(frame.payload);
                break;
            default:
                break;
        }
    }
    ensureNode(id) {
        const key = id ?? "unknown";
        const existing = this.nodes.get(key);
        if (existing)
            return existing;
        const light = { state: "idle", latchedWarn: false, updatedAt: Date.now() };
        this.nodes.set(key, light);
        return light;
    }
    handleNodeStart(payload) {
        const node = this.ensureNode(payload?.id);
        node.updatedAt = Date.now();
        node.state = node.latchedWarn ? "warn" : "active";
        if (payload?.reason)
            node.reason = String(payload.reason);
    }
    handleNodeEnd(payload) {
        const node = this.ensureNode(payload?.id);
        node.updatedAt = Date.now();
        if (payload?.ok === false) {
            node.state = "warn";
            node.latchedWarn = true;
            node.reason = payload?.reason ? String(payload.reason) : undefined;
        }
        else {
            node.state = "ok";
            node.latchedWarn = false;
            node.reason = undefined;
        }
    }
    handleSchemaWarn(payload) {
        const node = this.ensureNode(payload?.id);
        node.updatedAt = Date.now();
        node.state = "warn";
        node.latchedWarn = true;
        node.reason = payload?.reason ? String(payload.reason) : "schema warning";
    }
    handleStalled(payload) {
        const node = this.ensureNode(payload?.id);
        node.updatedAt = Date.now();
        node.state = "stalled";
        node.latchedWarn = true;
        node.reason = payload?.reason ? String(payload.reason) : "stalled";
    }
    handleAck(payload) {
        if (!payload?.id)
            return;
        const node = this.ensureNode(payload.id);
        node.updatedAt = Date.now();
        node.state = "ok";
        node.latchedWarn = false;
        node.reason = undefined;
    }
    handleWire(payload, tsNs) {
        if (!payload?.id)
            return;
        const wire = this.wires.get(payload.id) ?? {
            id: payload.id,
            from: payload?.from ?? "",
            to: payload?.to ?? "",
            lastNs: tsNs,
        };
        wire.from = payload?.from ?? wire.from;
        wire.to = payload?.to ?? wire.to;
        wire.lastNs = tsNs;
        this.wires.set(payload.id, wire);
    }
    render() {
        const nowNs = process.hrtime.bigint();
        const hb = this.reader.getHeartbeatNs();
        const deltaNs = hb === 0n ? 0n : nowNs - hb;
        const deltaMs = hb === 0n ? Number.NaN : Number(deltaNs / 1000000n);
        const frozen = hb === 0n ? true : deltaNs > this.stallThresholdNs;
        for (const [id, wire] of this.wires) {
            if (nowNs - wire.lastNs > WIRE_DECAY_NS) {
                this.wires.delete(id);
            }
        }
        const nodes = Array.from(this.nodes.entries()).sort((a, b) => {
            const aRank = NODE_SEVERITY[a[1].state];
            const bRank = NODE_SEVERITY[b[1].state];
            if (aRank === bRank)
                return a[0].localeCompare(b[0]);
            return bRank - aRank;
        });
        const nodeLines = nodes.map(([id, node]) => {
            const badge = this.formatBadge(node.state);
            const reason = node.reason ? ` — ${node.reason}` : "";
            return `${badge} ${id}${reason}`;
        });
        const wireLines = Array.from(this.wires.values())
            .sort((a, b) => a.id.localeCompare(b.id))
            .map((wire) => `• ${wire.id} ${wire.from}→${wire.to}`);
        const status = frozen
            ? `${COLORS.red}SCHEDULER FROZEN${COLORS.reset}`
            : `${COLORS.green}SCHEDULER ACTIVE${COLORS.reset}`;
        const deltaText = Number.isNaN(deltaMs) ? "--" : deltaMs.toFixed(0);
        const summary = `${status} Δ=${deltaText}ms  dropped=${this.reader.getDropped().toString()}`;
        const header = `voide-telemetryd — ${this.options.ringPath}`;
        if (process.stdout.isTTY) {
            process.stdout.write("\u001b[2J\u001b[H");
            process.stdout.write(`${header}\n${summary}\n`);
            if (frozen) {
                process.stdout.write(`${COLORS.red}scheduler unresponsive${COLORS.reset}\n`);
            }
            process.stdout.write("\nNodes:\n");
            process.stdout.write(nodeLines.length ? `${nodeLines.join("\n")}\n` : "(none)\n");
            process.stdout.write("\nWires:\n");
            process.stdout.write(wireLines.length ? `${wireLines.join("\n")}\n` : "(none)\n");
        }
        else {
            const now = Date.now();
            if (now - this.lastNonTtyLog < 1000)
                return;
            this.lastNonTtyLog = now;
            console.log([
                header,
                summary,
                frozen ? "scheduler unresponsive" : "scheduler ok",
                `nodes=${nodeLines.join(", ") || "none"}`,
                `wires=${wireLines.join(", ") || "none"}`,
            ].join(" | "));
        }
    }
    formatBadge(state) {
        switch (state) {
            case "stalled":
                return `${COLORS.red}[STALL]${COLORS.reset}`;
            case "warn":
                return `${COLORS.yellow}[WARN]${COLORS.reset}`;
            case "active":
                return `${COLORS.cyan}[RUN]${COLORS.reset}`;
            case "ok":
                return `${COLORS.green}[OK]${COLORS.reset}`;
            default:
                return `${COLORS.dim}[IDLE]${COLORS.reset}`;
        }
    }
}
function parseIntOption(value, fallback, min) {
    const num = Number.parseInt(value, 10);
    if (Number.isNaN(num))
        return fallback;
    return Math.max(min, num);
}
const program = new Command();
program
    .name("voide-telemetryd")
    .description("VOIDE telemetry daemon")
    .option("--ring <path>", "telemetry ring path", resolveTelemetryRingPath())
    .option("--fps <fps>", "render frames per second", (v) => parseIntOption(v, 30, 1), 30)
    .option("--stall-ms <ms>", "stall detection threshold", (v) => parseIntOption(v, 500, 100), 500);
program.parse(process.argv);
const opts = program.opts();
try {
    const daemon = new TelemetryDaemon({
        ringPath: opts.ring,
        fps: opts.fps,
        stallMs: opts.stallMs,
    });
    const shutdown = () => {
        daemon.stop();
        process.exit(0);
    };
    process.once("SIGINT", shutdown);
    process.once("SIGTERM", shutdown);
    daemon.start();
}
catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`voide-telemetryd: ${message}`);
    process.exit(1);
}
