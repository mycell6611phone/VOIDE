"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = vector;
async function vector(job) {
    if (job.op === 'upsert')
        return { upserted: job.vectors?.length ?? 0 };
    if (job.op === 'query')
        return { ids: ['doc-0'], scores: [0.99] };
}
module.exports = vector;
