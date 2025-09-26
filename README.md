# VOIDE is an interactive visual IDE. A user drags modules onto a canvas, wires them into a directed acyclic graph (like a breadboard), presses Build to validate and compile the graph into a Flow v1 protobuf, then presses Run to execute it. Execution is deterministic and versioned. The core purpose is to give non-programmers and technical builders alike a way to assemble complex LLM/data pipelines visually without hand-coding orchestration logic.
<img width="1909" height="893" alt="image" src="https://github.com/user-attachments/assets/5c799fd2-1933-489f-9135-f0940dc78d19" />

What the app should do in practice:

Design phase (UI): Let a user visually build workflows by dragging modules, connecting them, and configuring parameters.

Build phase (compiler): Check correctness (no cycles, port schemas match), generate a protobuf workflow spec.

Run phase (orchestrator): Execute the graph step by step, pass data between modules, handle branching/diverters, and stream live telemetry.

Persistence: Save projects as protobuf snapshots; reload them later deterministically.

Assets: Manage local models and templates, enforce checksums and licensing.

Modes: MVP is single-user, local execution. Pro edition can offload execution to cloud and enable multi-user canvases.

So: VOIDE is not a generic IDE, not a notebook, and not just a model runner. It is a workflow composer and executor for LLM-centric pipelines, with strong guarantees of determinism, schema safety, and reproducibility.


## Prereqs
- Linux (Pop!_OS). Node 20+, PNPM 9+, Python 3.11+, Docker or Podman.
- Build deps: `sudo apt install -y build-essential python3-dev libsqlite3-dev`

## Install
```bash
chmod +x scripts/*.sh
./scripts/install.sh
```

## Dev
```bash
./scripts/dev.sh
```

## Build .deb
```bash
./scripts/build-linux.sh
```

## Optional: FAISS local service
```bash
cd tools/faissd
docker build -t voide/faissd:latest .
docker run -d --name faissd \
  -v $HOME/.voide/faiss:/data \
  -p 50051:50051 voide/faissd:latest
```

## Models
Edit `models/models.json`. For llama.cpp set `LLAMA_BIN` env to your compiled `llama-cli` path.

## Sample flow
Open `flows/sample-self-debate.flow.json` in the app. Choose adapter `mock` to run offline, or `llama.cpp` / `gpt4all` if installed.

## CLI
Build and run flows from the command line.

```bash
pnpm --filter @voide/core build
pnpm --filter @voide/core exec voide build examples/bulletizer.canvas.json -o bulletizer.flow
pnpm --filter @voide/core exec voide run bulletizer.flow --input 'text=Hello world' --provider stub
```

## Debate Module

The Debate module can be dragged from the palette onto the canvas. It accepts a text payload and emits refined text. Configuration is stored as protobuf bytes (`src/modules/debate/debate.proto`).

### Example configs

Single round single pass:
```json
{
  "nodes": [
    {"id":"llm1","type":"LLM"},
    {"id":"deb1","type":"Debate","config":"base64cfg=="}
  ],
  "edges":[{"from":{"node":"llm1","port":"text"},"to":{"node":"deb1","port":"input"}}]
}
```

Two-round chained debate:
```json
{
  "edges":[
    {"from":{"node":"llm1","port":"text"},"to":{"node":"deb1","port":"input"}},
    {"from":{"node":"deb1","port":"output"},"to":{"node":"deb2","port":"input"}}
  ]
}
```

Iterative loop with target module:
```json
{
  "nodes":[{"id":"debLoop","type":"Debate","config":"cfgbytes..."}],
  "meta":{"next_module":"debLoop","round":2}
}
```

Each example embeds the DebateConfig protobuf in Base64 form for persistence.
