import path from "path";
import fs from "fs";
import { createRequire } from "node:module";
import { emitTelemetry } from "../ipc/telemetry.js";
import { ensureElectronBetterSqliteBinding } from "./betterSqliteBinding.js";

const require = createRequire(import.meta.url);
let sqliteModule = null;
let loggedModuleVersionError = false;

function isModuleVersionMismatch(error) {
    if (!error || typeof error !== "object") {
        return false;
    }
    const message = "message" in error ? String(error.message ?? "") : "";
    if (message.includes("NODE_MODULE_VERSION")) {
        return true;
    }
    const code = "code" in error ? error.code : undefined;
    return code === "ERR_DLOPEN_FAILED";
}

function loadBetterSqlite3() {
    if (sqliteModule) {
        return sqliteModule;
    }
    if (process.versions?.electron) {
        ensureElectronBetterSqliteBinding();
    }
    try {
        const loaded = require("better-sqlite3");
        sqliteModule = loaded;
        return loaded;
    }
    catch (error) {
        if (process.versions?.electron && isModuleVersionMismatch(error) && !loggedModuleVersionError) {
            loggedModuleVersionError = true;
            console.error("[voide] Failed to load better-sqlite3 for the Electron runtime. Run 'pnpm run native:prepare' to rebuild the native bindings.");
        }
        throw error;
    }
}
let db = null;
let initPromise = null;
let initError = null;
const FLOW_MEMORY_NAMESPACE = "flows";
const LAST_OPENED_KEY = "lastOpenedId";
export async function initDB() {
    if (db) {
        return db;
    }
    if (initPromise) {
        return initPromise;
    }
    const initialize = async () => {
        const dir = path.join(process.env.HOME || process.cwd(), ".voide");
        if (!fs.existsSync(dir))
            fs.mkdirSync(dir, { recursive: true });
        const DatabaseCtor = loadBetterSqlite3();
        const instance = new DatabaseCtor(path.join(dir, "voide.db"));
        instance.exec(`
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
        db = instance;
        initError = null;
        return instance;
    };
    initPromise = initialize();
    try {
        return await initPromise;
    }
    catch (error) {
        initError = error;
        db = null;
        throw error;
    }
    finally {
        initPromise = null;
    }
}
export function getDB() {
    if (db) {
        return db;
    }
    if (initError) {
        if (initError instanceof Error) {
            throw initError;
        }
        throw new Error("Database initialization failed.");
    }
    throw new Error("Database has not been initialized. Call initDB() before accessing the database.");
}
export function closeDB() {
    if (!db) {
        return;
    }
    try {
        db.close();
    }
    catch (error) {
        console.error("Failed to close database:", error);
    }
    finally {
        db = null;
        initPromise = null;
        initError = null;
    }
}
const FLOW_COLUMNS = "id,name,version,json,updated_at";
const parseFlowRow = (row) => {
    if (!row || typeof row !== "object" || typeof row.id !== "string" || typeof row.json !== "string") {
        return null;
    }
    try {
        const flow = JSON.parse(row.json);
        const name = typeof row.name === "string" && row.name.trim().length > 0 ? row.name : flow.id;
        const version = typeof row.version === "string" && row.version.trim().length > 0 ? row.version : flow.version ?? "";
        const updatedAt = typeof row.updated_at === "number" ? row.updated_at : null;
        return { id: row.id, name, version, updatedAt, flow };
    }
    catch (error) {
        console.error("Failed to parse stored flow", error);
        return null;
    }
};
const coerceFlowName = (flow) => {
    const name = flow.name;
    return typeof name === "string" && name.trim().length > 0 ? name : flow.id;
};
export function persistFlow(flow) {
    const database = getDB();
    const payload = JSON.stringify(flow);
    database
        .prepare("insert into flows(id,name,json,version,updated_at) values(?,?,?,?,strftime('%s','now')) " +
        "on conflict(id) do update set name=excluded.name, json=excluded.json, version=excluded.version, updated_at=excluded.updated_at")
        .run(flow.id, coerceFlowName(flow), payload, flow.version ?? "");
    return getFlowById(flow.id);
}
export function getFlowById(id) {
    const database = getDB();
    const row = database.prepare(`select ${FLOW_COLUMNS} from flows where id=?`).get(id);
    return parseFlowRow(row);
}
export function getMostRecentFlow() {
    const database = getDB();
    const row = database
        .prepare(`select ${FLOW_COLUMNS} from flows order by updated_at desc, created_at desc limit 1`)
        .get();
    return parseFlowRow(row);
}
export async function rememberLastOpenedFlow(flowId) {
    await writeMemory(FLOW_MEMORY_NAMESPACE, LAST_OPENED_KEY, flowId);
}
export async function readLastOpenedFlow() {
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
export async function createRun(runId, flowId) {
    const database = getDB();
    database
        .prepare("insert into runs(id,flow_id,status) values(?,?,?)")
        .run(runId, flowId, "created");
}
export function updateRunStatus(runId, status) {
    const database = getDB();
    const ended = status === "done" || status === "error" ? ", ended_at=strftime('%s','now')" : "";
    database
        .prepare(`update runs set status=? ${ended} where id=?`)
        .run(status, runId);
}
export async function recordRunLog(ev) {
    emitTelemetry(ev);
}
export async function savePayload(runId, nodeId, port, payload) {
    const database = getDB();
    database
        .prepare("insert into payloads(run_id,node_id,port,kind,body) values(?,?,?,?,?)")
        .run(runId, nodeId, port, payload.kind, JSON.stringify(payload));
}
export async function getPayloadsForRun(runId) {
    const database = getDB();
    const rows = database
        .prepare("select node_id,port,kind,body,created_at from payloads where run_id=? order by id asc")
        .all(runId);
    return rows.map((r) => ({ nodeId: r.node_id, port: r.port, payload: JSON.parse(r.body) }));
}
export async function insertLogEntry(runId, nodeId, tag, payload) {
    const database = getDB();
    database
        .prepare("insert into logs(run_id,node_id,tag,body) values(?,?,?,?)")
        .run(runId, nodeId, tag ?? null, JSON.stringify(payload ?? null));
}
export async function readMemory(namespace, key) {
    const database = getDB();
    const row = database
        .prepare("select value from memory where namespace=? and key=?")
        .get(namespace, key);
    return row && typeof row.value === "string" ? row.value : null;
}
export async function writeMemory(namespace, key, value) {
    const database = getDB();
    database
        .prepare("insert into memory(namespace,key,value,updated_at) values(?,?,?,strftime('%s','now')) " +
        "on conflict(namespace,key) do update set value=excluded.value, updated_at=strftime('%s','now')")
        .run(namespace, key, value);
}
export async function appendMemory(namespace, key, value) {
    const database = getDB();
    const existing = await readMemory(namespace, key);
    const combined = existing ? `${existing}\n${value}` : value;
    await writeMemory(namespace, key, combined);
    return combined;
}
