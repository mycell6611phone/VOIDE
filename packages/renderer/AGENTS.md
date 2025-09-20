# /packages/renderer — Electron Renderer Bundle

**Role**
The production renderer shipped inside Electron. Shares many concepts with the
standalone `/ui` package but integrates tightly with IPC and Electron APIs.

**Key pieces**
- `src/` — React app using ReactFlow for graph editing.
- `vite.config.ts` — Bundles renderer assets.
- Depends on `@voide/ipc`, `@voide/shared`, `zustand`, `reactflow`, etc.

**Commands**
- Dev: `pnpm --filter @voide/renderer dev`
- Build: `pnpm --filter @voide/renderer build`

**Guidelines**
- Any IPC usage must go through the typed preload bridge (`window.voide`).
- Keep component state minimal; heavy logic should live in shared packages.
- Mirror UI conventions defined in `/ui` to avoid divergence.
- The canvas owns mutable editor state (nodes, ports, edges). On **Build** it
  serializes to the canonical `FlowGraph` protobuf and sends it across IPC for
  compilation. JSON exports are for debugging only.
- Pressing **Run** must reuse the `CompiledFlow` returned by Build rather than
  re-reading renderer state, ensuring runtime parity with the CLI and main
  process.
