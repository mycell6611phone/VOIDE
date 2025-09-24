import _m0 from "protobufjs/minimal.js";
import { Empty } from "./google/protobuf/empty.js";
export declare const protobufPackage = "voide.flow";
export interface Text {
    value: string;
}
export interface Json {
    value: Uint8Array;
}
export interface Embedding {
    values: number[];
}
export interface Payload {
    text?: Text | undefined;
    json?: Json | undefined;
    embedding?: Embedding | undefined;
    meta: {
        [key: string]: string;
    };
    traceId: string;
    schemaVersion: number;
}
export interface Payload_MetaEntry {
    key: string;
    value: string;
}
export interface Port {
    nodeId: string;
    port: string;
}
export interface Edge {
    from: Port | undefined;
    to: Port | undefined;
}
export interface NodeParam {
    key: string;
    value: string;
}
export interface Node {
    id: string;
    /** "ui" | "prompt" | "memory" | "llm" */
    type: string;
    params: NodeParam[];
    inPorts: string[];
    outPorts: string[];
}
export interface FlowDef {
    id: string;
    nodes: Node[];
    edges: Edge[];
    version: number;
}
export declare const Text: {
    encode(message: Text, writer?: _m0.Writer): _m0.Writer;
    decode(input: _m0.Reader | Uint8Array, length?: number): Text;
    fromJSON(object: any): Text;
    toJSON(message: Text): unknown;
    create<I extends Exact<DeepPartial<Text>, I>>(base?: I): Text;
    fromPartial<I extends Exact<DeepPartial<Text>, I>>(object: I): Text;
};
export declare const Json: {
    encode(message: Json, writer?: _m0.Writer): _m0.Writer;
    decode(input: _m0.Reader | Uint8Array, length?: number): Json;
    fromJSON(object: any): Json;
    toJSON(message: Json): unknown;
    create<I extends Exact<DeepPartial<Json>, I>>(base?: I): Json;
    fromPartial<I extends Exact<DeepPartial<Json>, I>>(object: I): Json;
};
export declare const Embedding: {
    encode(message: Embedding, writer?: _m0.Writer): _m0.Writer;
    decode(input: _m0.Reader | Uint8Array, length?: number): Embedding;
    fromJSON(object: any): Embedding;
    toJSON(message: Embedding): unknown;
    create<I extends Exact<DeepPartial<Embedding>, I>>(base?: I): Embedding;
    fromPartial<I extends Exact<DeepPartial<Embedding>, I>>(object: I): Embedding;
};
export declare const Payload: {
    encode(message: Payload, writer?: _m0.Writer): _m0.Writer;
    decode(input: _m0.Reader | Uint8Array, length?: number): Payload;
    fromJSON(object: any): Payload;
    toJSON(message: Payload): unknown;
    create<I extends Exact<DeepPartial<Payload>, I>>(base?: I): Payload;
    fromPartial<I extends Exact<DeepPartial<Payload>, I>>(object: I): Payload;
};
export declare const Payload_MetaEntry: {
    encode(message: Payload_MetaEntry, writer?: _m0.Writer): _m0.Writer;
    decode(input: _m0.Reader | Uint8Array, length?: number): Payload_MetaEntry;
    fromJSON(object: any): Payload_MetaEntry;
    toJSON(message: Payload_MetaEntry): unknown;
    create<I extends Exact<DeepPartial<Payload_MetaEntry>, I>>(base?: I): Payload_MetaEntry;
    fromPartial<I extends Exact<DeepPartial<Payload_MetaEntry>, I>>(object: I): Payload_MetaEntry;
};
export declare const Port: {
    encode(message: Port, writer?: _m0.Writer): _m0.Writer;
    decode(input: _m0.Reader | Uint8Array, length?: number): Port;
    fromJSON(object: any): Port;
    toJSON(message: Port): unknown;
    create<I extends Exact<DeepPartial<Port>, I>>(base?: I): Port;
    fromPartial<I extends Exact<DeepPartial<Port>, I>>(object: I): Port;
};
export declare const Edge: {
    encode(message: Edge, writer?: _m0.Writer): _m0.Writer;
    decode(input: _m0.Reader | Uint8Array, length?: number): Edge;
    fromJSON(object: any): Edge;
    toJSON(message: Edge): unknown;
    create<I extends Exact<DeepPartial<Edge>, I>>(base?: I): Edge;
    fromPartial<I extends Exact<DeepPartial<Edge>, I>>(object: I): Edge;
};
export declare const NodeParam: {
    encode(message: NodeParam, writer?: _m0.Writer): _m0.Writer;
    decode(input: _m0.Reader | Uint8Array, length?: number): NodeParam;
    fromJSON(object: any): NodeParam;
    toJSON(message: NodeParam): unknown;
    create<I extends Exact<DeepPartial<NodeParam>, I>>(base?: I): NodeParam;
    fromPartial<I extends Exact<DeepPartial<NodeParam>, I>>(object: I): NodeParam;
};
export declare const Node: {
    encode(message: Node, writer?: _m0.Writer): _m0.Writer;
    decode(input: _m0.Reader | Uint8Array, length?: number): Node;
    fromJSON(object: any): Node;
    toJSON(message: Node): unknown;
    create<I extends Exact<DeepPartial<Node>, I>>(base?: I): Node;
    fromPartial<I extends Exact<DeepPartial<Node>, I>>(object: I): Node;
};
export declare const FlowDef: {
    encode(message: FlowDef, writer?: _m0.Writer): _m0.Writer;
    decode(input: _m0.Reader | Uint8Array, length?: number): FlowDef;
    fromJSON(object: any): FlowDef;
    toJSON(message: FlowDef): unknown;
    create<I extends Exact<DeepPartial<FlowDef>, I>>(base?: I): FlowDef;
    fromPartial<I extends Exact<DeepPartial<FlowDef>, I>>(object: I): FlowDef;
};
export type EngineDefinition = typeof EngineDefinition;
export declare const EngineDefinition: {
    readonly name: "Engine";
    readonly fullName: "voide.flow.Engine";
    readonly methods: {
        readonly runFlow: {
            readonly name: "RunFlow";
            readonly requestType: {
                encode(message: FlowDef, writer?: _m0.Writer): _m0.Writer;
                decode(input: _m0.Reader | Uint8Array, length?: number): FlowDef;
                fromJSON(object: any): FlowDef;
                toJSON(message: FlowDef): unknown;
                create<I extends Exact<DeepPartial<FlowDef>, I>>(base?: I): FlowDef;
                fromPartial<I extends Exact<DeepPartial<FlowDef>, I>>(object: I): FlowDef;
            };
            readonly requestStream: false;
            readonly responseType: {
                encode(message: Payload, writer?: _m0.Writer): _m0.Writer;
                decode(input: _m0.Reader | Uint8Array, length?: number): Payload;
                fromJSON(object: any): Payload;
                toJSON(message: Payload): unknown;
                create<I extends Exact<DeepPartial<Payload>, I>>(base?: I): Payload;
                fromPartial<I extends Exact<DeepPartial<Payload>, I>>(object: I): Payload;
            };
            readonly responseStream: true;
            readonly options: {};
        };
        readonly push: {
            readonly name: "Push";
            readonly requestType: {
                encode(message: Payload, writer?: _m0.Writer): _m0.Writer;
                decode(input: _m0.Reader | Uint8Array, length?: number): Payload;
                fromJSON(object: any): Payload;
                toJSON(message: Payload): unknown;
                create<I extends Exact<DeepPartial<Payload>, I>>(base?: I): Payload;
                fromPartial<I extends Exact<DeepPartial<Payload>, I>>(object: I): Payload;
            };
            readonly requestStream: false;
            readonly responseType: {
                encode(message: Payload, writer?: _m0.Writer): _m0.Writer;
                decode(input: _m0.Reader | Uint8Array, length?: number): Payload;
                fromJSON(object: any): Payload;
                toJSON(message: Payload): unknown;
                create<I extends Exact<DeepPartial<Payload>, I>>(base?: I): Payload;
                fromPartial<I extends Exact<DeepPartial<Payload>, I>>(object: I): Payload;
            };
            readonly responseStream: false;
            readonly options: {};
        };
    };
};
export type LLMDefinition = typeof LLMDefinition;
export declare const LLMDefinition: {
    readonly name: "LLM";
    readonly fullName: "voide.flow.LLM";
    readonly methods: {
        readonly complete: {
            readonly name: "Complete";
            readonly requestType: {
                encode(message: Payload, writer?: _m0.Writer): _m0.Writer;
                decode(input: _m0.Reader | Uint8Array, length?: number): Payload;
                fromJSON(object: any): Payload;
                toJSON(message: Payload): unknown;
                create<I extends Exact<DeepPartial<Payload>, I>>(base?: I): Payload;
                fromPartial<I extends Exact<DeepPartial<Payload>, I>>(object: I): Payload;
            };
            readonly requestStream: false;
            readonly responseType: {
                encode(message: Payload, writer?: _m0.Writer): _m0.Writer;
                decode(input: _m0.Reader | Uint8Array, length?: number): Payload;
                fromJSON(object: any): Payload;
                toJSON(message: Payload): unknown;
                create<I extends Exact<DeepPartial<Payload>, I>>(base?: I): Payload;
                fromPartial<I extends Exact<DeepPartial<Payload>, I>>(object: I): Payload;
            };
            readonly responseStream: false;
            readonly options: {};
        };
    };
};
export type MemoryDefinition = typeof MemoryDefinition;
export declare const MemoryDefinition: {
    readonly name: "Memory";
    readonly fullName: "voide.flow.Memory";
    readonly methods: {
        /**
         * Two inputs one output design
         * write: persist only, no emit
         */
        readonly write: {
            readonly name: "Write";
            readonly requestType: {
                encode(message: Payload, writer?: _m0.Writer): _m0.Writer;
                decode(input: _m0.Reader | Uint8Array, length?: number): Payload;
                fromJSON(object: any): Payload;
                toJSON(message: Payload): unknown;
                create<I extends Exact<DeepPartial<Payload>, I>>(base?: I): Payload;
                fromPartial<I extends Exact<DeepPartial<Payload>, I>>(object: I): Payload;
            };
            readonly requestStream: false;
            readonly responseType: {
                encode(_: Empty, writer?: _m0.Writer): _m0.Writer;
                decode(input: _m0.Reader | Uint8Array, length?: number): Empty;
                fromJSON(_: any): Empty;
                toJSON(_: Empty): unknown;
                create<I extends import("./google/protobuf/empty.js").Exact<import("./google/protobuf/empty.js").DeepPartial<Empty>, I>>(base?: I): Empty;
                fromPartial<I extends import("./google/protobuf/empty.js").Exact<import("./google/protobuf/empty.js").DeepPartial<Empty>, I>>(_: I): Empty;
            };
            readonly responseStream: false;
            readonly options: {};
        };
        /** stream: retrieve and enrich, emit on out */
        readonly retrieve: {
            readonly name: "Retrieve";
            readonly requestType: {
                encode(message: Payload, writer?: _m0.Writer): _m0.Writer;
                decode(input: _m0.Reader | Uint8Array, length?: number): Payload;
                fromJSON(object: any): Payload;
                toJSON(message: Payload): unknown;
                create<I extends Exact<DeepPartial<Payload>, I>>(base?: I): Payload;
                fromPartial<I extends Exact<DeepPartial<Payload>, I>>(object: I): Payload;
            };
            readonly requestStream: false;
            readonly responseType: {
                encode(message: Payload, writer?: _m0.Writer): _m0.Writer;
                decode(input: _m0.Reader | Uint8Array, length?: number): Payload;
                fromJSON(object: any): Payload;
                toJSON(message: Payload): unknown;
                create<I extends Exact<DeepPartial<Payload>, I>>(base?: I): Payload;
                fromPartial<I extends Exact<DeepPartial<Payload>, I>>(object: I): Payload;
            };
            readonly responseStream: false;
            readonly options: {};
        };
    };
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
//# sourceMappingURL=flow.d.ts.map