Core Principles

Circuit board analogy: Voide works like a development board for LLMs. Each module is a component, and wires represent data flow between them.

Modules = fixed pinouts (schemas): Every module has a defined schema that it accepts and emits.

Always connect: Voide must always connect modules as configured on the canvas, never blocking due to schema mismatches.

Fallback: If data does not match the strict schema, wrap it in the schema with default/blank values or downgrade to plain text.

Module Behavior

LLM module:

Expects structured input (system, user, assistant, context).

If a field is missing, Voide inserts it with default values (e.g. "", 0, []).

Schema enforcement happens inside the module.

If the backend doesn’t support system messages, the LLM module strips system and prepends it to user.

Memory module:

Expects fields like store, k, modes.

Defaults provided if missing.

Holds prompts/responses for reuse.

Prompt module:

Adds prompt text into the system message field, or injects into user message if backend doesn’t support system.

Divider/router modules:

Act as schema guards.

Pass data through if it matches schema.

Reroute to normalizers if not.

Schema Design

Local flow.schema.json is the best fit for Voide:

Requires kind field in nodes.

Defines llm and memory but with flexible requirements.

Edges have direction and type.

Supports structured data without being overly strict.

Remote HEAD schema is too strict (forces every field). Not aligned with Voide’s principle of “always connect.”

Schema evolution rule: enforce pin layout but allow defaults. Modules decide how to adapt fields.

Data Flow Example

User input enters from UI module.

Prompt module attaches prompt into system.

LLM module checks if backend accepts system.

If yes → use directly.

If no → move system into the front of user.

Memory/cache modules store/return configured responses.

Divider/router ensures data shape is correct or routes to normalizer.

Downstream LLMs (A, B, C…) can debate or compare responses depending on wiring.

Canonical Schema Approach (Recommended)

One canonical, append-only schema: Define a single, large envelope that contains fields for user input, prompts, responses from multiple LLMs (A, B, C…), cached outputs, and metadata.

Modules only read what they need: Each module declares a strict sub-schema it consumes and emits, while all other fields pass through unchanged.

Defaults for missing fields: Every field in the schema has a defined default ("", 0, [], {}), so modules always receive valid structures.

Append-only semantics: Modules never delete data, only add to the schema. This ensures provenance and replay.

Routers and dividers: These modules validate data against the expected sub-schema; if valid, pass through, otherwise reroute to a normalizer.

Efficient encoding: Use Protobuf (or similar) instead of raw JSON for schema evolution, optional fields, and oneof constructs.

Projections for efficiency: Modules work with lightweight projections (views) on the schema to avoid hauling unnecessary data.

Schema evolution: The envelope carries a version tag, and Voide includes migrators to upgrade old schema instances.

Privacy and retention: Add field-level redaction tags and TTLs so cached responses and sensitive fields can expire without breaking the flow.

Result: The circuit-board metaphor holds—modules are wired by pinouts, Voide always routes data, and modules adapt or normalize schema as needed. This preserves flexibility while preventing schema chaos.
