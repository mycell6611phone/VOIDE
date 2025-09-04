# PR: Step 06 — Routers/Dividers & Normalizers

## Prompt for Codex
Add schema‑guard nodes that route valid data forward or reroute to normalizers that wrap/downgrade content.

### Required Changes
- `packages/modules/router-divider` with a predicate API using Zod refinements.
- `packages/modules/normalizers` to coerce raw text into the expected sub‑schema.
- Update the engine to support multi‑out nodes and conditional routing.

### Acceptance Criteria
- Flows never halt on schema mismatch; data is routed to normalizers.
- Tests cover valid/invalid payload routing.

