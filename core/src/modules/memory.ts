import Database from "better-sqlite3";

export class MemoryDB {
  private db: Database.Database;

  constructor(file: string = ":memory:") {
    this.db = new Database(file);
    this.db.exec(
      "CREATE VIRTUAL TABLE IF NOT EXISTS memory USING fts5(id, text)"
    );
  }

  append(id: string, text: string): void {
    this.db
      .prepare("INSERT INTO memory(id, text) VALUES (?, ?)")
      .run(id, text);
  }

  replace(id: string, text: string): void {
    this.db.prepare("DELETE FROM memory WHERE id = ?").run(id);
    this.append(id, text);
  }

  retrieve(query: string, limit = 5): string[] {
    const stmt = this.db.prepare(
      "SELECT text FROM memory WHERE memory MATCH ? LIMIT ?"
    );
    return stmt.all(query, limit).map((r: any) => r.text);
  }
}

