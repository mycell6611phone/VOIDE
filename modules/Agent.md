Module Details: 

Module | line location
Prompt    8 to 39 
Log      42 to 82
Debate   86 to 142
LLM     146 to 221

Prompt Module Blueprint:

  Placement & Dataflow

  The Prompt module is dragged from the palette and can be placed upstream on any wire between modules on the canvas.

  It injects a system prompt into the data flowing to the next LLM in the pipeline.

  Visual Representation

  Rendered as a small rectangle with the label “Prompt” centered inside the box.

  Configuration Menu

  Right-clicking the Prompt module opens a pop-up configuration menu.

  The menu provides:

  A dropdown list of default system prompts the user can select.

  A text input area where the user can enter a custom prompt (overrides default if provided).

  Behavior

  When the flow is executed, the Prompt module injects the configured system/custom prompt as a system message or context field to the immediate downstream LLM module.

  The prompt text is passed forward exactly as entered/selected, preserving formatting and line breaks.

  Integration

  The module only affects the data on its outbound wire; it does not modify other parts of the flow.

  Multiple Prompt modules can be used in series or parallel, and their output is always routed to the next module as per user wiring.
--------------------------------------------------

Log Module Blueprint:

   Placement

   The Log module is dragged from the palette and can be placed anywhere on the canvas.

   Visual Representation

   Rendered as a small rectangle with the label “Log” centered inside the box.

   Connection

   The module has one input port and can be connected to any data stream wire or module output.

   Only a single inbound connection is allowed; multiple inputs require multiple Log modules.

   Configuration Menu

   When the Log module is connected, its configuration menu automatically updates to display the schema of the incoming data.

   The user can:

   Select which data fields to log (multi-select from the schema).

   Specify the log file location (file path or selector UI).

   Optionally choose log format (e.g., plain text, CSV, JSON).

   Behavior

   On execution, the Log module records the selected data fields from each incoming message to the specified log file.

   Logging occurs in real time as data flows through the module.

   The Log module is primarily intended for debugging but can be used for any purpose requiring data capture or audit.

   Integration

   The module does not alter the data it receives; it only logs a copy and passes the data unchanged to downstream modules (if any).

   Multiple Log modules can be used in a flow as needed for capturing different streams or subsets of data.

----------------------------------------------------------

Debate Module Blueprint:

   Visual Representation

   Rendered as a rectangle with the label “Debate” centered inside the box.

   Placement

   The Debate module is dragged from the palette and can be placed next to any LLM module on the canvas.

   Connections

   The module has two ports: one input and one output.

   Input connects to an upstream module (usually an LLM).

   Output connects to the next module in the flow or to additional debate rounds.

   Configuration Menu

   Right-clicking the Debate module opens a pop-up configuration menu.

   Menu options include:

   Debate format selection, such as:

   Single Pass Validate

   Conciseness Multi-Pass

   Debate Add-On (expand or refine first response)

   (Other custom or predefined formats)

   Once a format is selected, the menu updates to display the configuration fields relevant for that format.

   The user can select a debate prompt from defaults or type a custom prompt for this round.

   Debate Rounds and Chaining

   Each debate round is represented by a separate Debate module placed and configured by the user.

   For multi-round debates, the user must:

   Place a new Debate module for each additional round.

   Select the round number and debate format for each round.

   Place a matching Loop module if iterative debate is required.

   The flow diagram must explicitly wire each round/module (see draft layout for visual reference).

   Behavior

   When executed, the Debate module applies the selected debate prompt and format to the input data, and passes the output downstream to the next module (LLM, Debate, or otherwise).

   Each Debate module operates independently based on its configuration, allowing flexible debate structures and chaining.

------------------------------------------------------------------------

LLM Module Blueprint:

   Visual Representation

   Rendered as an oval shape on the canvas.

   Default label: “LLM” in the center.

   Placement

   User drags the LLM module from the palette onto any location on the canvas.

   Function

   Input: Receives user/system prompt as input.

   Output: Produces the response from the selected LLM.

   Configuration Menu

   Right-clicking the LLM module opens a pop-up configuration menu.

   The menu is a choice-based UI (dropdowns, sliders, etc.), letting the user select the model, backend, and all relevant parameters in a single panel.

   Configurable Options

   LLM model selection (dropdown of available models)

   Backend selection (e.g., llama.cpp, gpt4all, ollama)

   Token limit, temperature, top-k, top-p, and any other available parameters

   Label Update

   When an LLM model is selected, the module label updates from “LLM” to the selected model’s name.

   Settings Update

   All available parameters for the selected LLM (as defined in models.json) are exposed and editable in the config panel.

   Once model & backend are selected, the module’s input schema is automatically adjusted to match model/backend requirements.

   Token Pruner

   Adjustable slider/input to set the maximum input token count (cannot exceed the model’s max token limit).

   Model Metadata

   All LLM details and options are loaded from the local models.json manifest, including templates, quant, RAM requirements, and descriptions.

   Model Selection & File Check

   Upon selecting a model:

   The system searches the local LLM directory for the model file.

   If missing: The system attempts to download the model, verifies md5sum, and retries on checksum failure until successful or cancelled.

   If present and valid: The model is used for all inference.

   Model Download Errors

   If download fails, a simple pop-up error informs the user. The system does not crash or remove the module; user can retry or select another model.

   Input Schema Mismatch / Flexible Flow

   If a user wires a module (e.g., Tool Call) to the LLM module and the selected LLM does not support that input type:

   The LLM module never breaks or rejects the connection.

   Unsupported input (like tool calls or metadata) is stripped and inserted into the user prompt sent to the LLM, as plain text.

   All data is delivered to the LLM node somehow; nothing is dropped or blocked.

   General Rule: No hard errors or broken connections. Any unsupported input is embedded as text into the prompt, so VOIDE always preserves user intent and workflow integrity.

