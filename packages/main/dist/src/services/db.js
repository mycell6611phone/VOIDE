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
const better_sqlite3_1 = __importDefault(require("better-sqlite3"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
// CORRECTED: The type is simply 'Database' from the import.
let db;
async function initDB() {
    const dir = path_1.default.join(process.env.HOME || process.cwd(), ".voide");
    if (!fs_1.default.existsSync(dir))
        fs_1.default.mkdirSync(dir, { recursive: true });
    db = new better_sqlite3_1.default(path_1.default.join(dir, "voide.db"));
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
  `);
}
// CORRECTED: The return type is also 'Database'.
function getDB() { return db; }
async function createRun(runId, flowId) {
    db.prepare("insert into runs(id,flow_id,status) values(?,?,?)").run(runId, flowId, "created");
}
function updateRunStatus(runId, status) {
    const ended = status === "done" || status === "error" ? ", ended_at=strftime('%s','now')" : "";
    db.prepare(`update runs set status=? ${ended} where id=?`).run(status, runId);
}
async function recordRunLog(log) {
    db.prepare("insert into logs(run_id,node_id,tokens,latency_ms,status,error) values(?,?,?,?,?,?)")
        .run(log.runId, log.nodeId, log.tokens, log.latencyMs, log.status, log.error ?? null);
}
async function savePayload(runId, nodeId, port, payload) {
    db.prepare("insert into payloads(run_id,node_id,port,kind,body) values(?,?,?,?,?)")
        .run(runId, nodeId, port, payload.kind, JSON.stringify(payload));
}
async function getPayloadsForRun(runId) {
    const rows = db.prepare("select node_id,port,kind,body,created_at from payloads where run_id=? order by id asc").all(runId);
    return rows.map((r) => ({ nodeId: r.node_id, port: r.port, payload: JSON.parse(r.body) }));
}
