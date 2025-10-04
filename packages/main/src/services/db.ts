import BetterSqlite3 from "better-sqlite3";
import type { Database } from "better-sqlite3";
import path from "path";
import fs from "fs";
import type { PayloadT } from "@voide/shared";
import { emitTelemetry } from "../ipc/telemetry.js";
import type { TelemetryPayload } from "@voide/ipc";

let db: Database | null = null;

export async function initDB() {
  const dir = path.join(process.env.HOME || process.cwd(), ".voide");
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  db = new BetterSqlite3(path.join(dir, "voide.db"));
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
  `);
}

export function getDB(): Database {
  if (!db) {
    throw new Error("Database has not been initialized.");
  }
  return db;
}

export function closeDB() {
  if (!db) {
    return;
  }
  try {
    db.close();
  } catch (error) {
    console.error("Failed to close database:", error);
  } finally {
    db = null;
  }
}

export async function createRun(runId: string, flowId: string) {
  const database = getDB();
  database
    .prepare("insert into runs(id,flow_id,status) values(?,?,?)")
    .run(runId, flowId, "created");
}

export function updateRunStatus(runId: string, status: string) {
  const database = getDB();
  const ended = status === "done" || status === "error" ? ", ended_at=strftime('%s','now')" : "";
  database
    .prepare(`update runs set status=? ${ended} where id=?`)
    .run(status, runId);
}

export async function recordRunLog(ev: TelemetryPayload) {
  emitTelemetry(ev);
}

export async function savePayload(runId: string, nodeId: string, port: string, payload: PayloadT) {
  const database = getDB();
  database
    .prepare("insert into payloads(run_id,node_id,port,kind,body) values(?,?,?,?,?)")
    .run(runId, nodeId, port, payload.kind, JSON.stringify(payload));
}

export async function getPayloadsForRun(runId: string) {
  const database = getDB();
  const rows = database
    .prepare("select node_id,port,kind,body,created_at from payloads where run_id=? order by id asc")
    .all(runId);
  return rows.map((r: any) => ({ nodeId: r.node_id, port: r.port, payload: JSON.parse(r.body) }));
}
