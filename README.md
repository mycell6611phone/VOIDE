# VOIDE (Visual Orchestration IDE) — MVP
<img width="1909" height="893" alt="image" src="https://github.com/user-attachments/assets/940e1fee-665d-4ea5-b71c-2a14654af78b" />

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
