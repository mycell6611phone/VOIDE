# PR: Step 07 — Model Manager (Milestone 5)

## Prompt for Codex
Implement a model manager that parses `models.json`, filters disallowed licenses, downloads models, verifies checksums, supports resume, and emits progress events. Provide a selection UI.

### Required Changes
- `packages/main/src/models/modelManager.ts`: parse `~/.voide/models/models.json`, enforce license allowlist, download with checksum verification and resume.
- `packages/main/src/models/events.ts`: progress events streamed over IPC.
- `packages/renderer/src/features/models/ModelPicker.tsx`: show installed vs. not installed; clicking begins download; grey out unavailable.
- Store models in `~/.voide/models`.

### Acceptance Criteria
- Invalid license models are rejected.
- Partial downloads resume.
- UI reflects status and can trigger downloads.

