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
  create table if not exists logs(
    id integer primary key autoincrement,
    run_id text,
    node_id text,
    tag text,
    body text,
    created_at integer default (strftime('%s','now'))
  );
  create table if not exists memory(
    namespace text not null default 'default',
    key text not null,
    value text not null default '',
    updated_at integer default (strftime('%s','now')),
    primary key(namespace, key)
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

export async function insertLogEntry(
  runId: string,
  nodeId: string,
  tag: string | null | undefined,
  payload: unknown
) {
  const database = getDB();
  database
    .prepare("insert into logs(run_id,node_id,tag,body) values(?,?,?,?)")
    .run(runId, nodeId, tag ?? null, JSON.stringify(payload ?? null));
}

export async function readMemory(namespace: string, key: string): Promise<string | null> {
  const database = getDB();
  const row = database
    .prepare("select value from memory where namespace=? and key=?")
    .get(namespace, key) as { value?: string } | undefined;
  return row && typeof row.value === "string" ? row.value : null;
}

export async function writeMemory(namespace: string, key: string, value: string): Promise<void> {
  const database = getDB();
  database
    .prepare(
      "insert into memory(namespace,key,value,updated_at) values(?,?,?,strftime('%s','now')) " +
        "on conflict(namespace,key) do update set value=excluded.value, updated_at=strftime('%s','now')"
    )
    .run(namespace, key, value);
}

export async function appendMemory(namespace: string, key: string, value: string): Promise<string> {
  const database = getDB();
  const existing = await readMemory(namespace, key);
  const combined = existing ? `${existing}\n${value}` : value;
  await writeMemory(namespace, key, combined);
  return combined;
}
