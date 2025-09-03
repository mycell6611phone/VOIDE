// db.ts
import DatabaseConstructor from "better-sqlite3";
import type { Database } from "better-sqlite3";
import path from "path";
import fs from "fs";
import os from "os";
import type { PayloadT, RunLog } from "@voide/shared";

let db: Database | undefined;

function ensureInit() {
  if (!db) throw new Error("DB not initialized. Call initDB() first.");
}

export async function initDB() {
  // XDG-friendly data dir with HOME fallback
  const xdg = process.env.XDG_DATA_HOME;
  const root = xdg ?? path.join(os.homedir(), ".local", "share");
  const dir = path.join(root, "voide");
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  db = new DatabaseConstructor(path.join(dir, "voide.db"));

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

export function getDB(): Database {
  ensureInit();
  return db!;
}

export async function createRun(runId: string, flowId: string) {
  ensureInit();
  db!.prepare("insert into runs(id,flow_id,status) values(?,?,?)")
     .run(runId, flowId, "created");
}

export function updateRunStatus(runId: string, status: string) {
  ensureInit();
  const ended =
    status === "done" || status === "error"
      ? ", ended_at=strftime('%s','now')"
      : "";
  db!.prepare(`update runs set status=? ${ended} where id=?`)
     .run(status, runId);
}

export async function recordRunLog(log: RunLog) {
  ensureInit();
  db!.prepare(
    "insert into logs(run_id,node_id,tokens,latency_ms,status,error) values(?,?,?,?,?,?)"
  ).run(log.runId, log.nodeId, log.tokens, log.latencyMs, log.status, log.error ?? null);
}

export async function savePayload(runId: string, nodeId: string, port: string, payload: PayloadT) {
  ensureInit();
  db!.prepare(
    "insert into payloads(run_id,node_id,port,kind,body) values(?,?,?,?,?)"
  ).run(runId, nodeId, port, (payload as any).kind ?? "unknown", JSON.stringify(payload));
}

export async function getPayloadsForRun(runId: string) {
  ensureInit();
  const rows = db!.prepare(
    "select node_id,port,kind,body,created_at from payloads where run_id=? order by id asc"
  ).all(runId);

  return rows.map((r: any) => ({
    nodeId: r.node_id,
    port: r.port,
    kind: r.kind,
    createdAt: r.created_at,
    payload: JSON.parse(r.body) as PayloadT
  }));
}

