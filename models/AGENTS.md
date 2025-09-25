# /models — Offline Model Manifest
> **File Modification Guardrails**
> - Do not create, modify, or delete anything under any `dist/` directory.
> - Never touch: `packages/**/dist/**`, `build/**`, `out/**`.
> - Only edit files in `src/`, `scripts/`, `proto/`, `config`, or test paths.


**Files**
- `models.json` — Describes available LLMs/tooling for offline installs.

**Guidelines**
- Keep entries aligned with `packages/models` manager expectations.
- Ensure license metadata satisfies the allowlist (MIT, Apache-2.0, BSD, ISC).
- Use local file paths/URIs only; no remote download links in free mode.
- Update documentation (e.g., `ReadMe.txt`) when adding notable models.
