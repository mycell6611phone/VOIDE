export declare class MemoryDB {
    private db;
    constructor(file?: string);
    append(id: string, text: string): void;
    replace(id: string, text: string): void;
    retrieve(query: string, limit?: number): string[];
}
