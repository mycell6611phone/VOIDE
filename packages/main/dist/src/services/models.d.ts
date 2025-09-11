export type ModelStatus = "installed" | "available-local" | "unavailable-offline" | "blocked-license";
export interface RegistryModel {
    id: string;
    name: string;
    backend: string;
    filename: string;
    sha256: string;
    sizeBytes: number;
    license?: string;
    url?: string;
}
export interface RegistryResponse {
    models: (RegistryModel & {
        status: ModelStatus;
    })[];
}
export declare function getModelRegistry(): Promise<RegistryResponse>;
export declare function installModel(id: string, onProgress?: (p: {
    id: string;
    loaded: number;
    total: number;
}) => void): Promise<string>;

