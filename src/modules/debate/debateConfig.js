export var DebateFormat;
(function (DebateFormat) {
    DebateFormat[DebateFormat["SINGLE_PASS_VALIDATE"] = 0] = "SINGLE_PASS_VALIDATE";
    DebateFormat[DebateFormat["CONCISENESS_MULTI_PASS"] = 1] = "CONCISENESS_MULTI_PASS";
    DebateFormat[DebateFormat["DEBATE_ADD_ON"] = 2] = "DEBATE_ADD_ON";
    DebateFormat[DebateFormat["CUSTOM"] = 3] = "CUSTOM";
})(DebateFormat || (DebateFormat = {}));
const defaultConfig = {
    debateFormat: DebateFormat.SINGLE_PASS_VALIDATE,
    customPrompt: "",
    roundNumber: 1,
    iterativeLoop: false,
    loopTargetModuleId: "",
};
function writeVarint(value, out) {
    while (value > 127) {
        out.push((value & 0x7f) | 0x80);
        value >>>= 7;
    }
    out.push(value);
}
function readVarint(buf, offset) {
    let value = 0;
    let shift = 0;
    let pos = offset;
    while (pos < buf.length) {
        const b = buf[pos++];
        value |= (b & 0x7f) << shift;
        if ((b & 0x80) === 0)
            break;
        shift += 7;
    }
    return [value, pos];
}
export function debateConfigToBytes(cfg) {
    const out = [];
    if (cfg.debateFormat !== 0) {
        writeVarint((1 << 3) | 0, out);
        writeVarint(cfg.debateFormat, out);
    }
    if (cfg.customPrompt !== "") {
        const bytes = new TextEncoder().encode(cfg.customPrompt);
        writeVarint((2 << 3) | 2, out);
        writeVarint(bytes.length, out);
        out.push(...bytes);
    }
    if (cfg.roundNumber !== 0) {
        writeVarint((3 << 3) | 0, out);
        writeVarint(cfg.roundNumber, out);
    }
    if (cfg.iterativeLoop) {
        writeVarint((4 << 3) | 0, out);
        writeVarint(1, out);
    }
    if (cfg.loopTargetModuleId !== "") {
        const bytes = new TextEncoder().encode(cfg.loopTargetModuleId);
        writeVarint((5 << 3) | 2, out);
        writeVarint(bytes.length, out);
        out.push(...bytes);
    }
    return Uint8Array.from(out);
}
export function debateConfigFromBytes(bytes) {
    let cfg = { ...defaultConfig };
    let pos = 0;
    while (pos < bytes.length) {
        const [tag, p] = readVarint(bytes, pos);
        pos = p;
        const field = tag >>> 3;
        const wire = tag & 7;
        switch (field) {
            case 1: {
                const [val, np] = readVarint(bytes, pos);
                pos = np;
                cfg.debateFormat = val;
                break;
            }
            case 2: {
                const [len, np] = readVarint(bytes, pos);
                pos = np;
                const slice = bytes.slice(pos, pos + len);
                pos += len;
                cfg.customPrompt = new TextDecoder().decode(slice);
                break;
            }
            case 3: {
                const [val, np] = readVarint(bytes, pos);
                pos = np;
                cfg.roundNumber = val;
                break;
            }
            case 4: {
                const [val, np] = readVarint(bytes, pos);
                pos = np;
                cfg.iterativeLoop = val !== 0;
                break;
            }
            case 5: {
                const [len, np] = readVarint(bytes, pos);
                pos = np;
                const slice = bytes.slice(pos, pos + len);
                pos += len;
                cfg.loopTargetModuleId = new TextDecoder().decode(slice);
                break;
            }
            default: {
                if (wire === 2) {
                    const [len, np] = readVarint(bytes, pos);
                    pos = np + len;
                }
                else {
                    const [, np] = readVarint(bytes, pos);
                    pos = np;
                }
            }
        }
    }
    return cfg;
}
export { defaultConfig as DebateConfigDefault };
