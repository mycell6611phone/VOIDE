export class FaissClient {
  constructor(public host = "127.0.0.1:50051") {}
  async upsert(_collection: string, _vectors: number[][]) { return { upserted: _vectors.length }; }
  async query(_collection: string, _vec: number[], _k: number) { return { ids: ["doc-0"], scores: [0.99] }; }
}
