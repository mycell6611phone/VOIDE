export const DEFAULT_PROMPT_PRESET_ID = "analysis";
export const PROMPT_PRESETS = [
    {
        id: "analysis",
        label: "Analysis",
        description: "Break the request into concrete steps and surface blockers or missing context.",
        defaultText: "You are a critical analyst. Read the latest context, break the work into actionable steps, call out blockers or missing information, and list follow-up questions before acting.",
    },
    {
        id: "brainstorm",
        label: "Brainstorm",
        description: "Generate diverse ideas, compare trade-offs, and highlight promising options.",
        defaultText: "You are a brainstorming partner. Produce several distinct approaches, explore their pros and cons, and point out any creative angles worth exploring further.",
    },
    {
        id: "refine",
        label: "Refine",
        description: "Polish drafts for clarity, organization, and tone without losing intent.",
        defaultText: "You are an editor focused on clarity. Restructure and tighten the draft, fix grammar, and keep the author's intent intact while improving readability.",
    },
    {
        id: "custom",
        label: "Custom",
        description: "Write your own instructions for this node.",
        defaultText: "",
    },
];
export const PROMPT_PRESET_MAP = Object.fromEntries(PROMPT_PRESETS.map((preset) => [preset.id, preset]));
/**
 * Attempt to infer which preset produced the provided text by comparing against
 * the canonical preset copy. Returns `null` when there is no exact match.
 */
export function inferPromptPresetFromText(text) {
    const normalized = text.trim();
    if (!normalized) {
        return null;
    }
    for (const preset of PROMPT_PRESETS) {
        if (preset.id === "custom") {
            continue;
        }
        if (preset.defaultText.trim() === normalized) {
            return preset;
        }
    }
    return null;
}
