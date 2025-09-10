<<<<<<< ours
import { UserText, PromptText, LLMText, AnyBlob } from '../proto';

type MessageType<T> = {
  encode(message: T): Uint8Array;
  decode(data: Uint8Array): T;
};

export class TypeRegistry {
  private types = new Map<string, MessageType<any>>();

  constructor() {
    this.register('UserText', UserText);
    this.register('PromptText', PromptText);
    this.register('LLMText', LLMText);
    this.register('AnyBlob', AnyBlob);
  }

  register<T>(name: string, type: MessageType<T>): void {
    this.types.set(name, type);
  }

  encode(name: string, value: any): Uint8Array {
    const type = this.types.get(name);
    if (type) {
      return type.encode(value);
    }
    if (name.startsWith('ext:')) {
      const json = JSON.stringify(value);
      return new TextEncoder().encode(json);
=======
// Runtime type registry mapping logical port type names to protobuf-style
// message codecs. In this simplified environment we model the protobuf
// messages as plain TypeScript interfaces and provide encode/decode helpers
// that operate on Uint8Array payloads.

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

export type BuiltinType =
  | "UserText"
  | "PromptText"
  | "LLMText"
  | "AnyBlob";

export type TypeName = BuiltinType | `ext:${string}`;

/** Codec capable of encoding/decoding a message to/from bytes. */
export interface Codec<T> {
  encode(value: T): Uint8Array;
  decode(bytes: Uint8Array): T;
}

/**
 * Construct a simple codec for text based messages that consist of a single
 * `text` field.
 */
function makeTextCodec<T extends { text: string }>(): Codec<T> {
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();
  return {
    encode(value: T): Uint8Array {
      return encoder.encode(value.text);
    },
    decode(bytes: Uint8Array): T {
      return { text: decoder.decode(bytes) } as T;
    },
  };
}

const anyBlobCodec: Codec<AnyBlob> = {
  encode(value: AnyBlob): Uint8Array {
    return value.data;
  },
  decode(bytes: Uint8Array): AnyBlob {
    return { data: bytes };
  },
};

/** Registry for looking up codecs by logical type name. */
export class TypeRegistry {
  private codecs = new Map<string, Codec<any>>();

  constructor() {
    // Register built-in types.
    this.codecs.set("UserText", makeTextCodec<UserText>());
    this.codecs.set("PromptText", makeTextCodec<PromptText>());
    this.codecs.set("LLMText", makeTextCodec<LLMText>());
    this.codecs.set("AnyBlob", anyBlobCodec);
  }

  /** Register a codec for the given logical type name. */
  register<T>(name: TypeName, codec: Codec<T>): void {
    this.codecs.set(name, codec);
  }

  /** Resolve a codec for the given type name, handling ext:* fallbacks. */
  private resolve(name: TypeName): Codec<any> {
    const found = this.codecs.get(name);
    if (found) return found;
    if (name.startsWith("ext:")) {
      const blob = this.codecs.get("AnyBlob");
      if (blob) return blob;
>>>>>>> theirs
    }
    throw new Error(`Unknown type: ${name}`);
  }

<<<<<<< ours
  decode<T>(name: string, data: Uint8Array): T {
    const type = this.types.get(name);
    if (type) {
      return type.decode(data);
    }
    if (name.startsWith('ext:')) {
      const json = new TextDecoder().decode(data);
      return JSON.parse(json);
    }
    throw new Error(`Unknown type: ${name}`);
  }
}

=======
  /** Encode a value using the codec for the given logical type name. */
  encode<T>(name: TypeName, value: T): Uint8Array {
    return this.resolve(name).encode(value);
  }

  /** Decode bytes into a typed message for the given logical type name. */
  decode<T>(name: TypeName, bytes: Uint8Array): T {
    return this.resolve(name).decode(bytes);
  }
}

// Provide a default global registry with built-in types registered.
export const globalTypeRegistry = new TypeRegistry();

>>>>>>> theirs
