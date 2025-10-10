import React, { useMemo } from "react";
import { createPortal } from "react-dom";
import type { PayloadT } from "@voide/shared";
import {
  useModuleTesterStore,
  type ModuleTesterOutput,
  type ModuleTesterProgressEntry,
  type ModuleTesterLogEntry,
} from "../state/moduleTesterStore";

const overlayStyle: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  backgroundColor: "rgba(15, 23, 42, 0.55)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 40,
};

const dialogStyle: React.CSSProperties = {
  width: "min(720px, 90vw)",
  maxHeight: "90vh",
  background: "#ffffff",
  borderRadius: 16,
  boxShadow: "0 20px 45px rgba(15, 23, 42, 0.25)",
  display: "flex",
  flexDirection: "column",
  overflow: "hidden",
};

const headerStyle: React.CSSProperties = {
  padding: "18px 24px",
  borderBottom: "1px solid #e2e8f0",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 12,
};

const sectionTitleStyle: React.CSSProperties = {
  fontSize: 13,
  fontWeight: 600,
  color: "#1e293b",
  textTransform: "uppercase",
  letterSpacing: 0.6,
};

const textareaStyle: React.CSSProperties = {
  width: "100%",
  minHeight: 96,
  padding: "10px 12px",
  borderRadius: 12,
  border: "1px solid #cbd5f5",
  background: "#f8fafc",
  fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)",
  fontSize: 12,
  lineHeight: 1.45,
  resize: "vertical",
  color: "#0f172a",
};

const outputPreStyle: React.CSSProperties = {
  background: "#0f172a",
  color: "#e2e8f0",
  padding: "12px 14px",
  borderRadius: 12,
  fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)",
  fontSize: 12,
  lineHeight: 1.5,
  overflowX: "auto",
  whiteSpace: "pre-wrap",
  wordBreak: "break-word",
};

const formatPayload = (payload: PayloadT): string => {
  switch (payload.kind) {
    case "text":
      return payload.text ?? "";
    case "json":
      return JSON.stringify(payload.value, null, 2);
    case "messages":
      return payload.messages
        .map((entry) => `${entry.role}: ${entry.content}`)
        .join("\n");
    case "vector":
      return JSON.stringify(payload.values, null, 2);
    case "file":
      return JSON.stringify({ path: payload.path, mime: payload.mime }, null, 2);
    case "code":
      return `${payload.language}\n${payload.text}`;
    case "metrics":
      return JSON.stringify(payload.data, null, 2);
    default:
      return JSON.stringify(payload, null, 2);
  }
};

const renderOutput = (output: ModuleTesterOutput): JSX.Element => (
  <div
    key={`${output.port}`}
    style={{
      display: "flex",
      flexDirection: "column",
      gap: 6,
      border: "1px solid #cbd5f5",
      borderRadius: 12,
      padding: 12,
      background: "#f1f5f9",
    }}
  >
    <div style={{ fontSize: 13, fontWeight: 600, color: "#0f172a" }}>
      Output: <span style={{ fontWeight: 700 }}>{output.port}</span>
    </div>
    <pre style={outputPreStyle}>{formatPayload(output.payload)}</pre>
  </div>
);

const renderProgress = (entries: ModuleTesterProgressEntry[]): JSX.Element | null => {
  if (!entries || entries.length === 0) {
    return null;
  }
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <div style={{ ...sectionTitleStyle, fontSize: 12 }}>Progress</div>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 4,
          maxHeight: 140,
          overflowY: "auto",
        }}
      >
        {entries.map((entry, index) => (
          <div
            key={`${entry.status ?? "progress"}-${index}`}
            style={{ fontSize: 12, color: "#1e293b", lineHeight: 1.45 }}
          >
            <strong>{entry.status ?? "ok"}</strong>
            {entry.latencyMs !== undefined ? ` • ${entry.latencyMs}ms` : ""}
            {entry.tokens !== undefined ? ` • ${entry.tokens} tokens` : ""}
            {entry.message ? ` — ${entry.message}` : ""}
          </div>
        ))}
      </div>
    </div>
  );
};

const renderLogs = (entries: ModuleTesterLogEntry[]): JSX.Element | null => {
  if (!entries || entries.length === 0) {
    return null;
  }
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <div style={{ ...sectionTitleStyle, fontSize: 12 }}>Logs</div>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 6,
          maxHeight: 160,
          overflowY: "auto",
        }}
      >
        {entries.map((entry, index) => (
          <pre
            key={`${entry.tag ?? "log"}-${index}`}
            style={{
              ...outputPreStyle,
              background: "#111827",
              color: "#e5e7eb",
              margin: 0,
            }}
          >
            {JSON.stringify(entry, null, 2)}
          </pre>
        ))}
      </div>
    </div>
  );
};

export default function ModuleTesterDialog(): JSX.Element | null {
  const session = useModuleTesterStore((state) => state.session);
  const closeSession = useModuleTesterStore((state) => state.closeSession);
  const updateInputValue = useModuleTesterStore((state) => state.updateInputValue);
  const updateInputType = useModuleTesterStore((state) => state.updateInputType);
  const runTest = useModuleTesterStore((state) => state.runTest);

  const portalTarget = typeof document !== "undefined" ? document.body : null;

  const content = useMemo(() => {
    if (!session) {
      return null;
    }

    const handleSubmit = (event: React.FormEvent) => {
      event.preventDefault();
      runTest();
    };

    return (
      <div style={overlayStyle} role="dialog" aria-modal="true">
        <div style={dialogStyle}>
          <div style={headerStyle}>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: "#0f172a" }}>
                Module Tester — {session.node.name ?? session.node.id}
              </div>
              <div style={{ fontSize: 12, color: "#475569" }}>Type: {session.node.type}</div>
            </div>
            <button
              type="button"
              onClick={closeSession}
              style={{
                border: "none",
                background: "transparent",
                color: "#0f172a",
                fontSize: 14,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Close
            </button>
          </div>

          <form
            onSubmit={handleSubmit}
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 18,
              padding: "20px 24px",
              overflowY: "auto",
            }}
          >
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={sectionTitleStyle}>Inputs</div>
              {session.inputs.length === 0 ? (
                <div style={{ fontSize: 13, color: "#64748b" }}>
                  This module does not define any input ports.
                </div>
              ) : (
                session.inputs.map((input) => (
                  <div
                    key={input.port}
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: 8,
                      border: "1px solid #cbd5f5",
                      borderRadius: 12,
                      padding: 12,
                      background: "#f8fafc",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: "#0f172a" }}>{input.label}</div>
                      <select
                        value={input.selectedType}
                        onChange={(event) => updateInputType(input.port, event.target.value)}
                        style={{
                          padding: "4px 8px",
                          borderRadius: 8,
                          border: "1px solid #cbd5f5",
                          fontSize: 12,
                          background: "#ffffff",
                        }}
                      >
                        {input.availableTypes.map((type) => (
                          <option key={type} value={type}>
                            {type}
                          </option>
                        ))}
                      </select>
                    </div>
                    <textarea
                      style={textareaStyle}
                      value={input.value}
                      placeholder={`Enter ${input.selectedType} payload`}
                      onChange={(event) => updateInputValue(input.port, event.target.value)}
                    />
                    {input.error ? (
                      <div style={{ fontSize: 12, color: "#dc2626" }}>{input.error}</div>
                    ) : null}
                  </div>
                ))
              )}
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={sectionTitleStyle}>Outputs</div>
              {session.outputs.length === 0 ? (
                <div style={{ fontSize: 13, color: "#64748b" }}>
                  No output captured yet. Provide inputs and run the test to view module output.
                </div>
              ) : (
                session.outputs.map((output) => renderOutput(output))
              )}
            </div>

            {renderProgress(session.progress)}
            {renderLogs(session.logs)}

            {session.error ? (
              <div
                style={{
                  padding: 12,
                  borderRadius: 12,
                  background: "#fee2e2",
                  color: "#991b1b",
                  fontSize: 13,
                }}
              >
                {session.error}
              </div>
            ) : null}

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 12 }}>
              <button
                type="button"
                onClick={closeSession}
                style={{
                  borderRadius: 10,
                  border: "1px solid #cbd5f5",
                  padding: "8px 14px",
                  background: "#ffffff",
                  fontSize: 13,
                  fontWeight: 600,
                  color: "#0f172a",
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={session.running}
                style={{
                  borderRadius: 10,
                  border: "none",
                  padding: "10px 18px",
                  background: session.running ? "#94a3b8" : "#2563eb",
                  color: "#ffffff",
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: session.running ? "default" : "pointer",
                  boxShadow: session.running ? "none" : "0 12px 24px rgba(37, 99, 235, 0.35)",
                  transition: "background-color 0.2s ease",
                }}
              >
                {session.running ? "Testing..." : "Test Module"}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }, [closeSession, runTest, session, updateInputType, updateInputValue]);

  if (!content || !portalTarget) {
    return null;
  }

  return createPortal(content, portalTarget);
}
