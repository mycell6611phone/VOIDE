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
export declare const DEFAULT_PROMPT_PRESET_ID: "analysis";
export declare const PROMPT_PRESETS: PromptPreset[];
export declare const PROMPT_PRESET_MAP: Record<string, PromptPreset>;
/**
 * Attempt to infer which preset produced the provided text by comparing against
 * the canonical preset copy. Returns `null` when there is no exact match.
 */
export declare function inferPromptPresetFromText(text: string): PromptPreset | null;
//# sourceMappingURL=promptPresets.d.ts.map