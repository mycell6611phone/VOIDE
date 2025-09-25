export type Role = 'system' | 'user' | 'assistant';
export interface TextPayload {
    kind: 'text';
    text: string;
    rawInput?: string;
}
export type PayloadT = TextPayload | {
    kind: 'json';
    value: unknown;
} | {
    kind: 'messages';
    messages: {
        role: Role;
        content: string;
    }[];
} | {
    kind: 'vector';
    values: number[];
} | {
    kind: 'file';
    path: string;
    mime: string;
} | {
    kind: 'code';
    language: string;
    text: string;
} | {
    kind: 'metrics';
    data: Record<string, number>;
};
export interface PortDef {
    port: string;
    types: string[];
}
export interface NodeDef {
    id: string;
    type: string;
    name: string;
    params: Record<string, unknown>;
    in: PortDef[];
    out: PortDef[];
}
export interface EdgeDef {
    id: string;
    from: [string, string];
    to: [string, string];
    label?: string;
}
export interface FlowDef {
    id: string;
    version: string;
    nodes: NodeDef[];
    edges: EdgeDef[];
    prompts?: unknown;
    models?: unknown;
    profiles?: unknown;
}
export type RuntimeProfile = 'CPU' | 'CUDA';
export interface LLMParams {
    adapter: 'llama.cpp' | 'gpt4all' | 'mock';
    modelId: string;
    temperature: number;
    maxTokens: number;
    runtime: RuntimeProfile;
    includeRawInput?: boolean;
}
export interface LoopParams {
    maxIters: number;
    stopOn?: string;
}
//# sourceMappingURL=types.d.ts.map