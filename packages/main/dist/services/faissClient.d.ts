export declare class FaissClient {
    host: string;
    constructor(host?: string);
    upsert(_collection: string, _vectors: number[][]): Promise<{
        upserted: number;
    }>;
    query(_collection: string, _vec: number[], _k: number): Promise<{
        ids: string[];
        scores: number[];
    }>;
}
