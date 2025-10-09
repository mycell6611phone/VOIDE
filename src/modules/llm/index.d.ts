export interface NodePortDefinition {
    port: string;
    types: readonly string[];
}
export interface ModuleConfiguration {
    model_id?: string | null;
    [key: string]: unknown;
}
export interface ModuleNodeDefinition {
    type: string;
    label: string;
    in: readonly NodePortDefinition[];
    out: readonly NodePortDefinition[];
    getLabel(config?: ModuleConfiguration | null): string;
}
export declare const DEFAULT_LABEL = "LLM";
export declare const inputPorts: {
    port: string;
    types: string[];
}[];
export declare const outputPorts: {
    port: string;
    types: string[];
}[];
export declare const nodeDefinition: ModuleNodeDefinition;
export default nodeDefinition;
//# sourceMappingURL=index.d.ts.map