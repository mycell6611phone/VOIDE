import * as pb from "../proto/voide/v1/flow.js";

export type UserText = pb.UserText;
export type PromptText = pb.PromptText;
export type LLMText = pb.LLMText;
export type AnyBlob = pb.AnyBlob;

export type BuiltinType =
  | "UserText"
  | "PromptText"
  | "LLMText"
  | "AnyBlob";

export type TypeName = BuiltinType | `ext:${string}`;

export interface Codec<T> {
  encode(value: T): Uint8Array;
  decode(bytes: Uint8Array): T;
}

function makeProtoCodec<T>(
  msg: { encode(value: T, writer?: any): any; decode(bytes: Uint8Array): T }
): Codec<T> {
  return {
    encode(value: T): Uint8Array {
      return msg.encode(value).finish();
    },
    decode(bytes: Uint8Array): T {
      return msg.decode(bytes);
    },
  };
}

const anyBlobCodec = makeProtoCodec<AnyBlob>(pb.AnyBlob);

export class TypeRegistry {
  private codecs = new Map<string, Codec<any>>();

  constructor() {
    this.codecs.set("UserText", makeProtoCodec<UserText>(pb.UserText));
    this.codecs.set("PromptText", makeProtoCodec<PromptText>(pb.PromptText));
    this.codecs.set("LLMText", makeProtoCodec<LLMText>(pb.LLMText));
    this.codecs.set("AnyBlob", anyBlobCodec);
  }

  register<T>(name: TypeName, codec: Codec<T>): void {
    this.codecs.set(name, codec);
  }

  private resolve(name: TypeName): Codec<any> {
    const found = this.codecs.get(name);
    if (found) return found;
    if (name.startsWith("ext:")) {
      const blob = this.codecs.get("AnyBlob");
      if (blob) return blob;
    }
    throw new Error(`Unknown type: ${name}`);
  }

  encode<T>(name: TypeName, value: T): Uint8Array {
    return this.resolve(name).encode(value);
  }

  decode<T>(name: TypeName, bytes: Uint8Array): T {
    return this.resolve(name).decode(bytes);
  }
}

export const globalTypeRegistry = new TypeRegistry();

export function encodeType<T>(name: TypeName, value: T): Uint8Array {
  return globalTypeRegistry.encode(name, value);
}

export function decodeType<T>(name: TypeName, bytes: Uint8Array): T {
  return globalTypeRegistry.decode(name, bytes);
}

