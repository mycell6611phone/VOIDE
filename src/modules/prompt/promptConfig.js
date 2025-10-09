import { DEFAULT_PROMPT_PRESET_ID, PROMPT_PRESET_MAP, inferPromptPresetFromText, } from "@voide/shared";
const defaultPreset = PROMPT_PRESET_MAP[DEFAULT_PROMPT_PRESET_ID];
export const defaultPromptConfig = {
    text: defaultPreset?.defaultText ?? "",
    preset: defaultPreset?.id ?? DEFAULT_PROMPT_PRESET_ID,
    to: "user",
    passthrough: {},
};
function isRecord(value) {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}
export function promptConfigFromBytes(bytes) {
    if (!bytes || bytes.length === 0) {
        return { ...defaultPromptConfig, passthrough: {} };
    }
    try {
        const raw = JSON.parse(new TextDecoder().decode(bytes));
        if (!isRecord(raw)) {
            return { ...defaultPromptConfig, passthrough: {} };
        }
        const { text, template, preset, tone, to, ...rest } = raw;
        const initialText = typeof text === "string"
            ? text
            : typeof template === "string"
                ? template
                : "";
        let presetId = typeof preset === "string" && preset in PROMPT_PRESET_MAP
            ? preset
            : undefined;
        if (!presetId) {
            const inferred = inferPromptPresetFromText(initialText);
            presetId = inferred?.id;
        }
        const trimmed = initialText.trim();
        if (!presetId) {
            presetId = trimmed.length === 0 ? DEFAULT_PROMPT_PRESET_ID : "custom";
        }
        let normalizedText = initialText;
        if (presetId !== "custom") {
            const presetText = PROMPT_PRESET_MAP[presetId]?.defaultText ?? "";
            if (trimmed.length === 0) {
                normalizedText = presetText;
            }
            else if (trimmed !== presetText.trim()) {
                presetId = "custom";
            }
        }
        if (presetId === "custom") {
            normalizedText = initialText;
        }
        const normalizedTo = to === "system" ? "system" : "user";
        const passthrough = {};
        for (const [key, value] of Object.entries(rest)) {
            if (key === "template" || key === "tone") {
                continue;
            }
            passthrough[key] = value;
        }
        return {
            text: normalizedText,
            preset: presetId,
            to: normalizedTo,
            passthrough,
        };
    }
    catch {
        return { ...defaultPromptConfig, passthrough: {} };
    }
}
export function promptConfigToBytes(cfg) {
    const payload = {
        ...cfg.passthrough,
        text: cfg.text,
        preset: cfg.preset,
        to: cfg.to,
    };
    return new TextEncoder().encode(JSON.stringify(payload));
}
