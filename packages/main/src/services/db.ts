import BetterSqlite3 from "better-sqlite3";
import type { Database } from "better-sqlite3";
import path from "path";
import fs from "fs";
import type { FlowDef, PayloadT } from "@voide/shared";
import { emitTelemetry } from "../ipc/telemetry.js";
import type { TelemetryPayload } from "@voide/ipc";

let db: Database | null = null;

const FLOW_MEMORY_NAMESPACE = "flows";
const LAST_OPENED_KEY = "lastOpenedId";

export interface StoredFlowRecord {
  id: string;
  name: string;
  version: string;
  updatedAt: number | null;
  flow: FlowDef;
}

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

const FLOW_COLUMNS = "id,name,version,json,updated_at";

type FlowRow = {
  id: string;
  name?: string | null;
  version?: string | null;
  json: string;
  updated_at?: number | null;
};

const parseFlowRow = (row: FlowRow | undefined): StoredFlowRecord | null => {
  if (!row || typeof row !== "object" || typeof row.id !== "string" || typeof row.json !== "string") {
    return null;
  }
  try {
    const flow = JSON.parse(row.json) as FlowDef;
    const name = typeof row.name === "string" && row.name.trim().length > 0 ? row.name : flow.id;
    const version = typeof row.version === "string" && row.version.trim().length > 0 ? row.version : flow.version ?? "";
    const updatedAt = typeof row.updated_at === "number" ? row.updated_at : null;
    return { id: row.id, name, version, updatedAt, flow };
  } catch (error) {
    console.error("Failed to parse stored flow", error);
    return null;
  }
};

const coerceFlowName = (flow: FlowDef): string => {
  const name = (flow as { name?: unknown }).name;
  return typeof name === "string" && name.trim().length > 0 ? name : flow.id;
};

export function persistFlow(flow: FlowDef): StoredFlowRecord | null {
  const database = getDB();
  const payload = JSON.stringify(flow);
  database
    .prepare(
      "insert into flows(id,name,json,version,updated_at) values(?,?,?,?,strftime('%s','now')) " +
        "on conflict(id) do update set name=excluded.name, json=excluded.json, version=excluded.version, updated_at=excluded.updated_at"
    )
    .run(flow.id, coerceFlowName(flow), payload, flow.version ?? "");
  return getFlowById(flow.id);
}

export function getFlowById(id: string): StoredFlowRecord | null {
  const database = getDB();
  const row = database.prepare(`select ${FLOW_COLUMNS} from flows where id=?`).get(id) as FlowRow | undefined;
  return parseFlowRow(row);
}

export function getMostRecentFlow(): StoredFlowRecord | null {
  const database = getDB();
  const row = database
    .prepare(`select ${FLOW_COLUMNS} from flows order by updated_at desc, created_at desc limit 1`)
    .get() as FlowRow | undefined;
  return parseFlowRow(row);
}

export async function rememberLastOpenedFlow(flowId: string): Promise<void> {
  await writeMemory(FLOW_MEMORY_NAMESPACE, LAST_OPENED_KEY, flowId);
}

export async function readLastOpenedFlow(): Promise<StoredFlowRecord | null> {
  const lastId = await readMemory(FLOW_MEMORY_NAMESPACE, LAST_OPENED_KEY);
  if (lastId) {
    const stored = getFlowById(lastId);
    if (stored) {
      return stored;
    }
  }
  const fallback = getMostRecentFlow();
  if (fallback) {
    await rememberLastOpenedFlow(fallback.id);
    return fallback;
  }
  return null;
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
