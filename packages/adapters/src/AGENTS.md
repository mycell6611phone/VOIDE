# /packages/adapters/src — Adapter Implementations

Contains adapter wrappers for different backends:
- `mock.ts` — Deterministic mock LLM/tool adapter (default offline path).
- `gpt4all.ts` — GPT4All integration (optional dependency).
- `llamaCpp.ts` — Llama.cpp bridge (local GGUF files).

Ensure each adapter exports a consistent interface so runtime callers can swap
backends transparently. Guard optional imports and surface clear errors when
artifacts are missing.
