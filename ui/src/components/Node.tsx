import { Group, Rect, Text, Circle } from "react-konva";
import { NodeState, NODE_SPECS, useFlow } from "../store";

interface Props {
  node: NodeState;
  onPortClick: (
    node: NodeState,
    dir: "in" | "out",
    port: string,
    types: string[]
  ) => void;
}

export default function Node({ node, onPortClick }: Props) {
  const select = useFlow((s) => s.select);
  const update = useFlow((s) => s.updateNode);
  const spec = NODE_SPECS[node.type];
  const height = Math.max(spec.in.length, spec.out.length) * 20 + 40;

  const statusColor: Record<NonNullable<NodeState["status"]>, string> = {
    idle: "#9ca3af",
    running: "#3b82f6",
    success: "#10b981",
    error: "#ef4444",
    warning: "#facc15",
  };

  return (
    <Group
      x={node.x}
      y={node.y}
      draggable
      dragBoundFunc={(pos) => ({
        x: Math.round(pos.x / 20) * 20,
        y: Math.round(pos.y / 20) * 20,
      })}
      onDragEnd={(e) => update(node.id, { x: e.target.x(), y: e.target.y() })}
      onClick={(e) => {
        e.cancelBubble = true;
        select(node.id);
      }}
    >
      <Rect width={120} height={height} fill="#f3f4f6" stroke="#4b5563" />
      <Text text={node.type} x={5} y={5} fontSize={14} />
      {/* status badge */}
      <Circle
        x={110}
        y={10}
        radius={6}
        fill={statusColor[node.status ?? "idle"]}
      />
      {spec.in.map((p, idx) => (
        <Circle
          key={p.port}
          x={0}
          y={20 + idx * 20}
          radius={5}
          fill="#0ea5e9"
          onClick={(e) => {
            e.cancelBubble = true;
            onPortClick(node, "in", p.port, p.types);
          }}
        />
      ))}
      {spec.out.map((p, idx) => (
        <Circle
          key={p.port}
          x={120}
          y={20 + idx * 20}
          radius={5}
          fill="#f97316"
          onClick={(e) => {
            e.cancelBubble = true;
            onPortClick(node, "out", p.port, p.types);
          }}
        />
      ))}
    </Group>
  );
}

