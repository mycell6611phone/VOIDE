// Placeholder FAISS client that performs no real operations.
export class FaissClient {
  constructor(public host = "127.0.0.1:50051") {}
  async upsert(_collection: string, _vectors: number[][]): Promise<any> {
    return { upserted: 0 };
  }
  async query(_collection: string, _vec: number[], _k: number): Promise<any> {
    return { ids: [], scores: [] };
  }
}
