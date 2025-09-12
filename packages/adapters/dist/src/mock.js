export async function runMock(prompt) {
    const lines = prompt.split(/\n/).slice(-4).join(" ").slice(0, 400);
    const verdict = /DONE/i.test(prompt) ? "DONE" : "CONTINUE";
    const summary = lines.replace(/\s+/g, " ").trim();
    return `Thought: ${summary}\nDecision: ${verdict}`;
}
