import { Flow, TelemetryPayload } from "@voide/ipc";
declare const api: {
    validateFlow: (flow: Flow) => Promise<any>;
    runFlow: (flow: Flow) => Promise<any>;
    ensureModel: (modelId: string) => Promise<any>;
    getVersion: () => Promise<any>;
    onTelemetry: (cb: (ev: TelemetryPayload) => void) => void;
    openChatWindow: () => Promise<{
        ok: boolean;
    }>;
};
export type VoideAPI = typeof api;
declare global {
    interface Window {
        voide: VoideAPI;
    }
}
export {};
