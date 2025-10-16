1. Ports

Input: stream_in — receives data packets.

Output: stream_out — emits aggregated packets.

Each packet entering triggers state update and conditional emission.

2. Behavior

On every pass, the module:

Saves the incoming packet to internal state (FIFO or ring buffer).

Prepends or appends prior packets (depending on design) up to N recent passes.

Emits the concatenated list as the current output.

Example for N = 3:

Input sequence: A → B → C → D
Outputs:
A → [A, B] → [A, B, C] → [B, C, D]

After the buffer reaches capacity, the oldest entry drops.

3. Options Menu (UI)

User-configurable parameters accessed by left-click:

max_passes (integer): number of past packets to retain.

Optional flags:

prepend_mode (bool): whether to place old data in front or behind.

clear_on_build (bool): reset cache when workflow restarts.

4. Implementation Notes

Internal store: circular list or deque.

Emits updated aggregate payload every time input arrives.

Test must confirm:

Order correctness.

Proper truncation at limit.

Independence between workflow runs.

