Canvas construction (modules + wires).

Build step (system generates the wiring logic).

Run step (execute + visualization).

Live monitoring (activation lights).

Data retrieval anywhere in the flow.VOIDE — North Star

Goal
Goal: Enable users to drag modules onto a canvas, connect them with data-flow wires, and click Build. The system then generates the underlying connections according to the canvas layout. With Run, the designed data flow executes, and the user can watch values move through each module in real time, visualized by activation lights on the canvas. Users can also retrieve results at the final output or at any chosen point in the flow.

Guiding rules

UI first: build canvas, menus, palette, wiring tool, module Icons and menu options, and buttons.

Modules second: LLM, Prompt, Input/response, Debate/loop, Divider, Cache, Memory, Tool Call, Log.

Backend Third: only after UI and modules are complete, connect each control to its function.

Add items only when needed: if not required now, it waits.

Every change must answer: does this help the Canvas Layout or Build → Run → Watch flow?


