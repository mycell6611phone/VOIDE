"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FaissClient = void 0;
class FaissClient {
    constructor(host = "127.0.0.1:50051") {
        this.host = host;
    }
    async upsert(_collection, _vectors) { return { upserted: 0 }; }
    async query(_collection, _vec, _k) { return { ids: [], scores: [] }; }
}
exports.FaissClient = FaissClient;
