import _m0 from "protobufjs/minimal.js";
export declare const protobufPackage = "voide.modules.llm.v1";
export interface ParamValue {
    stringValue?: string | undefined;
    doubleValue?: number | undefined;
    intValue?: number | undefined;
    boolValue?: boolean | undefined;
}
export interface PromptMsg {
    role: PromptMsg_Role;
    content: string;
}
export declare enum PromptMsg_Role {
    ROLE_UNSPECIFIED = 0,
    ROLE_SYSTEM = 1,
    ROLE_USER = 2,
    ROLE_ASSISTANT = 3,
    UNRECOGNIZED = -1
}
export declare function promptMsg_RoleFromJSON(object: any): PromptMsg_Role;
export declare function promptMsg_RoleToJSON(object: PromptMsg_Role): string;
export interface LLMConfig {
    adapter: string;
    modelId: string;
    temperature: number;
    maxTokens: number;
    runtime: string;
    prompts: PromptMsg[];
    params: {
        [key: string]: ParamValue;
    };
}
export interface LLMConfig_ParamsEntry {
    key: string;
    value: ParamValue | undefined;
}
export declare const ParamValue: {
    encode(message: ParamValue, writer?: _m0.Writer): _m0.Writer;
    decode(input: _m0.Reader | Uint8Array, length?: number): ParamValue;
    fromJSON(object: any): ParamValue;
    toJSON(message: ParamValue): unknown;
    create<I extends Exact<DeepPartial<ParamValue>, I>>(base?: I): ParamValue;
    fromPartial<I extends Exact<DeepPartial<ParamValue>, I>>(object: I): ParamValue;
};
export declare const PromptMsg: {
    encode(message: PromptMsg, writer?: _m0.Writer): _m0.Writer;
    decode(input: _m0.Reader | Uint8Array, length?: number): PromptMsg;
    fromJSON(object: any): PromptMsg;
    toJSON(message: PromptMsg): unknown;
    create<I extends Exact<DeepPartial<PromptMsg>, I>>(base?: I): PromptMsg;
    fromPartial<I extends Exact<DeepPartial<PromptMsg>, I>>(object: I): PromptMsg;
};
export declare const LLMConfig: {
    encode(message: LLMConfig, writer?: _m0.Writer): _m0.Writer;
    decode(input: _m0.Reader | Uint8Array, length?: number): LLMConfig;
    fromJSON(object: any): LLMConfig;
    toJSON(message: LLMConfig): unknown;
    create<I extends Exact<DeepPartial<LLMConfig>, I>>(base?: I): LLMConfig;
    fromPartial<I extends Exact<DeepPartial<LLMConfig>, I>>(object: I): LLMConfig;
};
export declare const LLMConfig_ParamsEntry: {
    encode(message: LLMConfig_ParamsEntry, writer?: _m0.Writer): _m0.Writer;
    decode(input: _m0.Reader | Uint8Array, length?: number): LLMConfig_ParamsEntry;
    fromJSON(object: any): LLMConfig_ParamsEntry;
    toJSON(message: LLMConfig_ParamsEntry): unknown;
    create<I extends Exact<DeepPartial<LLMConfig_ParamsEntry>, I>>(base?: I): LLMConfig_ParamsEntry;
    fromPartial<I extends Exact<DeepPartial<LLMConfig_ParamsEntry>, I>>(object: I): LLMConfig_ParamsEntry;
};
type Builtin = Date | Function | Uint8Array | string | number | boolean | undefined;
export type DeepPartial<T> = T extends Builtin ? T : T extends globalThis.Array<infer U> ? globalThis.Array<DeepPartial<U>> : T extends ReadonlyArray<infer U> ? ReadonlyArray<DeepPartial<U>> : T extends {} ? {
    [K in keyof T]?: DeepPartial<T[K]>;
} : Partial<T>;
type KeysOfUnion<T> = T extends T ? keyof T : never;
export type Exact<P, I extends P> = P extends Builtin ? P : P & {
    [K in keyof P]: Exact<P[K], I[K]>;
} & {
    [K in Exclude<keyof I, KeysOfUnion<P>>]: never;
};
export {};
