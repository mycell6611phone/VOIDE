LLM Module Blueprint

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
