# /examples — Canvas Snapshots
> **File Modification Guardrails**
> - Do not create, modify, or delete anything under any `dist/` directory.
> - Never touch: `packages/**/dist/**`, `build/**`, `out/**`.
> - Only edit files in `src/`, `scripts/`, `proto/`, `config`, or test paths.


Contains saved canvas JSON files that illustrate VOIDE flows. Useful for UI
demos and regression testing.

**Current files**
- `bulletizer.canvas.json` — Example flow layout referenced in docs.

**Guidelines**
- Keep examples small and anonymized.
- When adding new examples, document them in `ReadMe.txt` or relevant docs.
- Validate new flows with `pnpm voide validate` before committing.

## Backend Transition Notes

- Use these examples as fixtures when testing Build/Run pipelines; record which backend behaviors each file exercises so regressions can be traced quickly.
- Store compiled hashes or expected scheduler summaries alongside new examples to help validate backend determinism.
