# /core/src/runtime — Runtime Types & Helpers

Currently houses core runtime type definitions. Keep types in sync with schema
and execution engine expectations. Expand here when adding reusable runtime
helpers.
- Define TypeScript mirrors for `CompiledFlow` structures here so that
  orchestrator/scheduler code and Electron workers share the same IR contract.
