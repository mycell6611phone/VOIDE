export enum DebateFormat {
  SINGLE_PASS_VALIDATE = 0,
  CONCISENESS_MULTI_PASS = 1,
  DEBATE_ADD_ON = 2,
  CUSTOM = 3,
}

export interface DebateConfig {
  debateFormat: DebateFormat;
  customPrompt: string;
  roundNumber: number;
  iterativeLoop: boolean;
  loopTargetModuleId: string;
}

const defaultConfig: DebateConfig = {
  debateFormat: DebateFormat.SINGLE_PASS_VALIDATE,
  customPrompt: "",
  roundNumber: 1,
  iterativeLoop: false,
  loopTargetModuleId: "",
};

function writeVarint(value: number, out: number[]) {
  while (value > 127) {
    out.push((value & 0x7f) | 0x80);
    value >>>= 7;
  }
  out.push(value);
}

function readVarint(buf: Uint8Array, offset: number): [number, number] {
  let value = 0;
  let shift = 0;
  let pos = offset;
  while (pos < buf.length) {
    const b = buf[pos++];
    value |= (b & 0x7f) << shift;
    if ((b & 0x80) === 0) break;
    shift += 7;
  }
  return [value, pos];
}

export function debateConfigToBytes(cfg: DebateConfig): Uint8Array {
  const out: number[] = [];
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

export function debateConfigFromBytes(bytes: Uint8Array): DebateConfig {
  let cfg: DebateConfig = { ...defaultConfig };
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
        cfg.debateFormat = val as DebateFormat;
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
        } else {
          const [, np] = readVarint(bytes, pos);
          pos = np;
        }
      }
    }
  }
  return cfg;
}

export { defaultConfig as DebateConfigDefault };

