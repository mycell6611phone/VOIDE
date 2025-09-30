
import React, {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  DEFAULT_PROMPT_PRESET_ID,
  PROMPT_PRESETS,
  PROMPT_PRESET_MAP,
  inferPromptPresetFromText,
} from "@voide/shared";


import {
  PromptConfigState,
  promptConfigFromBytes,
  promptConfigToBytes,
  PromptTarget,
  PromptPreset,
} from "./promptConfig";

export interface PromptModuleNodeProps {
  id: string;
  config?: Uint8Array | null;
  selected?: boolean;
  onConfigure?: (cfg: Uint8Array) => void;
  onMenuOpen?: (id: string) => void;
  onMenuClose?: (id: string) => void;
}

const nodeStyles: React.CSSProperties = {
  width: 140,
  padding: 8,
  borderRadius: 6,
  background: "#f9fafb",
  color: "#111827",
  position: "relative",
  cursor: "pointer",
  userSelect: "none",
  boxSizing: "border-box",
};

const portBase: React.CSSProperties = {
  position: "absolute",
  width: 12,
  height: 12,
  borderRadius: 3,
  transform: "translateY(-50%)",
};


const presetListStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 6,
  marginTop: 6,
};

const presetButtonBaseStyle: React.CSSProperties = {
  textAlign: "left",
  padding: "8px 10px",
  borderRadius: 6,
  border: "1px solid #e2e8f0",
  background: "#f8fafc",
  color: "#0f172a",
  display: "flex",
  flexDirection: "column",
  gap: 2,
  fontSize: 12,
  lineHeight: 1.4,
  cursor: "pointer",
  transition: "border-color 0.2s ease, background 0.2s ease",
};

const presetButtonActiveStyle: React.CSSProperties = {
  border: "1px solid #2563eb",
  background: "#eff6ff",
  boxShadow: "0 0 0 1px rgba(37,99,235,0.12) inset",
};

const presetLabelStyle: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 600,
  color: "#0f172a",
};

const presetDescriptionStyle: React.CSSProperties = {
  fontSize: 11,
  color: "#64748b",
  lineHeight: 1.4,
};

const fieldLabelStyle: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 600,
  color: "#0f172a",
  letterSpacing: 0.3,
  textTransform: "uppercase",
};

const radioGroupStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 6,
  marginTop: 6,
};

const radioLabelStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  fontSize: 12,
  color: "#0f172a",
};

const radioInputStyle: React.CSSProperties = {
  accentColor: "#2563eb",
};

const textareaStyle: React.CSSProperties = {
  marginTop: 6,
  width: "100%",
  minHeight: 80,
  resize: "none" as const,
  padding: 6,
  borderRadius: 4,
  border: "1px solid #cbd5f5",
  background: "#f9fafb",
  fontSize: 12,
  lineHeight: 1.5,
  color: "#0f172a",
  fontFamily: "Inter, system-ui, sans-serif",
};

const helperTextStyle: React.CSSProperties = {
  fontSize: 11,
  color: "#94a3b8",
  marginTop: 4,
};

const actionRowStyle: React.CSSProperties = {
  marginTop: 16,
  display: "flex",
  gap: 8,
  justifyContent: "flex-end",
};


function truncate(text: string, length: number): string {
  if (text.length <= length) return text;
  return text.slice(0, Math.max(0, length - 1)).trimEnd() + "…";
}

function cloneConfig(config: PromptConfigState): PromptConfigState {
  return {
    text: config.text,
    preset: config.preset,
    to: config.to,
    passthrough: { ...config.passthrough },
  };
}

function normalizeForSave(config: PromptConfigState): PromptConfigState {
  let presetId =
    config.preset in PROMPT_PRESET_MAP
      ? config.preset
      : DEFAULT_PROMPT_PRESET_ID;
  const to: PromptTarget = config.to === "system" ? "system" : "user";
  let text = config.text;
  if (presetId !== "custom") {
    const presetText = PROMPT_PRESET_MAP[presetId]?.defaultText ?? "";
    if (text.trim().length === 0) {
      text = presetText;
    } else if (text.trim() !== presetText.trim()) {
      presetId = "custom";
    }
  }
  return {
    text,
    preset: presetId,
    to,
    passthrough: { ...config.passthrough },
  };
}

function formatPresetLabel(presetId: string): string {
  const preset = PROMPT_PRESET_MAP[presetId];
  if (preset) {
    return preset.label;
  }
  if (!presetId) {
    return "Custom";
  }
  return presetId
    .split(/[-_]/)
    .filter(Boolean)
    .map((chunk) => chunk.charAt(0).toUpperCase() + chunk.slice(1))
    .join(" ");
}

export function PromptModuleNode({
  id,
  config,
  selected = false,
  onConfigure,
  onMenuOpen,
  onMenuClose,
}: PromptModuleNodeProps) {
  const [storedConfig, setStoredConfig] = useState<PromptConfigState>(() =>
    normalizeForSave(promptConfigFromBytes(config ?? null))
  );
  const [menuOpen, setMenuOpen] = useState(false);

  const [draft, setDraft] = useState<PromptConfigState>(() =>
    cloneConfig(storedConfig)
  );

  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    const decoded = normalizeForSave(promptConfigFromBytes(config ?? null));
    setStoredConfig(decoded);

    setDraft(cloneConfig(decoded));

  }, [config?.buffer, config?.byteOffset, config?.byteLength]);

  useLayoutEffect(() => {
    if (!menuOpen) {
      return;
    }
    const element = textareaRef.current;
    if (!element) {
      return;
    }
    element.style.height = "auto";
    element.style.height = `${Math.max(element.scrollHeight, 80)}px`;
  }, [draft.text, menuOpen]);

  const summary = useMemo(() => {
    const targetLabel = storedConfig.to === "system" ? "System" : "User";
    const presetLabel = formatPresetLabel(storedConfig.preset);
    const trimmed = storedConfig.text.trim();
    let preview = trimmed.length
      ? truncate(trimmed, 70)
      : "(no prompt text)";
    if (!trimmed.length && storedConfig.preset !== "custom") {
      const presetText = (
        PROMPT_PRESET_MAP[storedConfig.preset]?.defaultText ?? ""
      ).trim();
      if (presetText.length) {
        preview = truncate(presetText, 70);
      }
    }
    return { targetLabel, presetLabel, preview };
  }, [storedConfig]);

  useEffect(() => {
    if (draft.preset !== "custom") {
      return;
    }
    const textarea = textareaRef.current;
    if (!textarea) {
      return;
    }
    textarea.style.height = "auto";
    const maxHeight = 5 * 20;
    const minHeight = 3 * 20;
    const nextHeight = Math.min(
      maxHeight,
      Math.max(minHeight, textarea.scrollHeight)
    );
    textarea.style.height = `${nextHeight}px`;
    textarea.style.overflowY = textarea.scrollHeight > nextHeight ? "auto" : "hidden";
  }, [draft.text, draft.preset]);

  function openMenu() {
    setMenuOpen(true);


    setDraft(cloneConfig(storedConfig));

    onMenuOpen?.(id);
  }

  function closeMenu() {
    setMenuOpen(false);
    onMenuClose?.(id);
  }


  function selectPreset(nextId: string) {
    setDraft((prev) => {
      const resolvedId =
        nextId in PROMPT_PRESET_MAP ? nextId : DEFAULT_PROMPT_PRESET_ID;
      const preset = PROMPT_PRESET_MAP[resolvedId];
      return {
        ...prev,
        preset: resolvedId,
        text:
          resolvedId === "custom"
            ? prev.text
            : preset?.defaultText ?? prev.text,
        passthrough: { ...prev.passthrough },
      };
    });
  }

  function handlePlacementChange(value: PromptTarget) {
    setDraft((prev) => ({
      ...prev,
      to: value,
      passthrough: { ...prev.passthrough },
    }));

  }

  function handleTextChange(value: string) {
    setDraft((prev) => {
      let candidatePreset =
        prev.preset in PROMPT_PRESET_MAP
          ? prev.preset
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
      return {
        ...prev,
        text: value,
        preset: candidatePreset,
        passthrough: { ...prev.passthrough },
      };
    });
  }

  function saveConfig() {

    const normalized = normalizeForSave(draft);
    setStoredConfig(normalized);
    onConfigure?.(promptConfigToBytes(normalized));

    closeMenu();
  }

  return (
    <div
      style={{
        ...nodeStyles,
        border: selected ? "2px solid #2563eb" : "1px solid #4b5563",
        boxShadow: selected ? "0 0 0 2px rgba(37,99,235,0.15)" : "none",
      }}
      onClick={() => {
        if (!menuOpen) {
          openMenu();
        }
      }}
      onContextMenu={(e) => {
        e.preventDefault();
        if (!menuOpen) {
          openMenu();
        }
      }}
      onDoubleClick={() => {
        if (!menuOpen) {
          openMenu();
        }
      }}
    >
      <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>Prompt</div>
      <div
        style={{
          fontSize: 11,
          textTransform: "uppercase",
          color: "#6b7280",
          marginBottom: 6,
          letterSpacing: 0.5,
        }}
      >
        → {summary.targetLabel} • {summary.presetLabel}
      </div>
      <div style={{ fontSize: 12, lineHeight: 1.4, whiteSpace: "pre-wrap" }}>
        {summary.preview}
      </div>

      {/* Input port */}
      <div
        style={{
          ...portBase,
          left: -6,
          top: "50%",
          background: "#0ea5e9",
        }}
      />

      {/* Output port */}
      <div
        style={{
          ...portBase,
          right: -6,
          top: "50%",
          background: "#f97316",
        }}
      />

      {menuOpen && (
        <div
          style={{
            position: "absolute",
            top: 0,
            left: "calc(100% + 8px)",
            width: 260,
            background: "#ffffff",
            border: "1px solid #d1d5db",
            boxShadow: "0 10px 30px rgba(15, 23, 42, 0.12)",
            borderRadius: 8,
            padding: 12,
            zIndex: 20,
          }}
          onClick={(event) => event.stopPropagation()}
        >
          <header style={{ marginBottom: 8 }}>
            <div style={{ fontWeight: 600, fontSize: 13 }}>Prompt Settings</div>
            <div style={{ fontSize: 11, color: "#6b7280" }}>
              Configure text injection
            </div>
          </header>


          <div style={{ marginBottom: 12 }}>
            <div style={fieldLabelStyle}>Prompt Preset</div>
            <div style={presetListStyle}>
              {PROMPT_PRESETS.map((preset) => {
                const isActive = draft.preset === preset.id;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => selectPreset(preset.id)}
                    aria-pressed={isActive}
                    style={{
                      ...presetButtonBaseStyle,
                      ...(isActive ? presetButtonActiveStyle : {}),
                    }}
                  >
                    <span style={presetLabelStyle}>{preset.label}</span>
                    <span style={presetDescriptionStyle}>
                      {preset.description}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div style={{ marginBottom: 12 }}>
            <div style={fieldLabelStyle}>Inject Into</div>
            <div style={radioGroupStyle}>
              <label style={radioLabelStyle}>
                <input
                  type="radio"
                  name={`prompt-placement-${id}`}
                  value="user"
                  checked={draft.to === "user"}
                  onChange={() => handlePlacementChange("user")}
                  style={radioInputStyle}
                />
                User message
              </label>
              <label style={radioLabelStyle}>
                <input
                  type="radio"
                  name={`prompt-placement-${id}`}
                  value="system"
                  checked={draft.to === "system"}
                  onChange={() => handlePlacementChange("system")}
                  style={radioInputStyle}
                />
                System prompt
              </label>
            </div>
          </div>

          <div>
            <div style={fieldLabelStyle}>Prompt Text</div>
            <textarea
              ref={textareaRef}
              value={draft.text}
              onChange={(event) => handleTextChange(event.target.value)}
              placeholder="Describe the instructions to inject before the LLM runs"
              style={textareaStyle}
            />
            <div style={helperTextStyle}>
              The textarea expands automatically as you type.
            </div>
          </div>

          <div style={actionRowStyle}>

            <button
              type="button"
              onClick={closeMenu}
              style={{
                padding: "6px 10px",
                borderRadius: 4,
                border: "1px solid transparent",
                background: "transparent",
                color: "#1f2937",
                fontSize: 12,
              }}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={saveConfig}
              style={{
                padding: "6px 12px",
                borderRadius: 4,
                border: "none",
                background: "#2563eb",
                color: "white",
                fontSize: 12,
                fontWeight: 600,
              }}
            >
              Save
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default PromptModuleNode;
