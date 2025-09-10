import { useRef, useState } from "react";
import { Stage, Layer, Line } from "react-konva";
import { useFlow, NodeState, portPosition } from "../store";
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
  const stageRef = useRef<any>(null);
  const [scale, setScale] = useState(1);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [pending, setPending] = useState<Pending | null>(null);

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
            <Line
              key={e.id}
              points={[p1.x, p1.y, p2.x, p2.y]}
              stroke="#4b5563"
            />
          );
        })}
        {nodes.map((n) => (
          <Node key={n.id} node={n} onPortClick={handlePort} />
        ))}
      </Layer>
    </Stage>
  );
}

