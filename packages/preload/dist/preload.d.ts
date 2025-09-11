export type VoideAPI = {
    openFlow: () => Promise<unknown>;
    saveFlow: (flow: unknown, filePath?: string) => Promise<unknown>;
    validateFlow: (flow: unknown) => Promise<unknown>;
    listModels: () => Promise<unknown>;
    getNodeCatalog: () => Promise<unknown>;
    runFlow: (flow: unknown) => Promise<unknown>;
    stopFlow: (runId: string) => Promise<unknown>;
    stepFlow: (runId: string) => Promise<unknown>;
    getLastRunPayloads: (runId: string) => Promise<unknown>;
    secretSet: (scope: string, key: string, value: string) => Promise<unknown>;
    secretGet: (scope: string, key: string) => Promise<unknown>;
};
declare global {
    interface Window {
        voide: VoideAPI;
    }
}
