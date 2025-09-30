import {
  DEFAULT_PROMPT_PRESET_ID,
  PROMPT_PRESET_MAP,
  type PromptPreset,
  inferPromptPresetFromText,
} from "@voide/shared";

export type PromptTarget = "system" | "user";
export type PromptPreset = "assistant" | "engineer" | "custom";

export interface PromptConfigState {
  text: string;
  preset: string;
  to: PromptTarget;
  preset: PromptPreset;
  passthrough: Record<string, unknown>;
}

const defaultPreset: PromptPreset | undefined =
  PROMPT_PRESET_MAP[DEFAULT_PROMPT_PRESET_ID];

export const defaultPromptConfig: PromptConfigState = {
  text: defaultPreset?.defaultText ?? "",
  preset: defaultPreset?.id ?? DEFAULT_PROMPT_PRESET_ID,
  to: "user",
  preset: "custom",
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


    const { text, template, preset, tone, to, ...rest } = raw;
    const initialText =
      typeof text === "string"
        ? text
        : typeof template === "string"
          ? template
          : "";

    let normalizedPreset =
      typeof preset === "string" && preset in PROMPT_PRESET_MAP
        ? preset
        : undefined;

    if (!normalizedPreset) {
      const inferred = inferPromptPresetFromText(initialText);
      normalizedPreset = inferred?.id;
    }

    const trimmed = initialText.trim();

    if (!normalizedPreset) {
      normalizedPreset = trimmed.length === 0 ? DEFAULT_PROMPT_PRESET_ID : "custom";
    }

    let normalizedText = initialText;
    if (normalizedPreset !== "custom") {
      const presetText = PROMPT_PRESET_MAP[normalizedPreset]?.defaultText ?? "";
      if (trimmed.length === 0) {
        normalizedText = presetText;
      } else if (trimmed !== presetText.trim()) {
        normalizedPreset = "custom";
      }
    }

    if (normalizedPreset === "custom") {
      normalizedText = initialText;
    }


    const normalizedTo: PromptTarget = to === "system" ? "system" : "user";
    const normalizedPreset: PromptPreset =
      preset === "assistant" || preset === "engineer" ? preset : "custom";

    const passthrough: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(rest)) {
      if (key === "template" || key === "tone") {
        continue;
      }
      passthrough[key] = value;
    }

    return {
      text: normalizedText,
      preset: normalizedPreset,
      to: normalizedTo,


      passthrough,

    };
  } catch {
    return { ...defaultPromptConfig, passthrough: {} };
  }
}

export function promptConfigToBytes(cfg: PromptConfigState): Uint8Array {
  const payload = {
    ...cfg.passthrough,
    text: cfg.text,
    preset: cfg.preset,
    to: cfg.to,
    preset: cfg.preset,
  } satisfies Record<string, unknown>;

  return new TextEncoder().encode(JSON.stringify(payload));
}
