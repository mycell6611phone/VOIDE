# PR: Step 05 — Develop Core Modules

## Prompt for Codex
Add the core modules with strict internal schema enforcement and graceful downgrades.

### Modules
1. **LLM Module**
   - Input: `{system, user, assistant, context[], params}`.
   - Insert defaults. Adapt to backends that lack `system` by folding into first user turn.
2. **Prompt Module**
   - Inject prompt text into `system` or `user` field per config.
3. **Memory Module**
   - SQLite store with optional FAISS index (if `tools/faissd` is running).
   - Respect `k` and modes: `append|replace|retrieve`.
4. **ToolCall Module**
   - Declare tool schema, detect tool requests from LLM output, invoke and route results.
5. **Log Module**
   - Per‑run logs with rotation.

### Required Changes
- `packages/modules/*` folders per module with `schema.ts`, `node.ts`, and tests.
- `packages/adapters` include a mock LLM and optional local backends. CPU default.
- All modules accept/produce their sub‑schemas and pass through unknown fields untouched.
- On schema mismatch, wrap or downgrade to text. Never break graph connections.

### Acceptance Criteria
- Each module has unit tests for schema validation and downgrade behavior.
- LLM module can run end‑to‑end with mock backend.
- Logs written to per‑run directories and exposed to the UI.

