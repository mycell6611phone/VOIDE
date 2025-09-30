import React from "react";
import {
  DEFAULT_PROMPT_PRESET_ID,
  PROMPT_PRESETS,
  PROMPT_PRESET_MAP,
  inferPromptPresetFromText,
} from "@voide/shared";

export type ModuleCategory =
  | "prompt"
  | "debate"
  | "log"
  | "cache"
  | "divider"
  | "interface"
  | "memory"
  | "tool";

export type ParamsUpdater = (
  previousParams: Record<string, any>
) => Record<string, any>;

interface ModuleOptionsContentProps {
  module: ModuleCategory;
  params: Record<string, any> | undefined;
  onUpdate: (updater: ParamsUpdater) => void;
}

const containerStyle: React.CSSProperties = {
  padding: "12px 16px",
  display: "flex",
  flexDirection: "column",
  gap: 14,
  fontFamily: "Inter, system-ui, sans-serif",
  fontSize: 14,
  color: "#0f172a"
};

const headingStyle: React.CSSProperties = {
  margin: 0,
  fontSize: 16,
  fontWeight: 700
};

const descriptionStyle: React.CSSProperties = {
  margin: 0,
  fontSize: 12,
  color: "#64748b",
  lineHeight: 1.4
};

const fieldStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 6
};

const labelStyle: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 600,
  letterSpacing: 0.4,
  textTransform: "uppercase",
  color: "#475569"
};

const inputStyle: React.CSSProperties = {
  borderRadius: 8,
  border: "1px solid #cbd5f5",
  background: "#ffffff",
  padding: "8px 10px",
  fontSize: 13,
  color: "#111827",
  lineHeight: 1.4
};

const textAreaStyle: React.CSSProperties = {
  ...inputStyle,
  minHeight: 96,
  resize: "vertical" as const
};

const helperStyle: React.CSSProperties = {
  fontSize: 12,
  color: "#94a3b8"
};

const promptPresetListStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 8,
  marginTop: 6
};

const promptPresetButtonStyle: React.CSSProperties = {
  textAlign: "left",
  padding: "10px 12px",
  borderRadius: 8,
  border: "1px solid #e2e8f0",
  background: "#f8fafc",
  color: "#0f172a",
  display: "flex",
  flexDirection: "column",
  gap: 4,
  fontSize: 12,
  lineHeight: 1.4,
  cursor: "pointer",
  transition: "border-color 0.2s ease, background 0.2s ease"
};

const promptPresetButtonActiveStyle: React.CSSProperties = {
  border: "1px solid #2563eb",
  background: "#eff6ff",
  boxShadow: "0 0 0 1px rgba(37,99,235,0.12) inset"
};

const promptPresetLabelStyle: React.CSSProperties = {
  fontSize: 13,
  fontWeight: 600,
  color: "#0f172a"
};

const promptPresetDescriptionStyle: React.CSSProperties = {
  fontSize: 11,
  color: "#64748b",
  lineHeight: 1.4
};

const promptRadioGroupStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 6,
  marginTop: 6
};

const promptRadioLabelStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  fontSize: 12,
  color: "#0f172a"
};

const promptRadioInputStyle: React.CSSProperties = {
  accentColor: "#2563eb"
};

const promptTextareaStyle: React.CSSProperties = {
  ...textAreaStyle,
  resize: "none" as const,
  minHeight: 112
};

const paramsPreviewStyle: React.CSSProperties = {
  background: "#f8fafc",
  borderRadius: 8,
  padding: "10px 12px",
  fontSize: 12,
  color: "#1f2937",
  overflowX: "auto"
};

type PromptPlacement = "system" | "user";

interface NormalizedPromptParams {
  text: string;
  preset: string;
  to: PromptPlacement;
}

function normalizePromptParams(
  params: Record<string, any> | undefined
): NormalizedPromptParams {
  const rawText =
    typeof params?.text === "string"
      ? params.text
      : typeof params?.template === "string"
        ? params.template
        : "";

  let preset =
    typeof params?.preset === "string" && params.preset in PROMPT_PRESET_MAP
      ? params.preset
      : undefined;

  if (!preset) {
    const inferred = inferPromptPresetFromText(rawText);
    preset = inferred?.id;
  }

  const trimmed = rawText.trim();

  if (!preset) {
    preset = trimmed.length === 0 ? DEFAULT_PROMPT_PRESET_ID : "custom";
  }

  let text = rawText;
  if (preset !== "custom") {
    const presetText = PROMPT_PRESET_MAP[preset]?.defaultText ?? "";
    if (trimmed.length === 0) {
      text = presetText;
    } else if (trimmed !== presetText.trim()) {
      preset = "custom";
    }
  }

  if (preset === "custom") {
    text = rawText;
  }

  const to: PromptPlacement = params?.to === "system" ? "system" : "user";

  return { text, preset, to };
}

function producePromptParams(
  previous: Record<string, any> | undefined,
  next: NormalizedPromptParams
): Record<string, any> {
  const base =
    previous && typeof previous === "object" ? { ...previous } : {};
  delete base.template;
  delete base.tone;
  base.text = next.text;
  base.preset = next.preset;
  base.to = next.to;
  return base;
}

const moduleHeadings: Record<ModuleCategory, { title: string; description: string }>
  = {
    prompt: {
      title: "Prompt Settings",
      description: "Shape the instruction block sent to the connected model."
    },
    debate: {
      title: "Debate Loop",
      description: "Control how many passes collaborators take before resolving."
    },
    log: {
      title: "Log Capture",
      description: "Decide what the logger should keep from this stage."
    },
    cache: {
      title: "Cache Policy",
      description: "Reuse previous outputs or request fresh generations."
    },
    divider: {
      title: "Divider",
      description: "Label a branch point so canvases stay readable."
    },
    interface: {
      title: "Interface",
      description: "Configure the chat entry point into the flow."
    },
    memory: {
      title: "Memory",
      description: "Control how context is stored and recalled across runs."
    },
    tool: {
      title: "Tool Call",
      description: "Point the node at a callable tool with structured arguments."
    }
  };

function updateParamValue(
  onUpdate: ModuleOptionsContentProps["onUpdate"],
  key: string,
  value: unknown
) {
  onUpdate((previous) => {
    const base =
      previous && typeof previous === "object" ? { ...previous } : {};
    base[key] = value;
    return base;
  });
}

function PromptOptions({
  params,
  onUpdate
}: {
  params: Record<string, any> | undefined;
  onUpdate: ModuleOptionsContentProps["onUpdate"];
}) {
  const normalized = React.useMemo(
    () => normalizePromptParams(params),
    [params]
  );
  const textareaRef = React.useRef<HTMLTextAreaElement | null>(null);
  const radioGroupName = React.useId();

  React.useLayoutEffect(() => {
    if (!textareaRef.current) {
      return;
    }
    const element = textareaRef.current;
    element.style.height = "auto";
    element.style.height = `${Math.max(element.scrollHeight, 112)}px`;
  }, [normalized.text]);

  React.useEffect(() => {
    if (!params) {
      return;
    }
    const needsMigration =
      typeof params.text !== "string" ||
      typeof params.preset !== "string" ||
      !(params.preset in PROMPT_PRESET_MAP) ||
      params.template !== undefined ||
      params.tone !== undefined;

    if (!needsMigration) {
      return;
    }

    onUpdate((previous) => producePromptParams(previous, normalized));
  }, [params, normalized.text, normalized.preset, normalized.to, onUpdate]);

  const handlePresetSelect = (presetId: string) => {
    const resolved =
      presetId in PROMPT_PRESET_MAP ? presetId : DEFAULT_PROMPT_PRESET_ID;
    const preset = PROMPT_PRESET_MAP[resolved];
    const nextText =
      resolved === "custom"
        ? normalized.text
        : preset?.defaultText ?? normalized.text;

    onUpdate((previous) =>
      producePromptParams(previous, {
        text: nextText,
        preset: resolved,
        to: normalized.to,
      })
    );
  };

  const handlePlacementChange = (value: PromptPlacement) => {
    onUpdate((previous) =>
      producePromptParams(previous, {
        text: normalized.text,
        preset: normalized.preset,
        to: value,
      })
    );
  };

  const handleTextChange = (value: string) => {
    let candidatePreset =
      normalized.preset in PROMPT_PRESET_MAP
        ? normalized.preset
        : DEFAULT_PROMPT_PRESET_ID;
    const trimmed = value.trim();
    const presetText =
      candidatePreset !== "custom"
        ? PROMPT_PRESET_MAP[candidatePreset]?.defaultText.trim() ?? ""
        : "";

    if (candidatePreset !== "custom" && trimmed !== presetText) {
      candidatePreset = "custom";
    }

    if (candidatePreset === "custom") {
      const inferred = inferPromptPresetFromText(value);
      if (inferred && trimmed === inferred.defaultText.trim()) {
        candidatePreset = inferred.id;
      }
    }

    onUpdate((previous) =>
      producePromptParams(previous, {
        text: value,
        preset: candidatePreset,
        to: normalized.to,
      })
    );
  };

  return (
    <>
      <div style={fieldStyle}>
        <span style={labelStyle}>Prompt Preset</span>
        <div style={promptPresetListStyle}>
          {PROMPT_PRESETS.map((preset) => {
            const active = normalized.preset === preset.id;
            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => handlePresetSelect(preset.id)}
                aria-pressed={active}
                style={{
                  ...promptPresetButtonStyle,
                  ...(active ? promptPresetButtonActiveStyle : {}),
                }}
              >
                <span style={promptPresetLabelStyle}>{preset.label}</span>
                <span style={promptPresetDescriptionStyle}>
                  {preset.description}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div style={fieldStyle}>
        <span style={labelStyle}>Placement</span>
        <div style={promptRadioGroupStyle}>
          <label style={promptRadioLabelStyle}>
            <input
              type="radio"
              name={radioGroupName}
              value="user"
              checked={normalized.to === "user"}
              onChange={() => handlePlacementChange("user")}
              style={promptRadioInputStyle}
            />
            Inject as user message
          </label>
          <label style={promptRadioLabelStyle}>
            <input
              type="radio"
              name={radioGroupName}
              value="system"
              checked={normalized.to === "system"}
              onChange={() => handlePlacementChange("system")}
              style={promptRadioInputStyle}
            />
            Inject into system prompt
          </label>
        </div>
      </div>

      <div style={fieldStyle}>
        <span style={labelStyle}>Prompt Text</span>
        <textarea
          ref={textareaRef}
          style={promptTextareaStyle}
          value={normalized.text}
          onChange={(event) => handleTextChange(event.target.value)}
          placeholder="Describe the instructions to inject before the LLM runs"
        />
        <span style={helperStyle}>
          The textarea expands automatically as you type.
        </span>
      </div>
    </>
  );
}

function renderDebateOptions(
  params: Record<string, any> | undefined,
  onUpdate: ModuleOptionsContentProps["onUpdate"]
) {
  const mode = typeof params?.mode === "string" ? params.mode : "single-pass";
  const roundsValue =
    typeof params?.rounds === "number" && Number.isFinite(params.rounds)
      ? Math.max(1, Math.floor(params.rounds))
      : 2;

  return (
    <>
      <div style={fieldStyle}>
        <span style={labelStyle}>Mode</span>
        <select
          style={inputStyle}
          value={mode}
          onChange={(event) => updateParamValue(onUpdate, "mode", event.target.value)}
        >
          <option value="single-pass">Single Pass</option>
          <option value="multi-round">Multi-round</option>
          <option value="round-robin">Round Robin</option>
        </select>
      </div>

      <div style={fieldStyle}>
        <span style={labelStyle}>Rounds</span>
        <input
          style={inputStyle}
          type="number"
          min={1}
          value={roundsValue}
          onChange={(event) => {
            const parsed = Number.parseInt(event.target.value, 10);
            const next = Number.isFinite(parsed) ? Math.max(1, parsed) : 1;
            updateParamValue(onUpdate, "rounds", next);
          }}
        />
        <span style={helperStyle}>
          Higher counts give the loop more chances to refine an answer.
        </span>
      </div>
    </>
  );
}

function renderCacheOptions(
  params: Record<string, any> | undefined,
  onUpdate: ModuleOptionsContentProps["onUpdate"]
) {
  const strategy =
    typeof params?.strategy === "string" ? params.strategy : "reuse";
  const ttlSeconds =
    typeof params?.ttl === "number" && Number.isFinite(params.ttl)
      ? Math.max(0, Math.floor(params.ttl))
      : 1800;

  return (
    <>
      <div style={fieldStyle}>
        <span style={labelStyle}>Strategy</span>
        <select
          style={inputStyle}
          value={strategy}
          onChange={(event) =>
            updateParamValue(onUpdate, "strategy", event.target.value)
          }
        >
          <option value="reuse">Prefer Cached Value</option>
          <option value="refresh">Always Refresh</option>
          <option value="conditional">Refresh When Stale</option>
        </select>
      </div>

      <div style={fieldStyle}>
        <span style={labelStyle}>Time To Live (seconds)</span>
        <input
          style={inputStyle}
          type="number"
          min={0}
          value={ttlSeconds}
          onChange={(event) => {
            const parsed = Number.parseInt(event.target.value, 10);
            const next = Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
            updateParamValue(onUpdate, "ttl", next);
          }}
        />
      </div>
    </>
  );
}

function renderMemoryOptions(
  params: Record<string, any> | undefined,
  onUpdate: ModuleOptionsContentProps["onUpdate"]
) {
  const scope = typeof params?.scope === "string" ? params.scope : "session";
  const summary = typeof params?.summary === "string" ? params.summary : "";

  return (
    <>
      <div style={fieldStyle}>
        <span style={labelStyle}>Scope</span>
        <select
          style={inputStyle}
          value={scope}
          onChange={(event) => updateParamValue(onUpdate, "scope", event.target.value)}
        >
          <option value="session">Session Only</option>
          <option value="project">Project</option>
          <option value="global">Global</option>
        </select>
      </div>

      <div style={fieldStyle}>
        <span style={labelStyle}>Summary Notes</span>
        <textarea
          style={textAreaStyle}
          value={summary}
          onChange={(event) =>
            updateParamValue(onUpdate, "summary", event.target.value)
          }
          placeholder="Capture what future runs should remember"
        />
      </div>
    </>
  );
}

function renderDividerOptions(
  params: Record<string, any> | undefined,
  onUpdate: ModuleOptionsContentProps["onUpdate"]
) {
  const label = typeof params?.label === "string" ? params.label : "Checkpoint";
  const defaultPath =
    typeof params?.defaultPath === "string" ? params.defaultPath : "A";

  return (
    <>
      <div style={fieldStyle}>
        <span style={labelStyle}>Label</span>
        <input
          style={inputStyle}
          value={label}
          onChange={(event) => updateParamValue(onUpdate, "label", event.target.value)}
        />
      </div>

      <div style={fieldStyle}>
        <span style={labelStyle}>Default Path</span>
        <select
          style={inputStyle}
          value={defaultPath}
          onChange={(event) =>
            updateParamValue(onUpdate, "defaultPath", event.target.value)
          }
        >
          <option value="A">Path A</option>
          <option value="B">Path B</option>
          <option value="auto">Auto-select</option>
        </select>
      </div>
    </>
  );
}

function renderToolOptions(
  params: Record<string, any> | undefined,
  onUpdate: ModuleOptionsContentProps["onUpdate"]
) {
  const toolName =
    typeof params?.toolName === "string" ? params.toolName : "calculator";
  const argumentsJson =
    typeof params?.arguments === "string" ? params.arguments : "";

  return (
    <>
      <div style={fieldStyle}>
        <span style={labelStyle}>Tool Identifier</span>
        <input
          style={inputStyle}
          value={toolName}
          onChange={(event) =>
            updateParamValue(onUpdate, "toolName", event.target.value.trim())
          }
          placeholder="calculator"
        />
        <span style={helperStyle}>
          Must match a tool published in the workspace adapters.
        </span>
      </div>

      <div style={fieldStyle}>
        <span style={labelStyle}>Arguments (JSON)</span>
        <textarea
          style={textAreaStyle}
          value={argumentsJson}
          onChange={(event) =>
            updateParamValue(onUpdate, "arguments", event.target.value)
          }
          placeholder='{"query":"2+2"}'
        />
      </div>
    </>
  );
}

function renderLogOptions(
  params: Record<string, any> | undefined,
  onUpdate: ModuleOptionsContentProps["onUpdate"]
) {
  const level = typeof params?.level === "string" ? params.level : "info";
  const notes = typeof params?.notes === "string" ? params.notes : "";

  return (
    <>
      <div style={fieldStyle}>
        <span style={labelStyle}>Level</span>
        <select
          style={inputStyle}
          value={level}
          onChange={(event) => updateParamValue(onUpdate, "level", event.target.value)}
        >
          <option value="debug">Debug</option>
          <option value="info">Info</option>
          <option value="warn">Warn</option>
        </select>
      </div>

      <div style={fieldStyle}>
        <span style={labelStyle}>Notes</span>
        <textarea
          style={textAreaStyle}
          value={notes}
          onChange={(event) => updateParamValue(onUpdate, "notes", event.target.value)}
          placeholder="Describe what should be logged from this node"
        />
      </div>
    </>
  );
}

function renderInterfaceOptions(
  params: Record<string, any> | undefined,
  onUpdate: ModuleOptionsContentProps["onUpdate"]
) {
  const title = typeof params?.title === "string" ? params.title : "Chat";
  const placeholder =
    typeof params?.placeholder === "string"
      ? params.placeholder
      : "Ask the team anything";

  return (
    <>
      <div style={fieldStyle}>
        <span style={labelStyle}>Window Title</span>
        <input
          style={inputStyle}
          value={title}
          onChange={(event) => updateParamValue(onUpdate, "title", event.target.value)}
        />
      </div>

      <div style={fieldStyle}>
        <span style={labelStyle}>Input Placeholder</span>
        <input
          style={inputStyle}
          value={placeholder}
          onChange={(event) =>
            updateParamValue(onUpdate, "placeholder", event.target.value)
          }
        />
      </div>
    </>
  );
}

function renderModuleOptions(
  module: ModuleCategory,
  params: Record<string, any> | undefined,
  onUpdate: ModuleOptionsContentProps["onUpdate"]
) {
  switch (module) {
    case "prompt":
      return <PromptOptions params={params} onUpdate={onUpdate} />;
    case "debate":
      return renderDebateOptions(params, onUpdate);
    case "cache":
      return renderCacheOptions(params, onUpdate);
    case "memory":
      return renderMemoryOptions(params, onUpdate);
    case "divider":
      return renderDividerOptions(params, onUpdate);
    case "tool":
      return renderToolOptions(params, onUpdate);
    case "log":
      return renderLogOptions(params, onUpdate);
    case "interface":
      return renderInterfaceOptions(params, onUpdate);
    default:
      return (
        <div style={helperStyle}>No editable settings are available yet.</div>
      );
  }
}

export default function ModuleOptionsContent({
  module,
  params,
  onUpdate
}: ModuleOptionsContentProps) {
  const heading = moduleHeadings[module];

  return (
    <div style={containerStyle}>
      <div>
        <h4 style={headingStyle}>{heading.title}</h4>
        <p style={descriptionStyle}>{heading.description}</p>
      </div>

      {renderModuleOptions(module, params, onUpdate)}

      <div style={fieldStyle}>
        <span style={labelStyle}>Raw Parameters</span>
        <pre style={paramsPreviewStyle}>
          {JSON.stringify(params ?? {}, null, 2)}
        </pre>
      </div>
    </div>
  );
}
