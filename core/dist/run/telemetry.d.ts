type UdpFallback = {
    type: "udp";
    port: number;
    host?: string;
};
type UdsFallback = {
    type: "uds";
    path: string;
};
export declare const enum TelemetryEventType {
    NodeStart = 1,
    NodeEnd = 2,
    WireTx = 3,
    SchemaWarn = 4,
    Stalled = 5,
    AckClear = 6
}
export interface TelemetryPayload {
    id?: string;
    span?: string;
    pkt?: string;
    from?: string;
    to?: string;
    outPort?: string;
    inPort?: string;
    ok?: boolean;
    reason?: string;
    [key: string]: unknown;
}
export interface TelemetryEvt {
    type: TelemetryEventType;
    payload: TelemetryPayload;
    tsNs?: bigint | number;
}
export interface TelemetryInitOptions {
    path?: string;
    sizeMB?: number;
    heartbeatIntervalMs?: number;
    fallback?: UdpFallback | UdsFallback;
}
export declare function initTelemetry(options?: TelemetryInitOptions): void;
export declare function emit(evt: TelemetryEvt): void;
export declare function heartbeat(): void;
export declare function telemetryActive(): boolean;
export declare function resolveTelemetryRingPath(): string;
export declare function shutdownTelemetry(): void;
export {};
