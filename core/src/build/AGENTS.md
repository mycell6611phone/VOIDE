# /core/src/build — Flow Build Pipeline

Implements validation + compilation for flow documents.

**Files**
- `validate.ts` — Zod-based validation.
- `compiler.ts` — Translates flow JSON into executable plans/protobuf.

Ensure compiler output stays deterministic. Update CLI commands (`voide validate`,
`voide pack`) when altering behavior.
