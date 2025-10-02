import * as pb from "../proto/voide/v1/flow.js";
export type UserText = pb.UserText;
export type PromptText = pb.PromptText;
export type LLMText = pb.LLMText;
export type AnyBlob = pb.AnyBlob;
export type BuiltinType = "UserText" | "PromptText" | "LLMText" | "AnyBlob";
export type TypeName = BuiltinType | `ext:${string}`;
export interface Codec<T> {
    encode(value: T): Uint8Array;
    decode(bytes: Uint8Array): T;
}
export declare class TypeRegistry {
    private codecs;
    constructor();
    register<T>(name: TypeName, codec: Codec<T>): void;
    private resolve;
    encode<T>(name: TypeName, value: T): Uint8Array;
    decode<T>(name: TypeName, bytes: Uint8Array): T;
}
export declare const globalTypeRegistry: TypeRegistry;
export declare function encodeType<T>(name: TypeName, value: T): Uint8Array;
export declare function decodeType<T>(name: TypeName, bytes: Uint8Array): T;
