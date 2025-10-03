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

const memorySectionStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 12,
  paddingTop: 12,
  borderTop: "1px solid #e2e8f0"
};

const memorySectionTitleStyle: React.CSSProperties = {
  display: "block",
  fontSize: 13,
  fontWeight: 600,
  color: "#0f172a",
  marginBottom: 2
};

const memorySectionDescriptionStyle: React.CSSProperties = {
  margin: 0,
  fontSize: 11,
  color: "#64748b",
  lineHeight: 1.4
};

const inlineFieldRowStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)",
  gap: 12
};

const checkboxGroupStyle: React.CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: 12
};

const checkboxLabelStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  fontSize: 12,
  color: "#0f172a"
};

const buttonRowStyle: React.CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: 10
};

const memoryButtonStyle: React.CSSProperties = {
  borderRadius: 8,
  border: "1px solid #cbd5f5",
  background: "#ffffff",
  padding: "8px 14px",
  fontSize: 12,
  fontWeight: 600,
  color: "#1e3a8a",
  cursor: "pointer",
  transition: "box-shadow 0.2s ease, border-color 0.2s ease",
  boxShadow: "0 1px 0 rgba(15,23,42,0.05)"
};

const memoryDangerButtonStyle: React.CSSProperties = {
  ...memoryButtonStyle,
  border: "1px solid #fca5a5",
  color: "#b91c1c"
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

function MemorySection({
  title,
  description,
  children,
  hideDivider = false
}: {
  title: string;
  description: string;
  children: React.ReactNode;
  hideDivider?: boolean;
}) {
  const sectionStyle = hideDivider
    ? { ...memorySectionStyle, borderTop: "none", paddingTop: 0 }
    : memorySectionStyle;

  return (
    <div style={sectionStyle}>
      <div>
        <span style={memorySectionTitleStyle}>{title}</span>
        <p style={memorySectionDescriptionStyle}>{description}</p>
      </div>
      {children}
    </div>
  );
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
  const restoreFocusRef = React.useRef(false);
  const selectionRangeRef = React.useRef<{ start: number; end: number } | null>(
    null
  );
  const radioGroupName = React.useId();

  React.useLayoutEffect(() => {
    if (!textareaRef.current) {
      return;
    }
    const element = textareaRef.current;
    element.style.height = "auto";
    element.style.height = `${Math.max(element.scrollHeight, 112)}px`;

    if (restoreFocusRef.current) {
      if (document.activeElement !== element) {
        element.focus({ preventScroll: true });
      }
      const range = selectionRangeRef.current;
      if (range) {
        const start = Number.isFinite(range.start) ? range.start : element.value.length;
        const end = Number.isFinite(range.end) ? range.end : start;
        try {
          element.setSelectionRange(start, end);
        } catch (error) {
          // Ignore selection errors (e.g., when element is read-only)
        }
      }
      restoreFocusRef.current = false;
      selectionRangeRef.current = null;
    }
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

  const handleTextChange = (
    event: React.ChangeEvent<HTMLTextAreaElement>
  ) => {
    const { value, selectionStart, selectionEnd } = event.target;
    if (document.activeElement === event.target) {
      restoreFocusRef.current = true;
      const start =
        typeof selectionStart === "number" && Number.isFinite(selectionStart)
          ? selectionStart
          : value.length;
      const end =
        typeof selectionEnd === "number" && Number.isFinite(selectionEnd)
          ? selectionEnd
          : start;
      selectionRangeRef.current = { start, end };
    } else {
      restoreFocusRef.current = false;
      selectionRangeRef.current = null;
    }

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
          onChange={handleTextChange}
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

function MemoryOptions({
  params,
  onUpdate
}: {
  params: Record<string, any> | undefined;
  onUpdate: ModuleOptionsContentProps["onUpdate"];
}) {
  const ttlMultipliers = React.useMemo(
    () => ({ minutes: 60, hours: 3600, days: 86400 } as const),
    []
  );
  type TtlUnit = keyof typeof ttlMultipliers;

  const sizeMultipliers = React.useMemo(
    () => ({ items: 1, mb: 1024 * 1024, gb: 1024 * 1024 * 1024 } as const),
    []
  );
  type SizeUnit = keyof typeof sizeMultipliers;

  const dimensionalityGroupId = React.useId();

  const memoryType =
    typeof params?.memoryType === "string" ? params.memoryType : "buffer";
  const persistence =
    params?.persistence === "persistent" ? "persistent" : "ephemeral";
  const tokenLimit =
    typeof params?.tokenLimit === "number" && Number.isFinite(params.tokenLimit)
      ? Math.max(0, Math.floor(params.tokenLimit))
      : 4096;
  const vectorBackend =
    typeof params?.vectorBackend === "string" ? params.vectorBackend : "faiss";

  const storedTtlUnit =
    typeof params?.ttlUnit === "string" && params.ttlUnit in ttlMultipliers
      ? (params.ttlUnit as TtlUnit)
      : "hours";
  const storedTtlSeconds =
    typeof params?.ttlSeconds === "number" && Number.isFinite(params.ttlSeconds)
      ? Math.max(0, Math.round(params.ttlSeconds))
      : undefined;
  const storedTtlValue =
    typeof params?.ttlValue === "number" && Number.isFinite(params.ttlValue)
      ? Math.max(0, Math.round(params.ttlValue))
      : undefined;
  const ttlUnit = storedTtlUnit;
  const ttlValue = storedTtlValue ??
    (storedTtlSeconds !== undefined
      ? Math.max(0, Math.round(storedTtlSeconds / ttlMultipliers[ttlUnit]))
      : 12);
  const effectiveTtlSeconds =
    storedTtlSeconds ?? ttlValue * ttlMultipliers[ttlUnit];

  const updateTtl = React.useCallback(
    (value: number, unit: TtlUnit) => {
      const safeValue = Number.isFinite(value) ? Math.max(0, Math.round(value)) : 0;
      onUpdate((previous) => {
        const base =
          previous && typeof previous === "object" ? { ...previous } : {};
        base.ttlValue = safeValue;
        base.ttlUnit = unit;
        base.ttlSeconds = safeValue * ttlMultipliers[unit];
        return base;
      });
    },
    [onUpdate, ttlMultipliers]
  );

  const storedSizeUnit =
    typeof params?.maxSizeUnit === "string" && params.maxSizeUnit in sizeMultipliers
      ? (params.maxSizeUnit as SizeUnit)
      : "items";
  const storedMaxItems =
    typeof params?.maxItems === "number" && Number.isFinite(params.maxItems)
      ? Math.max(0, Math.round(params.maxItems))
      : undefined;
  const storedMaxBytes =
    typeof params?.maxMemoryBytes === "number" && Number.isFinite(params.maxMemoryBytes)
      ? Math.max(0, Math.round(params.maxMemoryBytes))
      : undefined;
  const storedMaxValue =
    typeof params?.maxSizeValue === "number" && Number.isFinite(params.maxSizeValue)
      ? Math.max(0, Math.round(params.maxSizeValue))
      : undefined;
  const maxSizeUnit: SizeUnit = storedSizeUnit;
  const maxSizeValue = (() => {
    if (storedMaxValue !== undefined) {
      return storedMaxValue;
    }
    if (maxSizeUnit === "items" && storedMaxItems !== undefined) {
      return storedMaxItems;
    }
    if (maxSizeUnit !== "items" && storedMaxBytes !== undefined) {
      return Math.max(
        0,
        Math.round(storedMaxBytes / sizeMultipliers[maxSizeUnit])
      );
    }
    return maxSizeUnit === "items" ? 500 : 512;
  })();

  const updateMaxSize = React.useCallback(
    (value: number, unit: SizeUnit) => {
      const safeValue = Number.isFinite(value)
        ? Math.max(0, Math.round(value))
        : 0;
      onUpdate((previous) => {
        const base =
          previous && typeof previous === "object" ? { ...previous } : {};
        base.maxSizeValue = safeValue;
        base.maxSizeUnit = unit;
        if (unit === "items") {
          base.maxItems = safeValue;
          delete base.maxMemoryBytes;
        } else {
          base.maxMemoryBytes = safeValue * sizeMultipliers[unit];
          delete base.maxItems;
        }
        return base;
      });
    },
    [onUpdate, sizeMultipliers]
  );

  const retrievalCount = (() => {
    const raw =
      typeof params?.retrievalCount === "number" && Number.isFinite(params.retrievalCount)
        ? params.retrievalCount
        : typeof params?.k === "number" && Number.isFinite(params.k)
          ? params.k
          : 3;
    return Math.max(1, Math.round(raw));
  })();

  const retrievalStrategy =
    typeof params?.retrievalStrategy === "string"
      ? params.retrievalStrategy
      : "similarity";
  const scoreThreshold =
    typeof params?.scoreThreshold === "number" && Number.isFinite(params.scoreThreshold)
      ? Math.min(1, Math.max(0, params.scoreThreshold))
      : 0.3;
  const deduplicate = params?.deduplicate !== false;

  const summarizationMethod =
    typeof params?.summarizationMethod === "string"
      ? params.summarizationMethod
      : "extractive";
  const chunkSize =
    typeof params?.chunkSize === "number" && Number.isFinite(params.chunkSize)
      ? Math.max(1, Math.round(params.chunkSize))
      : 512;
  const chunkOverlap =
    typeof params?.chunkOverlap === "number" && Number.isFinite(params.chunkOverlap)
      ? Math.max(0, Math.round(params.chunkOverlap))
      : 64;
  const compressionStrategy =
    typeof params?.compressionStrategy === "string"
      ? params.compressionStrategy
      : "full";
  const compressionTokens =
    typeof params?.compressionTokens === "number" && Number.isFinite(params.compressionTokens)
      ? Math.max(1, Math.round(params.compressionTokens))
      : 256;

  const embeddingModel =
    typeof params?.embeddingModel === "string"
      ? params.embeddingModel
      : "openai-ada-002";
  const vectorDbProfile =
    typeof params?.vectorDb === "string" ? params.vectorDb : "primary";

  const dimensionalityMode =
    params?.dimensionalityMode === "manual" ? "manual" : "auto";
  const dimensionality =
    typeof params?.dimensionality === "number" && Number.isFinite(params.dimensionality)
      ? Math.max(1, Math.round(params.dimensionality))
      : 1536;

  const batchSize =
    typeof params?.batchSize === "number" && Number.isFinite(params.batchSize)
      ? Math.max(1, Math.round(params.batchSize))
      : 32;

  const similarityMetric =
    typeof params?.similarityMetric === "string"
      ? params.similarityMetric
      : params?.normalizeVectors === false
        ? "dot"
        : "cosine";

  const roleContextRaw =
    params && typeof params.roleContext === "object" && params.roleContext !== null
      ? params.roleContext
      : undefined;
  const roleContext = {
    system: roleContextRaw?.system !== false,
    user: roleContextRaw?.user !== false,
    assistant: roleContextRaw?.assistant !== false
  } as const;

  const conversationScope =
    typeof params?.conversationScope === "string"
      ? params.conversationScope
      : "session";

  const tagsValue =
    typeof params?.tagsRaw === "string"
      ? params.tagsRaw
      : Array.isArray(params?.tags)
        ? params?.tags.filter((tag): tag is string => typeof tag === "string").join(", ")
        : "";

  const inspectRetrieved = params?.inspectRetrieved === true;

  const updateRetrievalCount = React.useCallback(
    (value: number) => {
      const safeValue = Math.max(1, Math.round(Number.isFinite(value) ? value : 1));
      onUpdate((previous) => {
        const base =
          previous && typeof previous === "object" ? { ...previous } : {};
        base.retrievalCount = safeValue;
        base.k = safeValue;
        return base;
      });
    },
    [onUpdate]
  );

  const toggleRole = React.useCallback(
    (role: keyof typeof roleContext) => {
      onUpdate((previous) => {
        const base =
          previous && typeof previous === "object" ? { ...previous } : {};
        const existing =
          base.roleContext && typeof base.roleContext === "object"
            ? { ...base.roleContext }
            : { system: true, user: true, assistant: true };
        existing[role] = !roleContext[role];
        base.roleContext = existing;
        return base;
      });
    },
    [onUpdate, roleContext]
  );

  const handleExport = React.useCallback(() => {
    onUpdate((previous) => {
      const base =
        previous && typeof previous === "object" ? { ...previous } : {};
      base.lastExportedAt = new Date().toISOString();
      return base;
    });
  }, [onUpdate]);

  const handleImport = React.useCallback(() => {
    onUpdate((previous) => {
      const base =
        previous && typeof previous === "object" ? { ...previous } : {};
      base.lastImportedAt = new Date().toISOString();
      return base;
    });
  }, [onUpdate]);

  const handleClearMemory = React.useCallback(() => {
    onUpdate((previous) => {
      const base =
        previous && typeof previous === "object" ? { ...previous } : {};
      const count =
        typeof base.clearMemoryCounter === "number" && Number.isFinite(base.clearMemoryCounter)
          ? base.clearMemoryCounter
          : 0;
      base.clearMemoryCounter = count + 1;
      base.lastClearedAt = new Date().toISOString();
      return base;
    });
  }, [onUpdate]);

  const handleTagsChange = React.useCallback(
    (raw: string) => {
      onUpdate((previous) => {
        const base =
          previous && typeof previous === "object" ? { ...previous } : {};
        const list = raw
          .split(",")
          .map((tag) => tag.trim())
          .filter((tag) => tag.length > 0);
        base.tags = list;
        base.tagsRaw = raw;
        return base;
      });
    },
    [onUpdate]
  );

  return (
    <>
      <MemorySection
        title="General"
        description="Define the storage format and lifecycle."
        hideDivider
      >
        <div style={fieldStyle}>
          <span style={labelStyle}>Memory Type</span>
          <select
            style={inputStyle}
            value={memoryType}
            onChange={(event) =>
              updateParamValue(onUpdate, "memoryType", event.target.value)
            }
          >
            <option value="buffer">Buffer</option>
            <option value="summary">Summary</option>
            <option value="vector">Vector</option>
            <option value="episodic">Episodic</option>
            <option value="windowed">Windowed</option>
            <option value="key-value">Key-Value</option>
          </select>
        </div>

        <div style={fieldStyle}>
          <span style={labelStyle}>Persistence</span>
          <select
            style={inputStyle}
            value={persistence}
            onChange={(event) =>
              updateParamValue(onUpdate, "persistence", event.target.value)
            }
          >
            <option value="ephemeral">Ephemeral</option>
            <option value="persistent">Persistent</option>
          </select>
          <span style={helperStyle}>
            Toggle between in-session memory and disk-backed storage.
          </span>
        </div>

        <div style={fieldStyle}>
          <span style={labelStyle}>Token Limit</span>
          <input
            style={inputStyle}
            type="number"
            min={0}
            value={tokenLimit}
            onChange={(event) => {
              const parsed = Number.parseInt(event.target.value, 10);
              const nextValue = Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
              updateParamValue(onUpdate, "tokenLimit", nextValue);
            }}
          />
          <span style={helperStyle}>
            Truncate or summarize entries when exceeding the limit.
          </span>
        </div>

        <div style={fieldStyle}>
          <span style={labelStyle}>Vector Backend</span>
          <select
            style={inputStyle}
            value={vectorBackend}
            onChange={(event) =>
              updateParamValue(onUpdate, "vectorBackend", event.target.value)
            }
          >
            <option value="faiss">FAISS</option>
            <option value="chroma">Chroma</option>
            <option value="pinecone">Pinecone</option>
            <option value="milvus">Milvus</option>
            <option value="weaviate">Weaviate</option>
          </select>
        </div>

        <div style={fieldStyle}>
          <span style={labelStyle}>Time To Live</span>
          <div style={inlineFieldRowStyle}>
            <input
              style={inputStyle}
              type="number"
              min={0}
              value={ttlValue}
              onChange={(event) => {
                const parsed = Number.parseInt(event.target.value, 10);
                updateTtl(parsed, ttlUnit);
              }}
            />
            <select
              style={inputStyle}
              value={ttlUnit}
              onChange={(event) => {
                const nextUnit = event.target.value as TtlUnit;
                const seconds = effectiveTtlSeconds;
                const nextValue = Math.max(
                  0,
                  Math.round(seconds / ttlMultipliers[nextUnit])
                );
                updateTtl(nextValue, nextUnit);
              }}
            >
              <option value="minutes">Minutes</option>
              <option value="hours">Hours</option>
              <option value="days">Days</option>
            </select>
          </div>
          <span style={helperStyle}>
            Auto-expire memories after the selected duration.
          </span>
        </div>

        <div style={fieldStyle}>
          <span style={labelStyle}>Max Memory Size</span>
          <div style={inlineFieldRowStyle}>
            <input
              style={inputStyle}
              type="number"
              min={0}
              value={maxSizeValue}
              onChange={(event) => {
                const parsed = Number.parseInt(event.target.value, 10);
                updateMaxSize(parsed, maxSizeUnit);
              }}
            />
            <select
              style={inputStyle}
              value={maxSizeUnit}
              onChange={(event) => {
                const nextUnit = event.target.value as SizeUnit;
                if (nextUnit === maxSizeUnit) {
                  updateMaxSize(maxSizeValue, nextUnit);
                  return;
                }
                const defaultValue =
                  nextUnit === "items" ? 500 : nextUnit === "mb" ? 512 : 1;
                updateMaxSize(defaultValue, nextUnit);
              }}
            >
              <option value="items">Items</option>
              <option value="mb">MB</option>
              <option value="gb">GB</option>
            </select>
          </div>
          <span style={helperStyle}>
            Limit by item count or total storage footprint.
          </span>
        </div>
      </MemorySection>

      <MemorySection
        title="Retrieval"
        description="Control how prior memories are fetched."
      >
        <div style={fieldStyle}>
          <span style={labelStyle}>Retrieval Count (k)</span>
          <input
            style={inputStyle}
            type="number"
            min={1}
            value={retrievalCount}
            onChange={(event) => {
              const parsed = Number.parseInt(event.target.value, 10);
              updateRetrievalCount(Number.isFinite(parsed) ? parsed : 1);
            }}
          />
        </div>

        <div style={fieldStyle}>
          <span style={labelStyle}>Retrieval Strategy</span>
          <select
            style={inputStyle}
            value={retrievalStrategy}
            onChange={(event) =>
              updateParamValue(onUpdate, "retrievalStrategy", event.target.value)
            }
          >
            <option value="similarity">Similarity</option>
            <option value="mmr">Max Marginal Relevance</option>
            <option value="hybrid">Hybrid</option>
          </select>
        </div>

        <div style={fieldStyle}>
          <span style={labelStyle}>Score Threshold</span>
          <input
            style={inputStyle}
            type="number"
            min={0}
            max={1}
            step={0.05}
            value={scoreThreshold}
            onChange={(event) => {
              const parsed = Number.parseFloat(event.target.value);
              const next = Number.isFinite(parsed)
                ? Math.min(1, Math.max(0, parsed))
                : 0;
              updateParamValue(onUpdate, "scoreThreshold", next);
            }}
          />
          <span style={helperStyle}>
            Minimum similarity score required for recall.
          </span>
        </div>

        <label style={checkboxLabelStyle}>
          <input
            type="checkbox"
            checked={deduplicate}
            onChange={(event) =>
              updateParamValue(onUpdate, "deduplicate", event.target.checked)
            }
          />
          Deduplicate near-identical entries
        </label>
      </MemorySection>

      <MemorySection
        title="Summarization & Compression"
        description="Keep memory footprints tight without losing fidelity."
      >
        <div style={fieldStyle}>
          <span style={labelStyle}>Summarization Method</span>
          <select
            style={inputStyle}
            value={summarizationMethod}
            onChange={(event) =>
              updateParamValue(onUpdate, "summarizationMethod", event.target.value)
            }
          >
            <option value="off">Off</option>
            <option value="extractive">Extractive</option>
            <option value="abstractive">Abstractive</option>
          </select>
        </div>

        <div style={fieldStyle}>
          <span style={labelStyle}>Chunk Size</span>
          <input
            style={inputStyle}
            type="number"
            min={1}
            value={chunkSize}
            onChange={(event) => {
              const parsed = Number.parseInt(event.target.value, 10);
              const next = Number.isFinite(parsed) ? Math.max(1, parsed) : 1;
              updateParamValue(onUpdate, "chunkSize", next);
            }}
          />
        </div>

        <div style={fieldStyle}>
          <span style={labelStyle}>Chunk Overlap</span>
          <input
            style={inputStyle}
            type="number"
            min={0}
            value={chunkOverlap}
            onChange={(event) => {
              const parsed = Number.parseInt(event.target.value, 10);
              const next = Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
              updateParamValue(onUpdate, "chunkOverlap", next);
            }}
          />
        </div>

        <div style={fieldStyle}>
          <span style={labelStyle}>Compression Strategy</span>
          <select
            style={inputStyle}
            value={compressionStrategy}
            onChange={(event) =>
              updateParamValue(onUpdate, "compressionStrategy", event.target.value)
            }
          >
            <option value="full">Keep Full Text</option>
            <option value="summary">Keep Summary</option>
            <option value="first-n">Keep First N Tokens</option>
            <option value="last-n">Keep Last N Tokens</option>
          </select>
        </div>

        {(compressionStrategy === "first-n" || compressionStrategy === "last-n") && (
          <div style={fieldStyle}>
            <span style={labelStyle}>Tokens To Retain</span>
            <input
              style={inputStyle}
              type="number"
              min={1}
              value={compressionTokens}
              onChange={(event) => {
                const parsed = Number.parseInt(event.target.value, 10);
                const next = Number.isFinite(parsed) ? Math.max(1, parsed) : 1;
                updateParamValue(onUpdate, "compressionTokens", next);
              }}
            />
          </div>
        )}
      </MemorySection>

      <MemorySection
        title="Embeddings"
        description="Tune how memories are indexed and searched."
      >
        <div style={fieldStyle}>
          <span style={labelStyle}>Embedding Model</span>
          <select
            style={inputStyle}
            value={embeddingModel}
            onChange={(event) =>
              updateParamValue(onUpdate, "embeddingModel", event.target.value)
            }
          >
            <option value="openai-ada-002">OpenAI ada-002</option>
            <option value="instructor-xl">Instructor-XL</option>
            <option value="bge-large">BGE Large</option>
            <option value="mxbai-sbert">mxbai S-BERT</option>
          </select>
        </div>

        <div style={fieldStyle}>
          <span style={labelStyle}>Vector DB Profile</span>
          <select
            style={inputStyle}
            value={vectorDbProfile}
            onChange={(event) =>
              updateParamValue(onUpdate, "vectorDb", event.target.value)
            }
          >
            <option value="primary">Primary</option>
            <option value="staging">Staging</option>
            <option value="local">Local Sandbox</option>
            <option value="custom">Custom Endpoint</option>
          </select>
        </div>

        <div style={fieldStyle}>
          <span style={labelStyle}>Dimensionality</span>
          <div style={checkboxGroupStyle}>
            <label style={checkboxLabelStyle}>
              <input
                type="radio"
                name={dimensionalityGroupId}
                value="auto"
                checked={dimensionalityMode === "auto"}
                onChange={() => {
                  onUpdate((previous) => {
                    const base =
                      previous && typeof previous === "object" ? { ...previous } : {};
                    base.dimensionalityMode = "auto";
                    delete base.dimensionality;
                    return base;
                  });
                }}
              />
              Auto
            </label>
            <label style={checkboxLabelStyle}>
              <input
                type="radio"
                name={dimensionalityGroupId}
                value="manual"
                checked={dimensionalityMode === "manual"}
                onChange={() => {
                  onUpdate((previous) => {
                    const base =
                      previous && typeof previous === "object" ? { ...previous } : {};
                    base.dimensionalityMode = "manual";
                    base.dimensionality = dimensionality;
                    return base;
                  });
                }}
              />
              Manual
            </label>
          </div>
          {dimensionalityMode === "manual" && (
            <input
              style={inputStyle}
              type="number"
              min={1}
              value={dimensionality}
              onChange={(event) => {
                const parsed = Number.parseInt(event.target.value, 10);
                const next = Number.isFinite(parsed) ? Math.max(1, parsed) : 1;
                updateParamValue(onUpdate, "dimensionality", next);
              }}
            />
          )}
        </div>

        <div style={fieldStyle}>
          <span style={labelStyle}>Batch Size</span>
          <input
            style={inputStyle}
            type="number"
            min={1}
            value={batchSize}
            onChange={(event) => {
              const parsed = Number.parseInt(event.target.value, 10);
              const next = Number.isFinite(parsed) ? Math.max(1, parsed) : 1;
              updateParamValue(onUpdate, "batchSize", next);
            }}
          />
        </div>

        <div style={fieldStyle}>
          <span style={labelStyle}>Similarity Metric</span>
          <select
            style={inputStyle}
            value={similarityMetric}
            onChange={(event) => {
              const metric = event.target.value;
              onUpdate((previous) => {
                const base =
                  previous && typeof previous === "object" ? { ...previous } : {};
                base.similarityMetric = metric;
                base.normalizeVectors = metric === "cosine";
                return base;
              });
            }}
          >
            <option value="cosine">Cosine (Normalized)</option>
            <option value="dot">Dot Product</option>
          </select>
        </div>
      </MemorySection>

      <MemorySection
        title="Access & Context"
        description="Scope memories to specific roles and sessions."
      >
        <div style={fieldStyle}>
          <span style={labelStyle}>Role-Based Context</span>
          <div style={checkboxGroupStyle}>
            {(
              [
                ["system", "System"],
                ["user", "User"],
                ["assistant", "Assistant"]
              ] as Array<[keyof typeof roleContext, string]>
            ).map(([roleKey, roleLabel]) => (
              <label key={roleKey} style={checkboxLabelStyle}>
                <input
                  type="checkbox"
                  checked={roleContext[roleKey]}
                  onChange={() => toggleRole(roleKey)}
                />
                {roleLabel}
              </label>
            ))}
          </div>
        </div>

        <div style={fieldStyle}>
          <span style={labelStyle}>Conversation Scope</span>
          <select
            style={inputStyle}
            value={conversationScope}
            onChange={(event) =>
              updateParamValue(onUpdate, "conversationScope", event.target.value)
            }
          >
            <option value="global">Global Memory</option>
            <option value="session">Session Memory</option>
            <option value="node">Node Scoped</option>
          </select>
        </div>

        <div style={fieldStyle}>
          <span style={labelStyle}>Memory Tagging</span>
          <input
            style={inputStyle}
            value={tagsValue}
            placeholder="project-x, onboarding, qa"
            onChange={(event) => handleTagsChange(event.target.value)}
          />
          <span style={helperStyle}>
            Comma separated labels applied to new entries.
          </span>
        </div>
      </MemorySection>

      <MemorySection
        title="Tools"
        description="Operational controls for debugging and lifecycle management."
      >
        <label style={checkboxLabelStyle}>
          <input
            type="checkbox"
            checked={inspectRetrieved}
            onChange={(event) =>
              updateParamValue(onUpdate, "inspectRetrieved", event.target.checked)
            }
          />
          Inspect retrieved memories before returning
        </label>

        <div style={buttonRowStyle}>
          <button
            type="button"
            style={memoryButtonStyle}
            onClick={handleExport}
          >
            Export Memories
          </button>
          <button
            type="button"
            style={memoryButtonStyle}
            onClick={handleImport}
          >
            Import Memories
          </button>
          <button
            type="button"
            style={memoryDangerButtonStyle}
            onClick={handleClearMemory}
          >
            Clear LLM Memory
          </button>
        </div>
      </MemorySection>
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
      return <MemoryOptions params={params} onUpdate={onUpdate} />;
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
