import Database from "better-sqlite3";
export class MemoryDB {
    db;
    constructor(file = ":memory:") {
        this.db = new Database(file);
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
