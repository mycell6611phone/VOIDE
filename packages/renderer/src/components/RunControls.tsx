import React, { useState } from "react";
import { FiMenu } from "react-icons/fi";
import { FaHammer, FaPlay, FaPause, FaStop } from "react-icons/fa";

export default function RunControls({ onRun }: { onRun: () => void }) {
  const [menuOpen, setMenuOpen] = useState(false);

  const buttonStyle: React.CSSProperties = {
    background: "none",
    border: "none",
    cursor: "pointer",
    padding: 4,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  };

  const menuItemStyle: React.CSSProperties = {
    ...buttonStyle,
    width: "100%",
    justifyContent: "flex-start",
    padding: "4px 8px",
  };

  return (
    <div
      style={{
        display: "flex",
        gap: 12,
        alignItems: "center",
        padding: 8,
        borderBottom: "1px solid #eee",
        background: "#f5f5f5",
      }}
    >
      <div style={{ position: "relative" }}>
        <button style={buttonStyle} onClick={() => setMenuOpen((o) => !o)}>
          <FiMenu size={20} />
        </button>
        {menuOpen && (
          <div
            style={{
              position: "absolute",
              top: "100%",
              left: 0,
              background: "#fff",
              border: "1px solid #ddd",
              boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
              display: "flex",
              flexDirection: "column",
              gap: 4,
              marginTop: 4,
              zIndex: 10,
            }}
          >
            <button style={menuItemStyle} onClick={() => console.log("Open")}>Open</button>
            <button style={menuItemStyle} onClick={() => console.log("Save")}>Save</button>
            <button style={menuItemStyle} onClick={() => console.log("Export")}>Export</button>
          </div>
        )}
      </div>

      <button style={buttonStyle} onClick={() => console.log("Build")}> <FaHammer size={18} /> </button>
      <button style={buttonStyle} onClick={onRun}> <FaPlay size={18} /> </button>
      <button style={buttonStyle} onClick={() => console.log("Pause")}> <FaPause size={18} /> </button>
      <button style={buttonStyle} onClick={() => console.log("Stop")}> <FaStop size={18} /> </button>
    </div>
  );
}
