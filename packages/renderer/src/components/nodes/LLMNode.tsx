import React from "react";
import { Handle, Position, type NodeProps } from "reactflow";
import type { NodeDef } from "@voide/shared";

const containerStyle: React.CSSProperties = {
  width: 184,
  height: 96,
  borderRadius: 9999,
  border: "3px solid #dc2626",
  background: "#fff1f2",
  color: "#991b1b",
  fontWeight: 700,
  textTransform: "uppercase",
  letterSpacing: 1,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  position: "relative",
  boxShadow: "0 6px 12px rgba(220, 38, 38, 0.18)"
};

const handleStyle: React.CSSProperties = {
  width: 14,
  height: 14,
  borderRadius: "50%",
  background: "#dc2626",
  border: "2px solid #fff1f2"
};

const computeOffset = (index: number, total: number) =>
  `${((index + 1) / (total + 1)) * 100}%`;

export default function LLMNode({ data }: NodeProps<NodeDef>) {
  const inputs = data.in ?? [];
  const outputs = data.out ?? [];

  return (
    <div style={containerStyle}>
      {inputs.map((port, index) => (
        <Handle
          key={port.port}
          type="target"
          position={Position.Left}
          id={`${data.id}:${port.port}`}
          style={{
            ...handleStyle,
            top: computeOffset(index, inputs.length)
          }}
        />
      ))}

      <span>{data.name}</span>

      {outputs.map((port, index) => (
        <Handle
          key={port.port}
          type="source"
          position={Position.Right}
          id={`${data.id}:${port.port}`}
          style={{
            ...handleStyle,
            top: computeOffset(index, outputs.length)
          }}
        />
      ))}
    </div>
  );
}
