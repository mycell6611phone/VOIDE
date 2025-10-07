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

export const MEMORY_SUB_MENUS = [
  { key: "general", label: "General" },
  { key: "retrieval", label: "Retrieval Behavior" },
  { key: "summarization", label: "Summarization & Compression" },
  { key: "indexing", label: "Indexing & Embeddings" },
  { key: "access", label: "Access & Context" },
  { key: "debug", label: "Debugging / Developer Controls" }
] as const;

export type MemorySubMenuKey = (typeof MEMORY_SUB_MENUS)[number]["key"];

interface ModuleOptionsContentProps {
  module: ModuleCategory;
  params: Record<string, any> | undefined;
  onUpdate: (updater: ParamsUpdater) => void;
  onOpenMemorySubMenu?: (key: MemorySubMenuKey) => void;
}

const containerStyle: React.CSSProperties = {
  padding: "12px 16px",
  display: "flex",
  flexDirection: "column",
  gap: 14,
  fontFamily: "Inter, system-ui, sans-serif",
  fontSize: 14,
  color: "#0f172a",
  position: "relative"
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

const PROMPT_PLACEHOLDER_TEXT = "Custom prompt here..";

const labelRowStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 8
};

const promptActionsRowStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 8
};

const promptHelpButtonStyle: React.CSSProperties = {
  width: 22,
  height: 22,
  borderRadius: "50%",
  border: "1px solid #cbd5f5",
  background: "#e2e8f0",
  color: "#1f2937",
  fontWeight: 700,
  fontSize: 12,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  cursor: "pointer",
  transition: "background 0.2s ease, border-color 0.2s ease"
};

const inlineExamplesWrapperStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 6
};

const inlineExampleLabelStyle: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 600,
  color: "#64748b",
  textTransform: "uppercase",
  letterSpacing: 0.4
};

const inlineExamplesListStyle: React.CSSProperties = {
  display: "flex",
  flexWrap: "wrap" as const,
  gap: 8
};

const inlineExampleButtonStyle: React.CSSProperties = {
  borderRadius: 999,
  border: "1px solid #cbd5f5",
  background: "#ffffff",
  padding: "6px 10px",
  fontSize: 12,
  color: "#0f172a",
  cursor: "pointer",
  lineHeight: 1.3,
  transition: "background 0.2s ease, border-color 0.2s ease",
  textAlign: "left" as const
};

const helpModalOverlayStyle: React.CSSProperties = {
  position: "absolute",
  inset: 0,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 50
};

const helpModalBackdropStyle: React.CSSProperties = {
  position: "absolute",
  inset: 0,
  background: "rgba(15, 23, 42, 0.45)"
};

const helpModalContentStyle: React.CSSProperties = {
  position: "relative",
  background: "#ffffff",
  borderRadius: 16,
  padding: "20px 22px",
  boxShadow: "0 24px 44px rgba(15, 23, 42, 0.32)",
  width: "min(460px, 100%)",
  maxHeight: "80%",
  overflowY: "auto",
  display: "flex",
  flexDirection: "column",
  gap: 16
};

const helpModalHeaderStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 12
};

const helpModalTitleStyle: React.CSSProperties = {
  margin: 0,
  fontSize: 18,
  fontWeight: 700,
  color: "#0f172a"
};

const helpModalCloseButtonStyle: React.CSSProperties = {
  border: "none",
  background: "transparent",
  color: "#0f172a",
  cursor: "pointer",
  fontSize: 16,
  fontWeight: 600,
  padding: 4,
  borderRadius: 6,
  transition: "background 0.2s ease"
};

const helpModalListStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 12
};

const helpModalExampleStyle: React.CSSProperties = {
  borderRadius: 12,
  border: "1px solid #e2e8f0",
  background: "#f8fafc",
  padding: "14px 16px",
  display: "flex",
  flexDirection: "column",
  gap: 10
};

const helpModalExampleHeaderStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  fontSize: 13,
  fontWeight: 600,
  color: "#0f172a"
};

const helpModalSourceStyle: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 600,
  color: "#475569"
};

const helpModalPromptStyle: React.CSSProperties = {
  margin: 0,
  fontSize: 13,
  color: "#0f172a",
  lineHeight: 1.45
};

const helpModalActionsStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "flex-end",
  gap: 8
};

const helpModalCopyButtonStyle: React.CSSProperties = {
  borderRadius: 999,
  border: "1px solid #cbd5f5",
  background: "#ffffff",
  padding: "6px 10px",
  fontSize: 12,
  color: "#1f2937",
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  gap: 6,
  transition: "background 0.2s ease, border-color 0.2s ease"
};

const helpModalCopiedBadgeStyle: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 600,
  color: "#16a34a"
};

const INLINE_PROMPT_EXAMPLES = [
  "You are a helpful AI assistant.",
  "Audit this flow against Nielsen Norman Group heuristics and recommend the top improvement."
] as const;

interface PromptHelpExample {
  id: string;
  source: string;
  votes: string;
  text: string;
}

const PROMPT_HELP_EXAMPLES: PromptHelpExample[] = [
  {
    id: "nng",
    source: "Nielsen Norman Group",
    votes: "+1",
    text: "Outline three usability heuristics from Nielsen Norman Group that this flow should reinforce, then recommend one action item." 
  },
  {
    id: "uxse",
    source: "User Experience Stack Exchange",
    votes: "+3",
    text: "Synthesize consensus advice from User Experience Stack Exchange on reducing onboarding friction and draft a coaching message for the builder." 
  },
  {
    id: "patternfly",
    source: "patternfly.org",
    votes: "+3",
    text: "Translate patternfly.org design guidelines into a checklist the agent can follow while evaluating interface nodes." 
  },
  {
    id: "gravity-ui",
    source: "Gravity UI",
    votes: "+3",
    text: "Summarize Gravity UI layout principles and suggest how to apply them when arranging downstream response cards." 
  }
];

interface PromptExamplesModalProps {
  examples: PromptHelpExample[];
  onClose: () => void;
  onCopy: (exampleId: string, text: string) => Promise<void> | void;
  copiedExampleId: string | null;
}

function PromptExamplesModal({
  examples,
  onClose,
  onCopy,
  copiedExampleId,
}: PromptExamplesModalProps) {
  return (
    <div style={helpModalOverlayStyle} role="dialog" aria-modal="true" aria-labelledby="prompt-help-modal-title" data-testid="prompt-help-modal">
      <div style={helpModalBackdropStyle} onClick={onClose} />
      <div style={helpModalContentStyle}>
        <div style={helpModalHeaderStyle}>
          <h5 id="prompt-help-modal-title" style={helpModalTitleStyle}>
            Prompt Examples
          </h5>
          <button
            type="button"
            onClick={onClose}
            style={helpModalCloseButtonStyle}
            aria-label="Close prompt examples"
          >
            ×
          </button>
        </div>
        <div style={helpModalListStyle}>
          {examples.map((example) => (
            <div key={example.id} style={helpModalExampleStyle}>
              <div style={helpModalExampleHeaderStyle}>
                <span>{example.source}</span>
                <span style={helpModalSourceStyle}>{example.votes}</span>
              </div>
              <p style={helpModalPromptStyle}>{example.text}</p>
              <div style={helpModalActionsStyle}>
                {copiedExampleId === example.id ? (
                  <span style={helpModalCopiedBadgeStyle}>Copied!</span>
                ) : null}
                <button
                  type="button"
                  onClick={() => onCopy(example.id, example.text)}
                  style={helpModalCopyButtonStyle}
                  aria-label={`Copy prompt from ${example.source}`}
                >
                  <span aria-hidden="true">📋</span>
                  Copy
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

const paramsPreviewStyle: React.CSSProperties = {
  background: "#f8fafc",
  borderRadius: 8,
  padding: "10px 12px",
  fontSize: 12,
  color: "#1f2937",
  overflowX: "auto"
};

const memoryMenuWrapperStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 16,
  flex: 1
};

const memoryMenuListStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 10
};

const memoryMenuItemStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  padding: "12px 14px",
  borderRadius: 12,
  border: "1px solid #e2e8f0",
  background: "#f8fafc",
  color: "#0f172a",
  fontSize: 13,
  fontWeight: 600,
  cursor: "pointer",
  transition: "border-color 0.2s ease, background 0.2s ease"
};

const memoryMenuItemChevronStyle: React.CSSProperties = {
  fontSize: 16,
  color: "#94a3b8"
};

const clearMemoryButtonStyle: React.CSSProperties = {
  alignSelf: "center",
  padding: "10px 18px",
  borderRadius: 12,
  border: "1px solid #fca5a5",
  background: "#fee2e2",
  color: "#b91c1c",
  fontWeight: 600,
  fontSize: 13,
  cursor: "pointer",
  marginTop: "auto",
  transition: "background 0.2s ease, border-color 0.2s ease"
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
  const [localPrompt, setLocalPrompt] = React.useState<NormalizedPromptParams>(normalized);
  const [isHelpOpen, setIsHelpOpen] = React.useState(false);
  const [copiedExampleId, setCopiedExampleId] = React.useState<string | null>(null);
  const [promptFocused, setPromptFocused] = React.useState(false);
  const textareaRef = React.useRef<HTMLTextAreaElement | null>(null);
  const restoreFocusRef = React.useRef(false);
  const selectionRangeRef = React.useRef<{ start: number; end: number } | null>(
    null
  );
  const syncingParamsRef = React.useRef(false);
  const radioGroupName = React.useId();

  React.useEffect(() => {
    setLocalPrompt((current) => {
      if (
        current.text === normalized.text &&
        current.preset === normalized.preset &&
        current.to === normalized.to
      ) {
        return current;
      }
      return normalized;
    });
  }, [normalized.text, normalized.preset, normalized.to]);

  React.useEffect(() => {
    if (!copiedExampleId) {
      return;
    }
    const timeout = window.setTimeout(() => setCopiedExampleId(null), 1800);
    return () => window.clearTimeout(timeout);
  }, [copiedExampleId]);

  React.useEffect(() => {
    if (!isHelpOpen) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setIsHelpOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isHelpOpen]);

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
  }, [localPrompt.text]);

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

  React.useEffect(() => {
    const isSynced =
      localPrompt.text === normalized.text &&
      localPrompt.preset === normalized.preset &&
      localPrompt.to === normalized.to;

    if (isSynced) {
      syncingParamsRef.current = false;
      return;
    }

    if (syncingParamsRef.current) {
      return;
    }

    syncingParamsRef.current = true;
    try {
      onUpdate((previous) => producePromptParams(previous, localPrompt));
    } catch (error) {
      syncingParamsRef.current = false;
      throw error;
    }
  }, [
    localPrompt,
    normalized.text,
    normalized.preset,
    normalized.to,
    onUpdate,
  ]);

  const updatePromptText = React.useCallback(
    (
      nextText: string,
      options?: { start?: number | null; end?: number | null; preserveFocus?: boolean }
    ) => {
      const preserveFocus = options?.preserveFocus ?? false;
      if (preserveFocus) {
        const start =
          typeof options?.start === "number" && Number.isFinite(options.start)
            ? options.start
            : nextText.length;
        const end =
          typeof options?.end === "number" && Number.isFinite(options.end)
            ? options.end
            : start;
        restoreFocusRef.current = true;
        selectionRangeRef.current = { start, end };
      } else {
        restoreFocusRef.current = false;
        selectionRangeRef.current = null;
      }

      setLocalPrompt((current) => {
        let candidatePreset =
          current.preset in PROMPT_PRESET_MAP
            ? current.preset
            : DEFAULT_PROMPT_PRESET_ID;

        const trimmed = nextText.trim();
        const presetText =
          candidatePreset !== "custom"
            ? PROMPT_PRESET_MAP[candidatePreset]?.defaultText.trim() ?? ""
            : "";

        if (candidatePreset !== "custom" && trimmed !== presetText) {
          candidatePreset = "custom";
        }

        if (candidatePreset === "custom") {
          const inferred = inferPromptPresetFromText(nextText);
          if (inferred && trimmed === inferred.defaultText.trim()) {
            candidatePreset = inferred.id;
          }
        }

        const nextState: NormalizedPromptParams = {
          text: nextText,
          preset: candidatePreset,
          to: current.to,
        };

        if (
          current.text === nextState.text &&
          current.preset === nextState.preset &&
          current.to === nextState.to
        ) {
          return current;
        }

        return nextState;
      });
    },
    []
  );

  const handlePresetSelect = (presetId: string) => {
    setLocalPrompt((current) => {
      const resolved =
        presetId in PROMPT_PRESET_MAP ? presetId : DEFAULT_PROMPT_PRESET_ID;
      const preset = PROMPT_PRESET_MAP[resolved];
      const nextText =
        resolved === "custom"
          ? current.text
          : preset?.defaultText ?? current.text;

      if (resolved !== "custom") {
        restoreFocusRef.current = true;
        const caret = nextText.length;
        selectionRangeRef.current = { start: caret, end: caret };
      } else {
        restoreFocusRef.current = false;
        selectionRangeRef.current = null;
      }

      const nextState: NormalizedPromptParams = {
        text: nextText,
        preset: resolved,
        to: current.to,
      };

      if (
        current.text === nextState.text &&
        current.preset === nextState.preset &&
        current.to === nextState.to
      ) {
        return current;
      }

      return nextState;
    });
  };

  const handlePlacementChange = (value: PromptPlacement) => {
    setLocalPrompt((current) => {
      if (current.to === value) {
        return current;
      }

      const nextState: NormalizedPromptParams = {
        text: current.text,
        preset: current.preset,
        to: value,
      };

      if (
        current.text === nextState.text &&
        current.preset === nextState.preset &&
        current.to === nextState.to
      ) {
        return current;
      }

      return nextState;
    });
  };

  const handleTextChange = (
    event: React.ChangeEvent<HTMLTextAreaElement>
  ) => {
    const { value, selectionStart, selectionEnd } = event.target;
    const isActive = document.activeElement === event.target;
    const startValue =
      typeof selectionStart === "number" && Number.isFinite(selectionStart)
        ? selectionStart
        : value.length;
    const endValue =
      typeof selectionEnd === "number" && Number.isFinite(selectionEnd)
        ? selectionEnd
        : startValue;

    updatePromptText(value, {
      start: isActive ? startValue : undefined,
      end: isActive ? endValue : undefined,
      preserveFocus: isActive,
    });
  };

  const handleInlineExampleSelect = (example: string) => {
    updatePromptText(example, {
      start: 0,
      end: example.length,
      preserveFocus: true,
    });
  };

  const handleCopyExample = React.useCallback(
    async (exampleId: string, text: string) => {
      try {
        if (
          typeof navigator !== "undefined" &&
          navigator.clipboard &&
          typeof navigator.clipboard.writeText === "function"
        ) {
          await navigator.clipboard.writeText(text);
        } else if (typeof document !== "undefined") {
          const helper = document.createElement("textarea");
          helper.value = text;
          helper.setAttribute("readonly", "");
          helper.style.position = "absolute";
          helper.style.left = "-9999px";
          document.body.appendChild(helper);
          helper.select();
          document.execCommand("copy");
          document.body.removeChild(helper);
        }
        setCopiedExampleId(exampleId);
      } catch (error) {
        // Swallow clipboard errors; we simply do not show the copied badge.
      }
    },
    []
  );

  const handleHelpClose = () => setIsHelpOpen(false);

  const promptHasText = localPrompt.text.trim().length > 0;
  const promptPlaceholder =
    promptFocused || promptHasText ? "" : PROMPT_PLACEHOLDER_TEXT;

  return (
    <>
      <div style={fieldStyle}>
        <span style={labelStyle}>Prompt Preset</span>
        <div style={promptPresetListStyle}>
          {PROMPT_PRESETS.map((preset) => {
            const active = localPrompt.preset === preset.id;
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
              checked={localPrompt.to === "user"}
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
              checked={localPrompt.to === "system"}
              onChange={() => handlePlacementChange("system")}
              style={promptRadioInputStyle}
            />
            Inject into system prompt
          </label>
        </div>
      </div>

      <div style={fieldStyle}>
        <div style={labelRowStyle}>
          <span style={labelStyle}>Prompt Text</span>
          <div style={promptActionsRowStyle}>
            <button
              type="button"
              style={promptHelpButtonStyle}
              onClick={() => setIsHelpOpen(true)}
              aria-label="Open prompt help"
              aria-haspopup="dialog"
              aria-expanded={isHelpOpen}
            >
              ?
            </button>
          </div>
        </div>
        <textarea
          ref={textareaRef}
          style={promptTextareaStyle}
          value={localPrompt.text}
          onChange={handleTextChange}
          onFocus={() => setPromptFocused(true)}
          onBlur={() => setPromptFocused(false)}
          spellCheck
          placeholder={promptPlaceholder}
        />
        <div style={inlineExamplesWrapperStyle}>
          <span style={inlineExampleLabelStyle}>Inline Examples</span>
          <div style={inlineExamplesListStyle}>
            {INLINE_PROMPT_EXAMPLES.map((example) => (
              <button
                key={example}
                type="button"
                style={inlineExampleButtonStyle}
                onClick={() => handleInlineExampleSelect(example)}
                data-testid="prompt-inline-example"
              >
                {example}
              </button>
            ))}
          </div>
        </div>
        <span style={helperStyle}>
          The textarea expands automatically as you type.
        </span>
      </div>
      {isHelpOpen ? (
        <PromptExamplesModal
          examples={PROMPT_HELP_EXAMPLES}
          onClose={handleHelpClose}
          onCopy={handleCopyExample}
          copiedExampleId={copiedExampleId}
        />
      ) : null}
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
  params: _params,
  onUpdate,
  onOpenSubMenu
}: {
  params: Record<string, any> | undefined;
  onUpdate: ModuleOptionsContentProps["onUpdate"];
  onOpenSubMenu?: (key: MemorySubMenuKey) => void;
}) {
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

  return (
    <div style={memoryMenuWrapperStyle}>
      <div style={memoryMenuListStyle}>
        {MEMORY_SUB_MENUS.map((menu) => (
          <button
            key={menu.key}
            type="button"
            style={memoryMenuItemStyle}
            onClick={() => onOpenSubMenu?.(menu.key)}
          >
            <span>{menu.label}</span>
            <span style={memoryMenuItemChevronStyle} aria-hidden="true">
              ›
            </span>
          </button>
        ))}
      </div>
      <button
        type="button"
        style={clearMemoryButtonStyle}
        onClick={handleClearMemory}
      >
        Clear LLM Memory
      </button>
    </div>
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
          spellCheck
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
          spellCheck
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
          spellCheck
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
          spellCheck
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
          spellCheck
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
          spellCheck
        />
      </div>
    </>
  );
}

function renderModuleOptions(
  module: ModuleCategory,
  params: Record<string, any> | undefined,
  onUpdate: ModuleOptionsContentProps["onUpdate"],
  options?: { onOpenMemorySubMenu?: (key: MemorySubMenuKey) => void }
) {
  switch (module) {
    case "prompt":
      return <PromptOptions params={params} onUpdate={onUpdate} />;
    case "debate":
      return renderDebateOptions(params, onUpdate);
    case "cache":
      return renderCacheOptions(params, onUpdate);
    case "memory":
      return (
        <MemoryOptions
          params={params}
          onUpdate={onUpdate}
          onOpenSubMenu={options?.onOpenMemorySubMenu}
        />
      );
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
  onUpdate,
  onOpenMemorySubMenu
}: ModuleOptionsContentProps) {
  const heading = moduleHeadings[module];
  const shouldRenderRawParams = module !== "memory";

  return (
    <div style={containerStyle}>
      <div>
        <h4 style={headingStyle}>{heading.title}</h4>
        <p style={descriptionStyle}>{heading.description}</p>
      </div>

      {renderModuleOptions(module, params, onUpdate, {
        onOpenMemorySubMenu
      })}

      {shouldRenderRawParams ? (
        <div style={fieldStyle}>
          <span style={labelStyle}>Raw Parameters</span>
          <pre style={paramsPreviewStyle}>
            {JSON.stringify(params ?? {}, null, 2)}
          </pre>
        </div>
      ) : null}
    </div>
  );
}
