import React from "react";
export default function RunControls({ onRun }: { onRun: () => void }) {
  return (
    <div style={{ display: "flex", gap: 8, alignItems: "center", padding: 8, borderBottom: "1px solid #eee" }}>
      <button onClick={onRun}>Run</button>
    </div>
  );
}
