export type Severity = "OK" | "DEGRADED" | "VIOLATION" | "ERROR";
export interface Envelope<T = unknown> {
    id: string;
    ts: string;
    mime?: string;
    kind: "text" | "any" | "tool_call" | "binary";
    payload: T | string | Buffer;
    status: {
        severity: Severity;
        reason?: string;
    };
    meta: Record<string, string>;
}
export declare function okText(text: string, meta?: Record<string, string>): Envelope<string>;
export declare function degraded<T>(e: Envelope<T>, reason: string): Envelope<T>;
export declare function violation<T>(e: Envelope<T>, reason: string): Envelope<T>;
export declare function clone<T>(e: Envelope<T>): Envelope<T>;
