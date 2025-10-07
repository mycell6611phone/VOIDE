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
