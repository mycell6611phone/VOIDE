declare class Secrets {
    private filePath;
    constructor();
    set(scope: string, key: string, value: string): Promise<{
        ok: boolean;
        backend: string;
    }>;
    get(scope: string, key: string): Promise<{
        value: string;
    } | {
        value: null;
    }>;
    private k;
}
export declare function getSecretsService(): Secrets;
export {};
