export type PromptTarget = "system" | "user";

export interface PromptConfigState {
  text: string;
  to: PromptTarget;
  passthrough: Record<string, unknown>;
}

export const defaultPromptConfig: PromptConfigState = {
  text: "",
  to: "user",
  passthrough: {},
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function promptConfigFromBytes(
  bytes?: Uint8Array | null
): PromptConfigState {
  if (!bytes || bytes.length === 0) {
    return { ...defaultPromptConfig, passthrough: {} };
  }

  try {
    const raw = JSON.parse(new TextDecoder().decode(bytes));
    if (!isRecord(raw)) {
      return { ...defaultPromptConfig, passthrough: {} };
    }

    const { text, to, ...rest } = raw;
    const normalizedText = typeof text === "string" ? text : "";
    const normalizedTo: PromptTarget = to === "system" ? "system" : "user";

    return {
      text: normalizedText,
      to: normalizedTo,
      passthrough: { ...rest },
    };
  } catch {
    return { ...defaultPromptConfig, passthrough: {} };
  }
}

export function promptConfigToBytes(cfg: PromptConfigState): Uint8Array {
  const payload = {
    ...cfg.passthrough,
    text: cfg.text,
    to: cfg.to,
  } satisfies Record<string, unknown>;

  return new TextEncoder().encode(JSON.stringify(payload));
}
