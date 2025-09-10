import type { PayloadT, RunLog } from "@voide/shared";
export declare function initDB(): Promise<void>;
export declare function getDB(): Database;
export declare function createRun(runId: string, flowId: string): Promise<void>;
export declare function updateRunStatus(runId: string, status: string): void;
export declare function recordRunLog(log: RunLog): Promise<void>;
export declare function savePayload(runId: string, nodeId: string, port: string, payload: PayloadT): Promise<void>;
export declare function getPayloadsForRun(runId: string): Promise<any>;
