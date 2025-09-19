# /packages/adapters — Local Module Adapters

**Role**
Contains pluggable adapters for LLMs/tools (e.g., GPT4All). Must function fully
offline and gracefully degrade when optional deps are missing.

**Structure**
- `src/` — Adapter implementations.
- `dist/` — Compiled JS/DTs.
- `package.json` — Declares optional dependency on `gpt4all`.

**Guidelines**
- Guard optional imports; never crash if binaries are absent.
- Avoid spawning network-bound processes. For GPU features, respect `VOIDE_ENABLE_CUDA` env gates.
- Keep public APIs small; other packages import from this workspace module.
- Rebuild via `pnpm --filter @voide/adapters build` after changes.
