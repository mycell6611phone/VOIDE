import { Group, Rect, Text, Circle, RegularPolygon } from "react-konva";
import type { KonvaEventObject } from "konva/lib/Node";
import { NodeState, NODE_SPECS, useFlow, LightState } from "../store";

interface Props {
  node: NodeState;
  onPortClick: (
    node: NodeState,
    dir: "in" | "out",
    port: string,
    types: string[]
  ) => void;
  onContextMenu?: (
    node: NodeState,
    event: KonvaEventObject<PointerEvent>
  ) => void;
}

export default function Node({ node, onPortClick, onContextMenu }: Props) {
  const select = useFlow((s) => s.select);
  const update = useFlow((s) => s.updateNode);
  const spec = NODE_SPECS[node.type];
  const isInterface = node.type === "Interface";
  const baseHeight = Math.max(spec.in.length, spec.out.length) * 20 + 40;
  const height = isInterface ? Math.max(baseHeight, 120) : baseHeight;

  const lightColor: Record<LightState, string> = {
    idle: "#9ca3af",
    queued: "#3b82f6",
    running: "#ffffff",
    ok: "#10b981",
    warn: "#facc15",
    error: "#ef4444",
    normalized: "#06b6d4",
    routed: "#d946ef",
  };

  function PortIcon({ type, x, y }: { type: string; x: number; y: number }) {
    if (type.includes("Prompt")) {
      return <Rect x={x - 4} y={y - 4} width={8} height={8} fill="#4b5563" />;
    }
    if (type.includes("LLM")) {
      return <RegularPolygon x={x} y={y} sides={3} radius={5} fill="#4b5563" />;
    }
    return <Circle x={x} y={y} radius={4} fill="#4b5563" />;
  }

  function renderPort(
    dir: "in" | "out",
    p: { port: string; types: string[] },
    idx: number
  ) {
    const x = dir === "in" ? 0 : 120;
    const badgeX = dir === "in" ? 8 : 60;
    const textX = dir === "in" ? 12 : 64;
    const y = 20 + idx * 20;
    const iconX = dir === "in" ? -8 : 128;
    return (
      <Group key={p.port}>
        <Circle
          x={x}
          y={y}
          radius={5}
          fill={dir === "in" ? "#0ea5e9" : "#f97316"}
          onClick={(e) => {
            e.cancelBubble = true;
            onPortClick(node, dir, p.port, p.types);
          }}
        />
        <Rect
          x={badgeX}
          y={y - 6}
          width={48}
          height={12}
          fill="#e5e7eb"
          cornerRadius={3}
        />
        <Text text={p.port} x={textX} y={y - 5} fontSize={10} />
        <PortIcon type={p.types[0] ?? ""} x={iconX} y={y} />
      </Group>
    );
  }

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
      onContextMenu={(e) => {
        e.evt.preventDefault();
        e.cancelBubble = true;
        select(node.id);
        onContextMenu?.(node, e);
      }}
    >
      <Rect
        width={120}
        height={height}
        fill={isInterface ? "#ffffff" : "#f3f4f6"}
        stroke={isInterface ? "#dc2626" : "#4b5563"}
        strokeWidth={isInterface ? 2 : 1}
      />
      {isInterface ? (
        <>
          <Text
            text="Interface"
            x={0}
            y={height / 2 - 8}
            width={120}
            align="center"
            fontSize={14}
          />
          <Text
            text={`#${node.id}`}
            x={0}
            y={height - 20}
            width={120}
            align="center"
            fontSize={10}
            fill="#6b7280"
          />
        </>
      ) : (
        <Text text={node.type} x={5} y={5} fontSize={14} />
      )}
      {/* status badge */}
      <Circle
        x={110}
        y={10}
        radius={6}
        fill={lightColor[node.status ?? "idle"]}
      />
      {spec.in.map((p, idx) => renderPort("in", p, idx))}
      {spec.out.map((p, idx) => renderPort("out", p, idx))}
    </Group>
  );
}

