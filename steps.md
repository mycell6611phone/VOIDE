VOIDE – Visual Orchestration IDE

“AutoCAD for AI Workflows”

1. Purpose

VOIDE is a visual IDE for designing, orchestrating, and running LLM-based workflows.
It provides a drag-and-drop canvas where users build pipelines from modules like LLMs, prompts, memory, tools, and logs.
The system generates flow definitions (JSON) that can be run by the orchestration engine, reused, or shared.

2. Top-Level UI Layout

Top Menu Bar

File menus: Save, Open, Close projects, Preferences, Settings.

Compute setup: CUDA / GPU / CPU configuration, auto-detect VRAM.

If VRAM < requirement, large models are greyed out (e.g. 70B).

Controls: Play, Pause, Stop (kill switch for runaway loops).

Build button: compiles the canvas into a JSON flow definition.

Side Menu Bar

Contains draggable modules:

LLM, Prompt, Memory, Log, Tool Call, Cache, Loop, Debate, Router, Validator.

Expandable for future paid modules (e.g. multi-modal, advanced tools).

Canvas

Drag-and-drop workspace.

Wires connect modules, represent directional data flow.

Users can move modules at any time; wires stay connected.

Wire snapping ensures clean layout.

Wires show arrows to indicate data direction.

Module Popup (on right-click)

Configuration menus with options, drop-downs, and minimal help text.

Example: LLM module lets user select model, backend (llama.cpp, gpt4all, Ollama, API), temperature, schema enforcement.

3. Data Flow & Wires

Each wire is unidirectional.

Example flow:

User Interface → Prompt → LLM → Memory → User Interface.

LLM input can come from any connected upstream module (prompt, memory recall, user input, tool output).

LLM output must be wired somewhere downstream (UI, memory save, tool input).

If an LLM has no output wire, the system produces no response.

4. Modules
4.1 LLM Module

Popup with options:

Model: user selects from installed models (models.json).

Backend: llama.cpp, gpt4all, API, etc.

Parameters: temperature, max tokens.

Schema strictness: toggle per model (default: ON). Options: hard, soft, off.

Token limiter: input automatically truncated to model’s max context length.

Supported models (v1 focus):

LLaMA 3.2 3B Instruct

LLaMA 3.1 8B Instruct (128k)

Mistral 7B Instruct

Reasoner v1 (Qwen2.5 Coder 7B)

Auto-downloads missing models from Hugging Face into ~/.voide/models.

If checksum mismatch, redownload required.

4.2 Prompt Module

Can be placed inline with LLM input.

Options:

Choose default prompt (e.g. “You are a helpful AI assistant”).

Enter custom prompt text.

4.3 Memory Module

Two required connections:

Recall path (input from memory → LLM).

Save path (output from LLM → memory).

Options:

Store type: sqlite, faiss, chroma.

Recall settings: k=1–5 (top memories).

Modes: save, recall.

4.4 Tool Call Module

Placed inline before an LLM.

Informs the LLM what tool is available and how to call it.

Wires:

One wire from upstream (data flow).

One “sensor” wire listening to LLM output for tool call.

One output wire carrying returned data.

Tool calls: only reliable if the model supports them; otherwise fallback to text.

Warning shown if user attaches tool to an LLM without tool support.

4.5 Log Module

One input wire.

Options: log filename, save location, log contents (all, user input only, system prompts, LLM output).

4.6 User Interface Module

Represents user input and output.

Basic UI = CLI.

Advanced UIs (voice, GUI, multi-user) may be paid add-ons.

5. Debugging & Telemetry
5.1 Lights System

Real-time lights follow data flow.

Wire/module lights:

Green = data passed.

Orange = schema violation (stays on until user checks or next valid pass).

No light = no data.

Log/Memory modules:

Orange = data arrived.

Flash green = saved successfully.

5.2 Error Handling

System doesn’t crash on schema violations.

Falls back to text.

Orange light indicates where error occurred.

User can inspect with log module.

5.3 Stop/Freeze

Stop button freezes lights in last state.

Lights persist until user restart or right-click reset.

6. File System & Persistence

Projects saved as JSON flow definitions (flows/*.flow.json).

Snapshot saved when “Save Project” clicked.

Runtime state (lights, error flags) not saved — only last design state.

Build button outputs flow definition only; export to runnable code (Python/JS) reserved for future Pro version.

7. Licensing & Business Model

Free version:

Supports local models only.

Limited module set (LLM, Prompt, Memory, Log, Tool).

Users provide/download their own models.

Pro version (future):

Cloud infrastructure support (OpenAI, Anthropic, Gemini, etc.).

Export to runnable code (Python/Node).

Advanced UI modules (voice, GUI).

Collaboration/sharing features.

8. Risks & Mitigation

Risk: complexity creep. → Keep v1 minimal and functional.

Risk: schema failures. → Strict schema enforcement with fallback.

Risk: repo conflicts. → Store design docs, schema, and UI flow clearly in repo.

Risk: licensing issues. → Only include models with commercial-friendly licenses (Meta, Mistral, Qwen, DeepSeek, GPT4All Falcon).

9. Development Roadmap (chunked tasks)

Finalize schema (flow.schema.json).

Implement module system in Renderer (GraphCanvas, PropertiesPanel).

Implement orchestrator in Main (flow execution, strict schema).

Add model downloader (Hugging Face, checksum verify).

Add light/telemetry system.

Add Save/Load of flows.

Add Log and Memory modules.

Add Tool Call module.

Test with local models.

Polish UI, prepare Pro roadmap features
