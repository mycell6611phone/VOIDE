import _m0 from "protobufjs/minimal.js";
export declare const protobufPackage = "voide.v1";
export interface UserText {
    text: string;
}
export interface PromptText {
    text: string;
}
export interface LLMText {
    text: string;
}
export interface AnyBlob {
    data: Uint8Array;
}
export interface Port {
    port: string;
    types: string[];
}
export interface NodePort {
    node: string;
    port: string;
}
export interface Node {
    id: string;
    type: string;
    name: string;
    paramsJson: string;
    in: Port[];
    out: Port[];
}
export interface Edge {
    id: string;
    from: NodePort | undefined;
    to: NodePort | undefined;
    label: string;
    type: string;
}
export interface Flow {
    id: string;
    version: string;
    nodes: Node[];
    edges: Edge[];
}
export declare const UserText: {
    encode(message: UserText, writer?: _m0.Writer): _m0.Writer;
    decode(input: _m0.Reader | Uint8Array, length?: number): UserText;
    fromJSON(object: any): UserText;
    toJSON(message: UserText): unknown;
    create<I extends Exact<DeepPartial<UserText>, I>>(base?: I): UserText;
    fromPartial<I extends Exact<DeepPartial<UserText>, I>>(object: I): UserText;
};
export declare const PromptText: {
    encode(message: PromptText, writer?: _m0.Writer): _m0.Writer;
    decode(input: _m0.Reader | Uint8Array, length?: number): PromptText;
    fromJSON(object: any): PromptText;
    toJSON(message: PromptText): unknown;
    create<I extends Exact<DeepPartial<PromptText>, I>>(base?: I): PromptText;
    fromPartial<I extends Exact<DeepPartial<PromptText>, I>>(object: I): PromptText;
};
export declare const LLMText: {
    encode(message: LLMText, writer?: _m0.Writer): _m0.Writer;
    decode(input: _m0.Reader | Uint8Array, length?: number): LLMText;
    fromJSON(object: any): LLMText;
    toJSON(message: LLMText): unknown;
    create<I extends Exact<DeepPartial<LLMText>, I>>(base?: I): LLMText;
    fromPartial<I extends Exact<DeepPartial<LLMText>, I>>(object: I): LLMText;
};
export declare const AnyBlob: {
    encode(message: AnyBlob, writer?: _m0.Writer): _m0.Writer;
    decode(input: _m0.Reader | Uint8Array, length?: number): AnyBlob;
    fromJSON(object: any): AnyBlob;
    toJSON(message: AnyBlob): unknown;
    create<I extends Exact<DeepPartial<AnyBlob>, I>>(base?: I): AnyBlob;
    fromPartial<I extends Exact<DeepPartial<AnyBlob>, I>>(object: I): AnyBlob;
};
export declare const Port: {
    encode(message: Port, writer?: _m0.Writer): _m0.Writer;
    decode(input: _m0.Reader | Uint8Array, length?: number): Port;
    fromJSON(object: any): Port;
    toJSON(message: Port): unknown;
    create<I extends Exact<DeepPartial<Port>, I>>(base?: I): Port;
    fromPartial<I extends Exact<DeepPartial<Port>, I>>(object: I): Port;
};
export declare const NodePort: {
    encode(message: NodePort, writer?: _m0.Writer): _m0.Writer;
    decode(input: _m0.Reader | Uint8Array, length?: number): NodePort;
    fromJSON(object: any): NodePort;
    toJSON(message: NodePort): unknown;
    create<I extends Exact<DeepPartial<NodePort>, I>>(base?: I): NodePort;
    fromPartial<I extends Exact<DeepPartial<NodePort>, I>>(object: I): NodePort;
};
export declare const Node: {
    encode(message: Node, writer?: _m0.Writer): _m0.Writer;
    decode(input: _m0.Reader | Uint8Array, length?: number): Node;
    fromJSON(object: any): Node;
    toJSON(message: Node): unknown;
    create<I extends Exact<DeepPartial<Node>, I>>(base?: I): Node;
    fromPartial<I extends Exact<DeepPartial<Node>, I>>(object: I): Node;
};
export declare const Edge: {
    encode(message: Edge, writer?: _m0.Writer): _m0.Writer;
    decode(input: _m0.Reader | Uint8Array, length?: number): Edge;
    fromJSON(object: any): Edge;
    toJSON(message: Edge): unknown;
    create<I extends Exact<DeepPartial<Edge>, I>>(base?: I): Edge;
    fromPartial<I extends Exact<DeepPartial<Edge>, I>>(object: I): Edge;
};
export declare const Flow: {
    encode(message: Flow, writer?: _m0.Writer): _m0.Writer;
    decode(input: _m0.Reader | Uint8Array, length?: number): Flow;
    fromJSON(object: any): Flow;
    toJSON(message: Flow): unknown;
    create<I extends Exact<DeepPartial<Flow>, I>>(base?: I): Flow;
    fromPartial<I extends Exact<DeepPartial<Flow>, I>>(object: I): Flow;
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
