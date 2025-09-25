# /packages/adapters/src — Adapter Implementations
> **File Modification Guardrails**
> - Do not create, modify, or delete anything under any `dist/` directory.
> - Never touch: `packages/**/dist/**`, `build/**`, `out/**`.
> - Only edit files in `src/`, `scripts/`, `proto/`, `config`, or test paths.


Contains adapter wrappers for different backends:
- `mock.ts` — Deterministic mock LLM/tool adapter (default offline path).
- `gpt4all.ts` — GPT4All integration (optional dependency).
- `llamaCpp.ts` — Llama.cpp bridge (local GGUF files).

Ensure each adapter exports a consistent interface so runtime callers can swap
backends transparently. Guard optional imports and surface clear errors when
artifacts are missing.
