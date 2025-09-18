import React, { useEffect, useMemo, useState } from "react";

import {
  PromptConfigState,
  promptConfigFromBytes,
  promptConfigToBytes,
  PromptTarget,
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

function truncate(text: string, length: number): string {
  if (text.length <= length) return text;
  return text.slice(0, Math.max(0, length - 1)).trimEnd() + "…";
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
    promptConfigFromBytes(config ?? null)
  );
  const [menuOpen, setMenuOpen] = useState(false);
  const [draft, setDraft] = useState<PromptConfigState>(storedConfig);

  useEffect(() => {
    const decoded = promptConfigFromBytes(config ?? null);
    setStoredConfig(decoded);
    setDraft(decoded);
  }, [config?.buffer, config?.byteOffset, config?.byteLength]);

  const summary = useMemo(() => {
    const targetLabel = storedConfig.to === "system" ? "System" : "User";
    const preview = storedConfig.text.trim().length
      ? truncate(storedConfig.text.trim(), 70)
      : "(no prompt text)";
    return { targetLabel, preview };
  }, [storedConfig]);

  function openMenu() {
    setMenuOpen(true);
    setDraft(storedConfig);
    onMenuOpen?.(id);
  }

  function closeMenu() {
    setMenuOpen(false);
    onMenuClose?.(id);
  }

  function updateDraft(field: keyof Pick<PromptConfigState, "text" | "to">, value: string) {
    setDraft((prev) => ({
      ...prev,
      [field]: field === "to" ? (value as PromptTarget) : value,
      passthrough: { ...prev.passthrough },
    }));
  }

  function saveConfig() {
    setStoredConfig(draft);
    onConfigure?.(promptConfigToBytes(draft));
    closeMenu();
  }

  return (
    <div
      style={{
        ...nodeStyles,
        border: selected ? "2px solid #2563eb" : "1px solid #4b5563",
        boxShadow: selected ? "0 0 0 2px rgba(37,99,235,0.15)" : "none",
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
        → {summary.targetLabel}
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
            width: 240,
            background: "#ffffff",
            border: "1px solid #d1d5db",
            boxShadow: "0 10px 30px rgba(15, 23, 42, 0.12)",
            borderRadius: 8,
            padding: 12,
            zIndex: 20,
          }}
        >
          <header style={{ marginBottom: 8 }}>
            <div style={{ fontWeight: 600, fontSize: 13 }}>Prompt Settings</div>
            <div style={{ fontSize: 11, color: "#6b7280" }}>Configure text injection</div>
          </header>

          <label style={{ display: "block", fontSize: 12, fontWeight: 500 }}>
            Inject Into
            <select
              value={draft.to}
              onChange={(e) => updateDraft("to", e.target.value)}
              style={{
                marginTop: 4,
                width: "100%",
                padding: "4px 6px",
                borderRadius: 4,
                border: "1px solid #cbd5f5",
                background: "#f9fafb",
              }}
            >
              <option value="user">User message</option>
              <option value="system">System prompt</option>
            </select>
          </label>

          <label
            style={{
              display: "block",
              marginTop: 12,
              fontSize: 12,
              fontWeight: 500,
            }}
          >
            Prompt Text
            <textarea
              value={draft.text}
              onChange={(e) => updateDraft("text", e.target.value)}
              rows={5}
              placeholder="Describe the additional instructions"
              style={{
                marginTop: 4,
                width: "100%",
                resize: "vertical",
                minHeight: 80,
                padding: 6,
                borderRadius: 4,
                border: "1px solid #cbd5f5",
                background: "#f9fafb",
                fontSize: 12,
                lineHeight: 1.4,
              }}
            />
          </label>

          <div
            style={{
              marginTop: 12,
              display: "flex",
              gap: 8,
              justifyContent: "flex-end",
            }}
          >
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

