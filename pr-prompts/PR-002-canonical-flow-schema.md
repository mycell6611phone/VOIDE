
---

**File: `.github/pr-prompts/PR-002-canonical-flow-schema.md`**
```md
# PR: Step 02 — Define the Canonical Flow Schema

## Prompt for Codex
Implement a single canonical `*.flow.json` schema with versioning and an append‑only envelope. Every module reads/writes only its strict sub‑schema and passes through unknown fields untouched. Default all missing fields.

### Required Changes
1. **Schema Files**
   - Add `packages/schemas/src/flow.schema.ts` exporting Zod schemas:
     - `FlowEnvelope`: `{ id: string, version: string, createdAt: string, updatedAt: string, nodes: Node[], edges: Edge[], meta?: object }`
     - `Node`: `{ id, kind, type, ports: Ports, params: object, state?: object, meta?: object }`
     - `Edge`: `{ id, from: {node, port}, to: {node, port}, meta?: object }`
     - `Ports`: `{ in: Port[], out: Port[] }`, `Port`: `{ id, type, shape?, optional? }`
   - Export TypeScript types from the Zod schemas.

2. **Defaults & Normalization**
   - Add `packages/schemas/src/defaults.ts` with pure functions to fill defaults:
     - Empty arrays for `nodes`, `edges`, `ports`.
     - Empty objects for `params`, `state`, `meta`.
     - Empty strings for text fields.
   - Ensure identity pass‑through: unknown props are preserved when validating.

3. **Validation CLI**
   - Add `packages/cli/src/validate-flow.ts`:
     - `pnpm voide validate <path/*.flow.json>` → prints errors and exits non‑zero on failure.

4. **Examples**
   - Add `flows/sample-self-debate.flow.json` if absent and validate it in CI.

### Acceptance Criteria
- `FlowEnvelope` and nested schemas compile, ship types, and apply defaults.
- Unknown fields preserved during validate→stringify roundtrip.
- CLI exits 1 on invalid flows and 0 on valid samples.
- Existing `flows/` files validate clean.

### Constraints
- No breaking changes to existing flow files. Add non‑required fields only.

