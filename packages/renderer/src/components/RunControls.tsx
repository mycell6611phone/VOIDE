import React from "react";

const menuItems = ["System", "File", "Edit", "View"];

const textButtonStyle: React.CSSProperties = {
  background: "none",
  border: "none",
  color: "inherit",
  fontWeight: 600,
  fontSize: 14,
  padding: "8px 12px",
  borderRadius: 8,
  cursor: "pointer"
};

const iconButtonStyle: React.CSSProperties = {
  background: "#1e293b",
  border: "1px solid #334155",
  borderRadius: 12,
  width: 44,
  height: 44,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  color: "#f8fafc",
  cursor: "pointer",
  transition: "transform 0.15s ease"
};

const buildButtonStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  background: "#f97316",
  border: "none",
  color: "#111827",
  fontWeight: 700,
  fontSize: 14,
  padding: "10px 18px",
  borderRadius: 999,
  cursor: "pointer",
  boxShadow: "0 6px 18px rgba(249, 115, 22, 0.35)"
};

const glyphStyle: React.CSSProperties = {
  fontSize: 18,
  lineHeight: "18px"
};

export default function RunControls({ onRun }: { onRun: () => void }) {
  return (
    <header
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 24px",
        height: 64,
        background: "linear-gradient(90deg, #0f172a, #1f2937)",
        color: "#e2e8f0",
        borderBottom: "1px solid #1e293b"
      }}
    >
      <nav style={{ display: "flex", gap: 8 }}>
        {menuItems.map((item) => (
          <button key={item} style={textButtonStyle} onClick={() => console.log(item)}>
            {item}
          </button>
        ))}
      </nav>

      <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
        <button
          type="button"
          style={iconButtonStyle}
          onClick={onRun}
          aria-label="Play"
        >
          <span aria-hidden style={glyphStyle}>
            ▶
          </span>
        </button>
        <button
          type="button"
          style={iconButtonStyle}
          onClick={() => console.log("Pause")}
          aria-label="Pause"
        >
          <span aria-hidden style={glyphStyle}>
            ⏸
          </span>
        </button>
        <button
          type="button"
          style={iconButtonStyle}
          onClick={() => console.log("Stop")}
          aria-label="Stop"
        >
          <span aria-hidden style={glyphStyle}>
            ■
          </span>
        </button>
      </div>

      <button
        type="button"
        style={buildButtonStyle}
        onClick={() => console.log("Build")}
        aria-label="Build project"
      >
        <span aria-hidden style={{ fontSize: 18, lineHeight: "18px" }}>
          🔨
        </span>
        <span>Build</span>
      </button>
    </header>
  );
}
