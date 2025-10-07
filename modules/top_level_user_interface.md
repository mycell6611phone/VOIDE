VOIDE North Star


1. Overview

The Visual IDE is a drag-and-drop workflow builder for constructing, testing, and exporting LLM-based architectures. It provides a canvas-based editor, module palette, wiring tool, and execution controls, enabling non-technical and technical users alike to design complex AI pipelines visually.

2. Goals

Enable intuitive drag-and-drop assembly of LLM workflows.

Provide interactive configuration menus for each module.

Allow testing, pausing, and stopping of workflows directly inside the IDE.

Support export/build of workflows into runnable or shareable formats.

3. Top-Level Interface Components
3.1 Canvas (Center Workspace)

Blank area where users place modules and draw connections.

Supports zoom/pan.

Visual wires represent data flow direction.

Visual indicators during execution show live data movement.

3.2 Top Menu Bar

Dropdown menus for global operations/settings.

Execution Controls (center):

Start → run current workflow.

Pause → suspend execution, preserve state.

Stop → terminate execution completely.

Build Button (right):

Compiles current workflow into a runnable script.

3.3 Left Side Menu (Module Palette)

Contains categories of drag-and-drop modules:

LLMs (GPT, LLaMA, Gemini, etc.)

Prompt Module

Debate/loop Module

Divirter Module

Memory Module

Cache Module

Tools Module

Wiring tool

Log Module

4. Module Interaction
4.1 Placement

Drag modules from side menu to canvas.

4.2 Connection

Wiring tool draws arrows between modules to establish data flow.

Supports one-to-one, one-to-many, and feedback loops.

4.3 Configuration Menus (Right-Click on Module)

Each module has a context menu with pre-built options:

LLM Module

Dropdown: list of available models (See Models.json for details.)

Options: temp.,token pruner: max tokens, Top P, Top K, etc. communication methods: llama.cpp, Ollama, etc.

Help menu: definitions and usage tips.

Prompt Module

Text field for writing a custom prompt.

Preloaded prompt examples to choose from.

Help menu: guidance on structuring effective prompts.

Tools Module

List of tools (calculator, API connector, search, etc.).

Toggle on/off per tool.

Help menu: usage definitions.

5. Execution Features

Run workflows in real time within IDE.

Data flow animations across wires and modules in real time.

6. Build,  (Export for future pro version)

Clicking Build assimbles the modules and connections per canvas into a runnable state


Output contains all module configurations and links.

7. Non-Goals (Pro version only)

external API call (GPT, Gmini, etc.)

Collaboration features, Remote Telemitry, Cloud, Lora training module, multi user.

Summary:
This top-level UI provides a canvas editor with menus, drag-and-drop modules, execution controls, and right-click configuration menus for modules. The goal is to make complex LLM workflows visually designable, testable, and exportable with no manual coding.
