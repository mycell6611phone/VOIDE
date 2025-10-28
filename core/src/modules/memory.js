import fs from "fs";
import path from "path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
let sqliteModule = null;
let loggedBindingWarning = false;
let loggedLoadError = false;

function readMetadata(moduleRoot) {
    const metadataPath = path.join(moduleRoot, "build-electron", "metadata.json");
    if (!fs.existsSync(metadataPath)) {
        return null;
    }
    try {
        const raw = fs.readFileSync(metadataPath, "utf8");
        return JSON.parse(raw);
    }
    catch (error) {
        if (!loggedBindingWarning) {
            loggedBindingWarning = true;
            console.warn("[voide] Unable to parse better-sqlite3 Electron metadata.");
            if (error instanceof Error) {
                console.warn(error.message);
            }
        }
        return null;
    }
}

function ensureElectronBinding() {
    if (!process.versions?.electron) {
        return;
    }
    if (process.env.BETTER_SQLITE3_PATH && fs.existsSync(process.env.BETTER_SQLITE3_PATH)) {
        return;
    }
    try {
        const pkgPath = require.resolve("better-sqlite3/package.json");
        const moduleRoot = path.dirname(pkgPath);
        const candidate = path.join(moduleRoot, "build-electron", "Release", "better_sqlite3.node");
        if (fs.existsSync(candidate)) {
            const metadata = readMetadata(moduleRoot);
            const electronVersion = process.versions?.electron;
            if (metadata) {
                const targetPlatform = typeof metadata.platform === "string" ? metadata.platform : null;
                const targetArch = typeof metadata.arch === "string" ? metadata.arch : null;
                const targetVersion = typeof metadata.target === "string" ? metadata.target : null;
                if ((targetPlatform && targetPlatform !== process.platform) || (targetArch && targetArch !== process.arch)) {
                    if (!loggedBindingWarning) {
                        loggedBindingWarning = true;
                        console.warn(
                            `[voide] Electron better-sqlite3 binary targets ${targetPlatform ?? "?"}/${targetArch ?? "?"} but runtime is ${process.platform}/${process.arch}.`
                        );
                    }
                    return;
                }
                if (targetVersion && electronVersion && targetVersion !== electronVersion) {
                    if (!loggedBindingWarning) {
                        loggedBindingWarning = true;
                        console.warn(
                            `[voide] Electron better-sqlite3 binary targets Electron ${targetVersion} but runtime is ${electronVersion}.`
                        );
                    }
                    return;
                }
            }
            process.env.BETTER_SQLITE3_PATH = path.resolve(candidate);
            return;
        }
        if (!loggedBindingWarning) {
            loggedBindingWarning = true;
            console.warn(
                `[voide] Electron-specific better-sqlite3 binary is missing at ${candidate}. ` +
                    "Run 'pnpm run native:prepare' before launching the Electron app."
            );
        }
    }
    catch (error) {
        if (!loggedBindingWarning) {
            loggedBindingWarning = true;
            console.warn("[voide] Unable to resolve better-sqlite3 package for Electron runtime.");
            if (error instanceof Error) {
                console.warn(error.message);
            }
        }
    }
}

function loadBetterSqlite3() {
    if (sqliteModule) {
        return sqliteModule;
    }
    ensureElectronBinding();
    try {
        const loaded = require("better-sqlite3");
        sqliteModule = loaded;
        return loaded;
    }
    catch (error) {
        if (process.versions?.electron && !loggedLoadError) {
            loggedLoadError = true;
            console.error(
                "[voide] Failed to load better-sqlite3 inside the Electron runtime. Run 'pnpm run native:prepare' to rebuild native bindings.",
                error instanceof Error ? error : undefined
            );
        }
        throw error;
    }
}

export class MemoryDB {
    db;
    constructor(file = ":memory:") {
        const DatabaseCtor = loadBetterSqlite3();
        this.db = new DatabaseCtor(file);
        this.db.exec("CREATE VIRTUAL TABLE IF NOT EXISTS memory USING fts5(id, text)");
    }
    append(id, text) {
        this.db
            .prepare("INSERT INTO memory(id, text) VALUES (?, ?)")
            .run(id, text);
    }
    replace(id, text) {
        this.db.prepare("DELETE FROM memory WHERE id = ?").run(id);
        this.append(id, text);
    }
    retrieve(query, limit = 5) {
        const stmt = this.db.prepare("SELECT text FROM memory WHERE memory MATCH ? LIMIT ?");
        return stmt.all(query, limit).map((r) => r.text);
    }
}
