import { useRef, useState, useEffect } from "react";
import { Stage, Layer, Line, Group, Circle, Rect, RegularPolygon } from "react-konva";
import { useFlow, NodeState, portPosition, LightState } from "../store";
import Node from "./Node";

interface Pending {
  node: NodeState;
  port: string;
  types: string[];
}

export default function Canvas() {
  const nodes = useFlow((s) => s.nodes);
  const edges = useFlow((s) => s.edges);
  const addEdge = useFlow((s) => s.addEdge);
  const select = useFlow((s) => s.select);
  const advancePulses = useFlow((s) => s.advancePulses);
  const stageRef = useRef<any>(null);
  const [scale, setScale] = useState(1);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [pending, setPending] = useState<Pending | null>(null);

  useEffect(() => {
    let anim: number;
    const step = () => {
      advancePulses();
      anim = requestAnimationFrame(step);
    };
    anim = requestAnimationFrame(step);
    return () => cancelAnimationFrame(anim);
  }, [advancePulses]);

  function handlePort(node: NodeState, dir: "in" | "out", port: string, types: string[]) {
    if (dir === "out" && !pending) {
      setPending({ node, port, types });
      return;
    }
    if (dir === "in" && pending) {
      const ok = pending.types.some((t) => types.includes(t));
      if (ok) {
        addEdge(
          { node: pending.node.id, port: pending.port },
          { node: node.id, port },
          pending.types.find((t) => types.includes(t))!
        );
      }
      setPending(null);
    }
  }

  function onWheel(e: any) {
    e.evt.preventDefault();
    const scaleBy = 1.05;
    const stage = stageRef.current;
    const oldScale = scale;
    const mousePointTo = {
      x: (e.evt.x - stage.x()) / oldScale,
      y: (e.evt.y - stage.y()) / oldScale,
    };
    const newScale = e.evt.deltaY > 0 ? oldScale / scaleBy : oldScale * scaleBy;
    setScale(newScale);
    setPos({
      x: e.evt.x - mousePointTo.x * newScale,
      y: e.evt.y - mousePointTo.y * newScale,
    });
  }

  function onMouseDown(e: any) {
    if (e.target === e.target.getStage()) {
      select(undefined);
    }
  }

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

  function PulseIcon({ type, x, y }: { type: string; x: number; y: number }) {
    if (type.includes("Prompt")) {
      return <Rect x={x - 3} y={y - 3} width={6} height={6} fill="#fff" />;
    }
    if (type.includes("LLM")) {
      return <RegularPolygon x={x} y={y} sides={3} radius={4} fill="#fff" />;
    }
    return <Circle x={x} y={y} radius={4} fill="#fff" />;
  }

  return (
    <Stage
      width={window.innerWidth}
      height={window.innerHeight - 128}
      scaleX={scale}
      scaleY={scale}
      x={pos.x}
      y={pos.y}
      draggable
      ref={stageRef}
      onWheel={onWheel}
      onMouseDown={onMouseDown}
      onDragEnd={(e) => setPos({ x: e.target.x(), y: e.target.y() })}
    >
      <Layer>
        {edges.map((e) => {
          const fromNode = nodes.find((n) => n.id === e.from.node)!;
          const toNode = nodes.find((n) => n.id === e.to.node)!;
          const p1 = portPosition(fromNode, "out", e.from.port);
          const p2 = portPosition(toNode, "in", e.to.port);
          return (
            <Group key={e.id}>
              <Line
                points={[p1.x, p1.y, p2.x, p2.y]}
                stroke={lightColor[e.status ?? "idle"]}
                strokeWidth={2}
              />
              {e.pulses.map((p) => {
                const x = p1.x + (p2.x - p1.x) * p.progress;
                const y = p1.y + (p2.y - p1.y) * p.progress;
                return <PulseIcon key={p.id} type={p.shape} x={x} y={y} />;
              })}
            </Group>
          );
        })}
        {nodes.map((n) => (
          <Node key={n.id} node={n} onPortClick={handlePort} />
        ))}
      </Layer>
    </Stage>
  );
}

