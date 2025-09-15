import * as pb from "../proto/voide/v1/flow";
function makeProtoCodec(msg) {
    return {
        encode(value) {
            return msg.encode(value).finish();
        },
        decode(bytes) {
            return msg.decode(bytes);
        },
    };
}
const anyBlobCodec = makeProtoCodec(pb.AnyBlob);
export class TypeRegistry {
    codecs = new Map();
    constructor() {
        this.codecs.set("UserText", makeProtoCodec(pb.UserText));
        this.codecs.set("PromptText", makeProtoCodec(pb.PromptText));
        this.codecs.set("LLMText", makeProtoCodec(pb.LLMText));
        this.codecs.set("AnyBlob", anyBlobCodec);
    }
    register(name, codec) {
        this.codecs.set(name, codec);
    }
    resolve(name) {
        const found = this.codecs.get(name);
        if (found)
            return found;
        if (name.startsWith("ext:")) {
            const blob = this.codecs.get("AnyBlob");
            if (blob)
                return blob;
        }
        throw new Error(`Unknown type: ${name}`);
    }
    encode(name, value) {
        return this.resolve(name).encode(value);
    }
    decode(name, bytes) {
        return this.resolve(name).decode(bytes);
    }
}
export const globalTypeRegistry = new TypeRegistry();
export function encodeType(name, value) {
    return globalTypeRegistry.encode(name, value);
}
export function decodeType(name, bytes) {
    return globalTypeRegistry.decode(name, bytes);
}
