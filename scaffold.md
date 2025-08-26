voide/
├─ README.md
├─ package.json
├─ pnpm-workspace.yaml
├─ turbo.json
├─ tsconfig.base.json
├─ electron-builder.yml
├─ scripts/
│  ├─ install.sh
│  ├─ dev.sh
│  └─ build-linux.sh
├─ models/
│  └─ models.json
├─ flows/
│  ├─ schema/
│  │  └─ flow.schema.json
│  └─ sample-self-debate.flow.json
├─ packages/
│  ├─ shared/
│  │  ├─ package.json
│  │  ├─ tsconfig.json
│  │  └─ src/types.ts
│  ├─ schemas/
│  │  ├─ package.json
│  │  └─ src/index.ts
│  ├─ adapters/
│  │  ├─ package.json
│  │  ├─ tsconfig.json
│  │  └─ src/
│  │     ├─ llamaCpp.ts
│  │     ├─ gpt4all.ts
│  │     └─ mock.ts
│  ├─ workers/
│  │  ├─ package.json
│  │  ├─ tsconfig.json
│  │  └─ src/
│  │     ├─ llm.ts
│  │     ├─ embed.ts
│  │     ├─ retriever.ts
│  │     └─ vector.ts
│  ├─ main/
│  │  ├─ package.json
│  │  ├─ tsconfig.json
│  │  └─ src/
│  │     ├─ main.ts
│  │     ├─ ipc.ts
│  │     ├─ orchestrator/
│  │     │  ├─ engine.ts
│  │     │  └─ scheduler.ts
│  │     ├─ services/
│  │     │  ├─ db.ts
│  │     │  ├─ secrets.ts
│  │     │  ├─ models.ts
│  │     │  ├─ faissClient.ts
│  │     │  └─ validate.ts
│  │     └─ workerPool.ts
│  ├─ preload/
│  │  ├─ package.json
│  │  ├─ tsconfig.json
│  │  └─ src/preload.ts
│  └─ renderer/
│     ├─ package.json
│     ├─ tsconfig.json
│     ├─ index.html
│     ├─ vite.config.ts
│     └─ src/
│        ├─ main.tsx
│        ├─ App.tsx
│        ├─ components/
│        │  ├─ GraphCanvas.tsx
│        │  ├─ PropertiesPanel.tsx
│        │  ├─ RunControls.tsx
│        │  └─ Inspector.tsx
│        └─ state/flowStore.ts
└─ tools/
   └─ faissd/
      ├─ Dockerfile
      ├─ proto/faissd.proto
      └─ server/
         ├─ __init__.py
         └─ server.py




