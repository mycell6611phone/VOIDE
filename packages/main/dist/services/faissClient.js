"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FaissClient = void 0;
class FaissClient {
    host;
    constructor(host = "127.0.0.1:50051") {
        this.host = host;
    }
    async upsert(_collection, _vectors) { return { upserted: _vectors.length }; }
    async query(_collection, _vec, _k) { return { ids: ["doc-0"], scores: [0.99] }; }
}
exports.FaissClient = FaissClient;
