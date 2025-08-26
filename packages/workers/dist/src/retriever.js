"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = retr;
async function retr(job) {
    const ids = [];
    const scores = [];
    for (let i = 0; i < job.topK; i++) {
        ids.push(`doc-${i}`);
        scores.push(1 - i / job.topK);
    }
    return { ids, scores };
}
module.exports = retr;
