import React from "react";
import { Handle, Position, type NodeProps } from "reactflow";
import type { NodeDef } from "@voide/shared";

export default function BasicNode({ data }: NodeProps<NodeDef>) {
  return (
    <div style={{ padding: 10, border: "1px solid #888", borderRadius: 4 }}>
      <div>{data.name}</div>
      {(data.in ?? []).map((p) => (
        <Handle
          key={p.port}
          type="target"
          position={Position.Left}
          id={`${data.id}:${p.port}`}
        />
      ))}
      {(data.out ?? []).map((p) => (
        <Handle
          key={p.port}
          type="source"
          position={Position.Right}
          id={`${data.id}:${p.port}`}
        />
      ))}
    </div>
  );
}

