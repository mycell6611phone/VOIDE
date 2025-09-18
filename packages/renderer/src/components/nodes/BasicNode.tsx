import React from "react";
import { Handle, Position, type NodeProps } from "reactflow";
import type { NodeDef } from "@voide/shared";

const containerStyle: React.CSSProperties = {
  width: 156,
  minHeight: 82,
  padding: "16px 20px",
  borderRadius: 16,
  border: "2px solid #1f2937",
  background: "#ffffff",
  color: "#111827",
  fontWeight: 600,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  textAlign: "center",
  position: "relative",
  boxShadow: "0 4px 8px rgba(15, 23, 42, 0.08)"
};

const handleStyle: React.CSSProperties = {
  width: 12,
  height: 12,
  borderRadius: "50%",
  background: "#1f2937",
  border: "2px solid #ffffff"
};

const computeOffset = (index: number, total: number) =>
  `${((index + 1) / (total + 1)) * 100}%`;

export default function BasicNode({ data }: NodeProps<NodeDef>) {
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

