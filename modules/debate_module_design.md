Debate Module Blueprint

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

