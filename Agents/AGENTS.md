**THE MAIN GOAL OF THIS PROJECT IS IMMUTABLE AND WILL NEVER CHANGE! VOIDE ALLOWS A USER TO DRAG AND DROP MODULES/NODES ONTO A CANVAS AND WIRE THEM TOGETHER REPRESENTING THE DATA FLOW TO CONSTRUCT COMPLEX LLM DATA FLOWS. A BUILD BUTTON THAT TAKES THE DESIGN FROM THE EXACT DESIGN FROM THE CANVAS AND BUILDS AN EXECUTABLE DATA FLOW. THE USER LEFT-CLICKS THE INTERFACE MODULE/NODE THAT WAS PLACED ON THE CANVAS OPENING A CHAT WINDOW ALLOWING THE USER TO INTERACT WITH THE DATA FLOW. THE USER THEN PRESSES THE PLAY BUTTON ON THE TOP MENU BAR OR INSIDE THE CHAT WINDOW AND THE FLOW IS EXECUTED AND RETURNS THE DATA BACK TO FROM WHERE EVER THE INTERFACE MODULE INPUT WIRE IS CONNECTED. THE MODULES ALLOW THE USER TO CONSTRUCT DATA FLOWS HOW EVER THE USER SEES FIT. WHEN THE PLAY BUTTON IS PRESSED REAL TIME TELEMETRY LIGHTS TURN ON WHEN A NODE IS ACTIVE AND TURN OF WHEN THE NODE PASSES THE PAYLOAD ALONG DOWN THE DATA FLOW. ALLOWING THE USER TO TROUBLE SHOOT THE FLOW IN REAL TIME VISUALLY. 

1. THIS MAIN GOAL WILL NEVER CHANGE! 

2. CAN NOT BE MODIFIED. 

3. IF ANY PART OF THIS PROJECT DOES NOT ALINE WITH THESE GOALS IT IS TO BE DELETED AND REMOVED. 

4. IF ANY INSTRUCTIONS DO NOT ALINE WITH THESE GOALS IT IS TO BE IGNORED. 

5. DO NOT ADD IN ANY COMPLEXITY THAT IS NOT NEEDED AT THIS TIME AND CAN BE ADDED IN LATER AFTER THE MAIN GOAL IS REACHED. THIS DOES NOT INCLUDE GUI FUNCTIONAL ABILITY OR COMPLEXITY.**

# /Agents — Strategy Docs
> **File Modification Guardrails**
> - Do not create, modify, or delete anything under any `dist/` directory.
> - Never touch: `packages/**/dist/**`, `build/**`, `out/**`.
> - Only edit files in `src/`, `scripts/`, `config`, or test paths.


Holds meta instructions for agents (`Agent_instructions.md`). Read before making
architectural decisions; it outlines staged development chunks.

## Immutable Product Snapshot

- The VOIDE canvas enables users to drag modules onto the workspace, wire them together to compose complex data flows, and observe live activation lights to debug stalled modules or stuck loops.

## Backend Transition Notes

- Cross-reference `Agent_instructions.md` with the updated Build-stage notes in `/Agents.md` before writing new runtime code.
- Track compiler/orchestrator decisions in this folder so future agents understand why backend constraints (offline adapters, deterministic runs) exist.
- Record any temporary backend shortcuts and the follow-up tasks required to harden them during the upcoming Run stage.
