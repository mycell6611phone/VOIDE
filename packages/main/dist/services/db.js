"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.initDB = initDB;
exports.getDB = getDB;
exports.createRun = createRun;
exports.updateRunStatus = updateRunStatus;
exports.recordRunLog = recordRunLog;
exports.savePayload = savePayload;
exports.getPayloadsForRun = getPayloadsForRun;
exports.saveProject = saveProject;
exports.loadProject = loadProject;
// db.ts
const better_sqlite3_1 = __importDefault(require("better-sqlite3"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const os_1 = __importDefault(require("os"));
let db;
function ensureInit() {
    if (!db)
        throw new Error("DB not initialized. Call initDB() first.");
}
async function initDB() {
    // XDG-friendly data dir with HOME fallback
    const xdg = process.env.XDG_DATA_HOME;
    const root = xdg ?? path_1.default.join(os_1.default.homedir(), ".local", "share");
    const dir = path_1.default.join(root, "voide");
    if (!fs_1.default.existsSync(dir))
        fs_1.default.mkdirSync(dir, { recursive: true });
    db = new better_sqlite3_1.default(path_1.default.join(dir, "voide.db"));
    // Pragmas for durability + performance; safe to call each start
    db.pragma("journal_mode = WAL");
    db.pragma("synchronous = NORMAL");
    db.pragma("foreign_keys = ON");
    db.exec(`
    create table if not exists flows(
      id text primary key,
      name text,
      json text,
      version text,
      created_at integer default (strftime('%s','now')),
      updated_at integer
    );

    create table if not exists runs(
      id text primary key,
      flow_id text,
      status text,
      started_at integer default (strftime('%s','now')),
      ended_at integer
      -- NOTE: add a foreign key in a migration if you need enforcement:
      -- , foreign key(flow_id) references flows(id)
    );

    create table if not exists payloads(
      id integer primary key autoincrement,
      run_id text,
      node_id text,
      port text,
      kind text,
      body text,
      created_at integer default (strftime('%s','now'))
    );

    create table if not exists logs(
      id integer primary key autoincrement,
      run_id text,
      node_id text,
      tokens integer,
      latency_ms integer,
      status text,
      error text,
      created_at integer default (strftime('%s','now'))
    );

    create index if not exists idx_payloads_run on payloads(run_id, id);
    create index if not exists idx_logs_run on logs(run_id, id);
    create index if not exists idx_runs_flow on runs(flow_id, started_at);
  `);
}
function getDB() {
    ensureInit();
    return db;
}
async function createRun(runId, flowId) {
    ensureInit();
    db.prepare("insert into runs(id,flow_id,status) values(?,?,?)")
        .run(runId, flowId, "created");
}
function updateRunStatus(runId, status) {
    ensureInit();
    const ended = status === "done" || status === "error"
        ? ", ended_at=strftime('%s','now')"
        : "";
    db.prepare(`update runs set status=? ${ended} where id=?`)
        .run(status, runId);
}
async function recordRunLog(log) {
    ensureInit();
    db.prepare("insert into logs(run_id,node_id,tokens,latency_ms,status,error) values(?,?,?,?,?,?)").run(log.runId, log.nodeId, log.tokens, log.latencyMs, log.status, log.error ?? null);
}
async function savePayload(runId, nodeId, port, payload) {
    ensureInit();
    db.prepare("insert into payloads(run_id,node_id,port,kind,body) values(?,?,?,?,?)").run(runId, nodeId, port, payload.kind ?? "unknown", JSON.stringify(payload));
}
async function getPayloadsForRun(runId) {
    ensureInit();
    const rows = db.prepare("select node_id,port,kind,body,created_at from payloads where run_id=? order by id asc").all(runId);
    return rows.map((r) => ({
        nodeId: r.node_id,
        port: r.port,
        kind: r.kind,
        createdAt: r.created_at,
        payload: JSON.parse(r.body)
    }));
}
function saveProject(flow, filePath) {
    fs_1.default.writeFileSync(filePath, JSON.stringify(flow, null, 2), "utf-8");
}
function loadProject(filePath) {
    const raw = fs_1.default.readFileSync(filePath, "utf-8");
    return JSON.parse(raw);
}
