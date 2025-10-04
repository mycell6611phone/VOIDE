# /core/src/build — Flow Build Pipeline
> **File Modification Guardrails**
> - Do not create, modify, or delete anything under any `dist/` directory.
> - Never touch: `packages/**/dist/**`, `build/**`, `out/**`.
> - Only edit files in `src/`, `scripts/`, `proto/`, `config`, or test paths.


Implements the canonical graph compiler that turns authored flows into runtime
artifacts.

**Files**
- `validate.ts` — Zod-based validation.
- `compiler.ts` — Translates FlowGraph protobuf into CompiledFlow protobuf.

Ensure compiler output stays deterministic. Update CLI commands (`voide
validate`, `voide pack`) when altering behavior.

## Canonical artifacts

- **FlowGraph** — Authoring schema emitted by the renderer and persisted by the
  workspace. This is authoritative editor state. JSON exports exist only for
  debugging; Build always operates on the protobuf form.
- **CompiledFlow** — Execution IR consumed by the runtime. Generated exclusively
  by the compiler.

```proto
message FlowGraph {
  repeated Node nodes;
  repeated Edge edges;
}

message CompiledFlow {
  repeated Operator operators;
  repeated Channel channels;
  repeated Step schedule;
  map<string, Constant> constants;
  repeated TelemetryHook hooks;
}
```

## Compiler passes (Build)

1. **Normalize** — Stabilize node/port IDs, apply defaults, and enforce
   deterministic ordering.
2. **Validate** — Run schema checks, arity checks, and confirm loops are only
   present on declared loop nodes.
3. **Type-check** — Infer and unify port types, inserting compiler-approved
   adapters where necessary.
4. **Expand blueprints** — Replace macros (e.g., Debate) with their canonical
   subgraphs.
5. **Resolve handlers** — Map each `node.type` to a runtime operator via the
   handler registry.
6. **Plan** — Produce topological layers, loop boundaries, concurrency groups,
   and resource hints.
7. **Emit IR** — Assemble the final `CompiledFlow` with operators, channels,
   schedule, constants, and telemetry hooks.

Pressing **Build** in the UI or running `voide pack` re-runs the full pass
pipeline, guaranteeing that downstream runs operate on fresh compiled output.

## Backend Transition Notes

- Track compiler pass changes (new steps, reordered passes) here so frontend/CLI teams know when cached compiled flows must be invalidated.
- When adding new IR fields, describe the expected producer (which pass sets it) and consumer (orchestrator module) to keep coordination tight.
