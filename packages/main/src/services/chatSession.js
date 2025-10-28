import { randomUUID } from "node:crypto";
const MAX_MESSAGES_PER_THREAD = 200;
const sanitizeContent = (value) => value.trim().slice(0, 4000);
const fallbackResponse = (content) => {
    const snippet = content.trim().slice(0, 280);
    if (!snippet) {
        return "I\u2019m standing by. Send a prompt whenever you\u2019re ready.";
    }
    const suffix = content.trim().length > snippet.length ? "\u2026" : "";
    return `Got it: "${snippet}${suffix}". The flow will process this input and reply when results are ready.`;
};
export class ChatSessionManager {
    #threads = new Map();
    getHistory(moduleId) {
        const existing = this.#threads.get(moduleId);
        if (!existing) {
            return [];
        }
        return existing.slice().sort((a, b) => a.timestamp - b.timestamp);
    }
    recordOutgoing(moduleId, senderId, content) {
        const timestamp = Date.now();
        const cleanContent = sanitizeContent(content);
        const outgoing = {
            id: randomUUID(),
            moduleId,
            senderId,
            timestamp,
            content: cleanContent,
            direction: "outgoing",
        };
        const response = {
            id: randomUUID(),
            moduleId,
            senderId: `${moduleId}:assistant`,
            timestamp: timestamp + 1,
            content: fallbackResponse(cleanContent),
            direction: "incoming",
        };
        const next = [...(this.#threads.get(moduleId) ?? []), outgoing, response];
        const trimmed = next.slice(-MAX_MESSAGES_PER_THREAD);
        this.#threads.set(moduleId, trimmed);
        return trimmed.slice();
    }
    clear(moduleId) {
        this.#threads.delete(moduleId);
    }
    resetAll() {
        this.#threads.clear();
    }
}
export const chatSessions = new ChatSessionManager();
