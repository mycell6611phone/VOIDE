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

export interface Codec<T> {
  encode(value: T): Uint8Array;
  decode(bytes: Uint8Array): T;
}

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

export class TypeRegistry {
  private codecs = new Map<string, Codec<any>>();

  constructor() {
    this.codecs.set("UserText", makeTextCodec<UserText>());
    this.codecs.set("PromptText", makeTextCodec<PromptText>());
    this.codecs.set("LLMText", makeTextCodec<LLMText>());
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

