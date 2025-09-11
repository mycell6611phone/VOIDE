// packages/core/src/envelope.ts
import { randomUUID } from "crypto";
export function okText(text, meta = {}) {
    return {
        id: randomUUID(),
        ts: new Date().toISOString(),
        mime: "text/plain",
        kind: "text",
        payload: text,
        status: { severity: "OK" },
        meta
    };
}
export function degraded(e, reason) {
    return { ...e, status: { severity: "DEGRADED", reason } };
}
export function violation(e, reason) {
    return { ...e, status: { severity: "VIOLATION", reason } };
}
export function clone(e) {
    return { ...e, meta: { ...e.meta } };
}
