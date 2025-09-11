import { globalTypeRegistry } from "../runtime/types.js";
function sampleValue(type) {
    switch (type) {
        case "UserText":
        case "PromptText":
        case "LLMText":
            return { text: "" };
        case "AnyBlob":
            return { data: new Uint8Array() };
        default:
            if (type.startsWith("ext:"))
                return { data: new Uint8Array() };
            throw new Error(`Unknown type: ${type}`);
    }
}
export class NodeRegistry {
    handlers = new Map();
    register(handler) {
        // validate port types
        for (const t of [
            ...Object.values(handler.inPorts),
            ...Object.values(handler.outPorts),
        ]) {
            const sample = sampleValue(t);
            globalTypeRegistry.encode(t, sample);
        }
        this.handlers.set(handler.kind, handler);
    }
    get(kind) {
        const h = this.handlers.get(kind);
        if (!h)
            throw new Error(`Unknown handler kind: ${kind}`);
        return h;
    }
}
export function makeContext(logger) {
    return {
        inputs: {},
        outputs: {},
        log: logger,
    };
}
