// packages/core/src/envelope.ts
import { randomUUID } from "crypto";

export type Severity = "OK" | "DEGRADED" | "VIOLATION" | "ERROR";

export interface Envelope<T = unknown> {
  id: string;
  ts: string;               // ISO 8601
  mime?: string;
  kind: "text" | "any" | "tool_call" | "binary";
  payload: T | string | Buffer;
  status: { severity: Severity; reason?: string };
  meta: Record<string, string>;
}

export function okText(text: string, meta: Record<string, string> = {}): Envelope<string> {
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

export function degraded<T>(e: Envelope<T>, reason: string): Envelope<T> {
  return { ...e, status: { severity: "DEGRADED", reason } };
}

export function violation<T>(e: Envelope<T>, reason: string): Envelope<T> {
  return { ...e, status: { severity: "VIOLATION", reason } };
}

export function clone<T>(e: Envelope<T>): Envelope<T> {
  return { ...e, meta: { ...e.meta } };
}

