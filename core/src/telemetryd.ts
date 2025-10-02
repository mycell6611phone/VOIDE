#!/usr/bin/env node
import { Command } from "commander";
import fs from "node:fs";
import process from "node:process";
import {
  TelemetryEventType,
  resolveTelemetryRingPath,
} from "./run/telemetry.js";

const HEADER_MAGIC = 0x4d4c5456;
const RING_HEADER_SIZE = 64;
const EVENT_HEADER_SIZE = 24;
const WIRE_DECAY_NS = BigInt(200_000_000); // 200 ms

type NodeLightState = "idle" | "ok" | "active" | "warn" | "stalled";

interface NodeLight {
  state: NodeLightState;
  latchedWarn: boolean;
  reason?: string;
  updatedAt: number;
}

interface WireLight {
  id: string;
  from: string;
  to: string;
  lastNs: bigint;
}

interface Frame {
  type: number;
  payload: any;
  tsNs: bigint;
}

interface TelemetryDaemonOptions {
  ringPath: string;
  fps: number;
  stallMs: number;
}

class RingReader {
  private fd: number;
  private readonly ringSize: number;
  private readHead: bigint;
  private writeHead: bigint;
  private heartbeatNs: bigint;
  private dropped: bigint;
  private readonly dataOffset = RING_HEADER_SIZE;

  constructor(private readonly ringPath: string) {
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

  next(): Frame | null {
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
    let payload: any = {};
    if (payloadLen > 0) {
      try {
        payload = JSON.parse(payloadBuf.toString("utf8"));
      } catch {
        payload = {};
      }
    }
    return { type, payload, tsNs };
  }

  getHeartbeatNs(): bigint {
    return this.heartbeatNs;
  }

  getDropped(): bigint {
    return this.dropped;
  }

  close(): void {
    if (this.fd !== -1) {
      fs.closeSync(this.fd);
      this.fd = -1;
    }
  }

  private refreshHeader(): void {
    const buf = Buffer.alloc(8);
    fs.readSync(this.fd, buf, 0, 8, 16);
    this.writeHead = buf.readBigUInt64LE(0);
    fs.readSync(this.fd, buf, 0, 8, 32);
    this.heartbeatNs = buf.readBigUInt64LE(0);
    fs.readSync(this.fd, buf, 0, 8, 40);
    this.dropped = buf.readBigUInt64LE(0);
  }

  private readWrap(target: Buffer, offset: number): void {
    if (target.length === 0) return;
    if (offset + target.length <= this.ringSize) {
      fs.readSync(this.fd, target, 0, target.length, this.dataOffset + offset);
      return;
    }
    const first = this.ringSize - offset;
    fs.readSync(this.fd, target, 0, first, this.dataOffset + offset);
    fs.readSync(this.fd, target, first, target.length - first, this.dataOffset);
  }

  private persistReadHead(): void {
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

const NODE_SEVERITY: Record<NodeLightState, number> = {
  idle: 0,
  ok: 1,
  active: 2,
  warn: 3,
  stalled: 4,
};

class TelemetryDaemon {
  private readonly reader: RingReader;
  private pollTimer?: NodeJS.Timeout;
  private renderTimer?: NodeJS.Timeout;
  private lastNonTtyLog = 0;
  private readonly stallThresholdNs: bigint;
  private readonly nodes = new Map<string, NodeLight>();
  private readonly wires = new Map<string, WireLight>();

  constructor(private readonly options: TelemetryDaemonOptions) {
    this.reader = new RingReader(options.ringPath);
    this.stallThresholdNs = BigInt(Math.max(options.stallMs, 100)) * 1_000_000n;
  }

  start(): void {
    this.poll();
    this.pollTimer = setInterval(() => this.poll(), 15);
    const interval = Math.max(16, Math.floor(1000 / this.options.fps));
    this.renderTimer = setInterval(() => this.render(), interval);
    this.render();
  }

  stop(): void {
    if (this.pollTimer) clearInterval(this.pollTimer);
    if (this.renderTimer) clearInterval(this.renderTimer);
    this.reader.close();
  }

  private poll(): void {
    while (true) {
      const frame = this.reader.next();
      if (!frame) break;
      this.apply(frame);
    }
  }

  private apply(frame: Frame): void {
    switch (frame.type) {
      case TelemetryEventType.NodeStart:
        this.handleNodeStart(frame.payload);
        break;
      case TelemetryEventType.NodeEnd:
        this.handleNodeEnd(frame.payload);
        break;
      case TelemetryEventType.WireTx:
        this.handleWire(frame.payload, frame.tsNs);
        break;
      case TelemetryEventType.SchemaWarn:
        this.handleSchemaWarn(frame.payload);
        break;
      case TelemetryEventType.Stalled:
        this.handleStalled(frame.payload);
        break;
      case TelemetryEventType.AckClear:
        this.handleAck(frame.payload);
        break;
      default:
        break;
    }
  }

  private ensureNode(id: string | undefined): NodeLight {
    const key = id ?? "unknown";
    const existing = this.nodes.get(key);
    if (existing) return existing;
    const light: NodeLight = { state: "idle", latchedWarn: false, updatedAt: Date.now() };
    this.nodes.set(key, light);
    return light;
  }

  private handleNodeStart(payload: any): void {
    const node = this.ensureNode(payload?.id);
    node.updatedAt = Date.now();
    node.state = node.latchedWarn ? "warn" : "active";
    if (payload?.reason) node.reason = String(payload.reason);
  }

  private handleNodeEnd(payload: any): void {
    const node = this.ensureNode(payload?.id);
    node.updatedAt = Date.now();
    if (payload?.ok === false) {
      node.state = "warn";
      node.latchedWarn = true;
      node.reason = payload?.reason ? String(payload.reason) : undefined;
    } else {
      node.state = "ok";
      node.latchedWarn = false;
      node.reason = undefined;
    }
  }

  private handleSchemaWarn(payload: any): void {
    const node = this.ensureNode(payload?.id);
    node.updatedAt = Date.now();
    node.state = "warn";
    node.latchedWarn = true;
    node.reason = payload?.reason ? String(payload.reason) : "schema warning";
  }

  private handleStalled(payload: any): void {
    const node = this.ensureNode(payload?.id);
    node.updatedAt = Date.now();
    node.state = "stalled";
    node.latchedWarn = true;
    node.reason = payload?.reason ? String(payload.reason) : "stalled";
  }

  private handleAck(payload: any): void {
    if (!payload?.id) return;
    const node = this.ensureNode(payload.id);
    node.updatedAt = Date.now();
    node.state = "ok";
    node.latchedWarn = false;
    node.reason = undefined;
  }

  private handleWire(payload: any, tsNs: bigint): void {
    if (!payload?.id) return;
    const wire: WireLight = this.wires.get(payload.id) ?? {
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

  private render(): void {
    const nowNs = process.hrtime.bigint();
    const hb = this.reader.getHeartbeatNs();
    const deltaNs = hb === 0n ? 0n : nowNs - hb;
    const deltaMs = hb === 0n ? Number.NaN : Number(deltaNs / 1_000_000n);
    const frozen = hb === 0n ? true : deltaNs > this.stallThresholdNs;

    for (const [id, wire] of this.wires) {
      if (nowNs - wire.lastNs > WIRE_DECAY_NS) {
        this.wires.delete(id);
      }
    }

    const nodes = Array.from(this.nodes.entries()).sort((a, b) => {
      const aRank = NODE_SEVERITY[a[1].state];
      const bRank = NODE_SEVERITY[b[1].state];
      if (aRank === bRank) return a[0].localeCompare(b[0]);
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
    } else {
      const now = Date.now();
      if (now - this.lastNonTtyLog < 1000) return;
      this.lastNonTtyLog = now;
      console.log(
        [
          header,
          summary,
          frozen ? "scheduler unresponsive" : "scheduler ok",
          `nodes=${nodeLines.join(", ") || "none"}`,
          `wires=${wireLines.join(", ") || "none"}`,
        ].join(" | "),
      );
    }
  }

  private formatBadge(state: NodeLightState): string {
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

function parseIntOption(value: string, fallback: number, min: number): number {
  const num = Number.parseInt(value, 10);
  if (Number.isNaN(num)) return fallback;
  return Math.max(min, num);
}

const program = new Command();
program
  .name("voide-telemetryd")
  .description("VOIDE telemetry daemon")
  .option("--ring <path>", "telemetry ring path", resolveTelemetryRingPath())
  .option("--fps <fps>", "render frames per second", (v: string) => parseIntOption(v, 30, 1), 30)
  .option("--stall-ms <ms>", "stall detection threshold", (v: string) => parseIntOption(v, 500, 100), 500);

program.parse(process.argv);
const opts = program.opts<{ ring: string; fps: number; stallMs: number }>();

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
} catch (err) {
  const message = err instanceof Error ? err.message : String(err);
  console.error(`voide-telemetryd: ${message}`);
  process.exit(1);
}

