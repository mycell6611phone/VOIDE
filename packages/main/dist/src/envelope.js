"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.okText = okText;
exports.degraded = degraded;
exports.violation = violation;
exports.clone = clone;
// packages/core/src/envelope.ts
const crypto_1 = require("crypto");
function okText(text, meta = {}) {
    return {
        id: (0, crypto_1.randomUUID)(),
        ts: new Date().toISOString(),
        mime: "text/plain",
        kind: "text",
        payload: text,
        status: { severity: "OK" },
        meta
    };
}
function degraded(e, reason) {
    return { ...e, status: { severity: "DEGRADED", reason } };
}
function violation(e, reason) {
    return { ...e, status: { severity: "VIOLATION", reason } };
}
function clone(e) {
    return { ...e, meta: { ...e.meta } };
}
