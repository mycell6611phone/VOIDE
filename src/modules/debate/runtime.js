import { DebateFormat } from "./debateConfig";
/**
 * Thin wrapper around the LLM backend. Tests mock this.
 */
let _llmRequest = async (prompt, _opts) => {
    throw new Error("llmRequest not implemented");
};
export function setLlmRequest(fn) {
    _llmRequest = fn;
}
export const llmRequest = (prompt, opts) => _llmRequest(prompt, opts);
function defaultPrompt(format, input) {
    switch (format) {
        case DebateFormat.SINGLE_PASS_VALIDATE:
            return `Validate and respond:\n${input}`;
        case DebateFormat.CONCISENESS_MULTI_PASS:
            return `Consider carefully:\n${input}`;
        case DebateFormat.DEBATE_ADD_ON:
            return `Provide an initial take:\n${input}`;
        default:
            return input;
    }
}
/**
 * Execute the Debate module.
 */
export async function executeDebate(input, cfg) {
    if (!cfg)
        throw new Error("Missing config");
    const baseText = input?.text ?? "";
    let result = "";
    switch (cfg.debateFormat) {
        case DebateFormat.SINGLE_PASS_VALIDATE: {
            const prompt = cfg.customPrompt || defaultPrompt(cfg.debateFormat, baseText);
            result = await llmRequest(`${prompt}\n${baseText}`.trim());
            break;
        }
        case DebateFormat.CONCISENESS_MULTI_PASS: {
            const prompt = cfg.customPrompt || defaultPrompt(cfg.debateFormat, baseText);
            const first = await llmRequest(`${prompt}\n${baseText}`.trim());
            result = await llmRequest(`Compress:\n${first}`);
            break;
        }
        case DebateFormat.DEBATE_ADD_ON: {
            const prompt = cfg.customPrompt || defaultPrompt(cfg.debateFormat, baseText);
            const initial = await llmRequest(`${prompt}\n${baseText}`.trim());
            result = await llmRequest(`Expand or refine:\n${initial}`);
            break;
        }
        case DebateFormat.CUSTOM: {
            const prompt = (cfg.customPrompt || "").replace(/{{input}}/g, baseText);
            result = await llmRequest(prompt);
            break;
        }
        default:
            throw new Error("Unknown debate format");
    }
    const meta = { ...input.meta };
    if (cfg.iterativeLoop && cfg.loopTargetModuleId) {
        meta.next_module = cfg.loopTargetModuleId;
        meta.round = (cfg.roundNumber || 0) + 1;
    }
    return { text: result, meta };
}
