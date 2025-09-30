export interface PromptPreset {
  /**
   * Unique identifier stored with module params. Use lowercase kebab casing so
   * future presets can follow the same convention without migrations.
   */
  id: string;
  /** Human friendly label shown in the UI. */
  label: string;
  /** Short description rendered in the preset picker. */
  description: string;
  /**
   * Canonical instruction text injected when the preset is selected. Empty
   * strings are valid for presets such as "custom" where the user supplies
   * their own copy.
   */
  defaultText: string;
}

export const DEFAULT_PROMPT_PRESET_ID = "analysis" as const;

export const PROMPT_PRESETS: PromptPreset[] = [
  {
    id: "analysis",
    label: "Analysis",
    description:
      "Break the request into concrete steps and surface blockers or missing context.",
    defaultText:
      "You are a critical analyst. Read the latest context, break the work into actionable steps, call out blockers or missing information, and list follow-up questions before acting.",
  },
  {
    id: "brainstorm",
    label: "Brainstorm",
    description:
      "Generate diverse ideas, compare trade-offs, and highlight promising options.",
    defaultText:
      "You are a brainstorming partner. Produce several distinct approaches, explore their pros and cons, and point out any creative angles worth exploring further.",
  },
  {
    id: "refine",
    label: "Refine",
    description:
      "Polish drafts for clarity, organization, and tone without losing intent.",
    defaultText:
      "You are an editor focused on clarity. Restructure and tighten the draft, fix grammar, and keep the author's intent intact while improving readability.",
  },
  {
    id: "custom",
    label: "Custom",
    description: "Write your own instructions for this node.",
    defaultText: "",
  },
];

export const PROMPT_PRESET_MAP: Record<string, PromptPreset> = Object.fromEntries(
  PROMPT_PRESETS.map((preset) => [preset.id, preset])
);

/**
 * Attempt to infer which preset produced the provided text by comparing against
 * the canonical preset copy. Returns `null` when there is no exact match.
 */
export function inferPromptPresetFromText(
  text: string
): PromptPreset | null {
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

