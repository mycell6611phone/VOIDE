export declare const EVENT_HEADER_SIZE = 24;
export declare const TELEMETRY_VERSION = 1;
export declare enum TelemetryEventType {
    Heartbeat = 0,
    NodeStart = 1,
    NodeEnd = 2,
    WireTransfer = 3,
    SchemaWarn = 4,
    Stalled = 5,
    AckClear = 6
}
export type TelemetryPayload = {
    id?: string;
    span?: string;
    pkt?: number;
    from?: string;
    to?: string;
    outPort?: string;
    inPort?: string;
    ok?: boolean;
    reason?: string;
};
export interface TelemetryEventInput {
    type: TelemetryEventType;
    timestampNs?: bigint;
    payload?: TelemetryPayload;
}
export interface TelemetryEventFrame extends TelemetryEventInput {
    timestampNs: bigint;
    payload: TelemetryPayload;
}
export declare function encodeTelemetryFrame(event: TelemetryEventInput): Uint8Array;
export declare function decodeTelemetryFrame(data: Uint8Array): TelemetryEventFrame;
//# sourceMappingURL=telemetry.d.ts.map