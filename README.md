# VOIDE - Visual Orchestration IDE

VOIDE is a visual IDE for building, orchestrating, and running large language model (LLM) architectures.  
Think of it as **AutoCAD or Microsoft Paint for AI workflows** — highly technical under the hood, but simple enough for anyone to use.

## Features
- Visual Workflow Builder: Drag-and-drop interface for designing LLM flows.
- Orchestration Engine: Schedule, run, and monitor AI pipelines.
- Adapter Support: Integrations for backends like `llama.cpp`, `gpt4all`, and mock LLMs.
- Extensible Packages: Modular architecture with shared schemas, workers, and adapters.
- Electron App: Cross-platform desktop app with a React-based renderer.
- Vector Search: FAISS-based retriever and embedding workflows.
- Flow Schema: JSON schema-driven flow definitions for interoperability.

## Project Structure
- `packages/main` – Orchestration engine, DB, worker pool, services.
- `packages/renderer` – React UI with graph canvas, properties panel, and run inspector.
- `packages/workers` – Implementations for LLMs, embeddings, retrievers, and vector operations.
- `packages/adapters` – Backends such as `llama.cpp`, `gpt4all`, and mock engines.
- `flows/` – Example flow definitions and schemas.
- `tools/faissd` – FAISS server implementation with gRPC interface.

## Getting Started
### Prerequisites
- Node.js + pnpm
- Python 3.10+ (for FAISS server)
- Docker (optional, for running `faissd`)

### Install
```bash
pnpm install
```

### Run in Development
```bash
./scripts/dev.sh
```

### Build
```bash
./scripts/build-linux.sh
```

## Example
You can start with the included [sample-self-debate.flow.json](flows/sample-self-debate.flow.json) to see how flows are defined.

## Roadmap
- More backend adapters (OpenAI, Anthropic, etc.)
- Enhanced visual tooling for debugging flows
- Marketplace for sharing and importing flow templates
- Cloud deployment support

## License
This project is **free to use for personal and educational purposes**.  
**Commercial use requires a license.**

For licensing requests, please contact:

📧 **mycellphone@gmail.com**

---

## Credits
Project Owner: **[Justin Carrow]**  
AI Assistant: **ChatGPT5-pro (OpenAI)**
Error Handling: **Gemini (Google)**
