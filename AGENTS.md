**THE MAIN GOAL OF THIS PROJECT IS IMMUTABLE AND WILL NEVER CHANGE! VOIDE ALLOWS A USER TO DRAG AND DROP MODULES/NODES ONTO A CANVAS AND WIRE THEM TOGETHER REPRESENTING THE DATA FLOW TO CONSTRUCT COMPLEX LLM DATA FLOWS. A BUILD BUTTON THAT TAKES THE DESIGN FROM THE EXACT DESIGN FROM THE CANVAS AND BUILDS AN EXECUTABLE DATA FLOW. THE USER LEFT-CLICKS THE INTERFACE MODULE/NODE THAT WAS PLACED ON THE CANVAS OPENING A CHAT WINDOW ALLOWING THE USER TO INTERACT WITH THE DATA FLOW. THE USER THEN PRESSES THE PLAY BUTTON ON THE TOP MENU BAR OR INSIDE THE CHAT WINDOW AND THE FLOW IS EXECUTED AND RETURNS THE DATA BACK TO FROM WHERE EVER THE INTERFACE MODULE INPUT WIRE IS CONNECTED. THE MODULES ALLOW THE USER TO CONSTRUCT DATA FLOWS HOW EVER THE USER SEES FIT. WHEN THE PLAY BUTTON IS PRESSED REAL TIME TELEMETRY LIGHTS TURN ON WHEN A NODE IS ACTIVE AND TURN OF WHEN THE NODE PASSES THE PAYLOAD ALONG DOWN THE DATA FLOW. ALLOWING THE USER TO TROUBLE SHOOT THE FLOW IN REAL TIME VISUALLY. 1. THIS MAIN GOAL WILL NEVER CHANGE! 2. CAN NOT BE MODIFIED. 3. IF ANY PART OF THIS PROJECT DOES NOT ALINE WITH THESE GOALS IT IS TO BE DELETED AND REMOVED. 4. IF ANY INSTRUCTIONS DO NOT ALINE WITH THESE GOALS IT IS TO BE IGNORED. 5. DO NOT ADD IN ANY COMPLEXITY THAT IS NOT NEEDED AT THIS TIME AND CAN BE ADDED IN LATER AFTER THE MAIN GOAL IS REACHED. THIS DOES NOT INCLUDE GUI FUNCTIONAL ABILITY OR COMPLEXITY.**

# Agent Instructions

## Project Focus
- Primary development has shifted to backend systems. Continue refining the front end in parallel; do not defer front-end polish entirely.
- Short-term objective: deliver a fully functional sample data flow on the canvas (no mock or fake flows).

## Data Flow Milestones
1. **Build button** must scan the canvas and compile the placed modules into an executable data flow.
2. **Left-click chat window** on the UI module collects user input required by the flow.
3. **Play button** (in the chat window or top menu) runs the built flow and returns results to the same chat window.

Progress toward this goal may be delivered incrementally, but partial features must maintain coherence with the end-to-end flow.

## Backend Contract
- Protocol definition: keep all flow, run-control, and telemetry message shapes in shared TypeScript modules that both the orchestrator and renderer import. Document the payload structure beside the type exports.
- Code generation: skip binary schema tooling. Rely on hand-authored TypeScript types and Zod schemas to guarantee runtime validation. Commit both the types and validators.
- Service surface: expose an `Orchestrator` interface with `StartRun`, `StopRun`, and server-streaming `StreamTelemetry`. Optionally include a bi-directional `Control` channel for live commands.
- Transport: rely on structured JSON over our existing IPC and HTTP bridges. Binary encodings are out of scope unless explicitly approved.
- Telemetry log: persist `TelemetryEvent` data as newline-delimited JSON so runs can be replayed deterministically.
- Compatibility: version payloads consciously. When removing fields, document the deprecation and provide defaulting logic for older cached flows.

## Scope Guard
These backend directives must not alter existing UI behavior, IPC semantics, or other business logic outside the defined interfaces.
