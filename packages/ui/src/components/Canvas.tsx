import { useRef, useState, useEffect, useMemo } from "react";
import {
  Stage,
  Layer,
  Line,
  Group,
  Circle,
  Rect,
  RegularPolygon,
} from "react-konva";
import { useFlow, NodeState, portPosition, LightState } from "../store";
import Node from "./Node";
import InterfaceWindow from "./InterfaceWindow";

interface Pending {
  node: NodeState;
  port: string;
  types: string[];
}

interface ContextMenuState {
  nodeId: string;
  x: number;
  y: number;
}

const CONTEXT_MENU_WIDTH = 160;
const CONTEXT_MENU_HEIGHT = 44;

export default function Canvas() {
  const nodes = useFlow((s) => s.nodes);
  const edges = useFlow((s) => s.edges);
  const addEdge = useFlow((s) => s.addEdge);
  const select = useFlow((s) => s.select);
  const advancePulses = useFlow((s) => s.advancePulses);
  const interfaceWindows = useFlow((s) => s.interfaceWindows);
  const openInterface = useFlow((s) => s.openInterface);
  const minimizeInterface = useFlow((s) => s.minimizeInterface);
  const closeInterface = useFlow((s) => s.closeInterface);
  const setInterfaceInput = useFlow((s) => s.setInterfaceInput);
  const setInterfaceOutput = useFlow((s) => s.setInterfaceOutput);
  const setInterfaceGeometry = useFlow((s) => s.setInterfaceGeometry);
  const focusInterface = useFlow((s) => s.focusInterface);
  const clampInterfaceWindows = useFlow((s) => s.clampInterfaceWindows);
  const stageRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [stageSize, setStageSize] = useState({ width: 0, height: 0 });
  const [scale, setScale] = useState(1);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [pending, setPending] = useState<Pending | null>(null);
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);

  useEffect(() => {
    let anim: number;
    const step = () => {
      advancePulses();
      anim = requestAnimationFrame(step);
    };
    anim = requestAnimationFrame(step);
    return () => cancelAnimationFrame(anim);
  }, [advancePulses]);

  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;

    const updateSize = () => {
      const rect = element.getBoundingClientRect();
      const bounds = { width: rect.width, height: rect.height };
      setStageSize(bounds);
      if (bounds.width > 0 && bounds.height > 0) {
        clampInterfaceWindows(bounds);
      }
    };

    updateSize();
    const observer = new ResizeObserver(updateSize);
    observer.observe(element);
    return () => observer.disconnect();
  }, [clampInterfaceWindows]);

  useEffect(() => {
    if (!contextMenu) {
      return;
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setContextMenu(null);
      }
    };
    const handleMouseDown = (event: MouseEvent) => {
      const menu = menuRef.current;
      if (menu && menu.contains(event.target as Node)) {
        return;
      }
      setContextMenu(null);
    };
    const handleContext = (event: MouseEvent) => {
      const menu = menuRef.current;
      if (menu && menu.contains(event.target as Node)) {
        return;
      }
      setContextMenu(null);
    };
    const timer = window.setTimeout(() => {
      window.addEventListener("mousedown", handleMouseDown);
      window.addEventListener("contextmenu", handleContext);
      window.addEventListener("keydown", handleKeyDown);
    }, 0);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("mousedown", handleMouseDown);
      window.removeEventListener("contextmenu", handleContext);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [contextMenu]);

  function handlePort(
    node: NodeState,
    dir: "in" | "out",
    port: string,
    types: string[]
  ) {
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
    setContextMenu(null);
    if (e.target === e.target.getStage()) {
      select(undefined);
    }
  }

  const lightColor: Record<LightState, string> = useMemo(
    () => ({
      idle: "#9ca3af",
      queued: "#3b82f6",
      running: "#ffffff",
      ok: "#10b981",
      warn: "#facc15",
      error: "#ef4444",
      normalized: "#06b6d4",
      routed: "#d946ef",
    }),
    []
  );

  function PulseIcon({ type, x, y }: { type: string; x: number; y: number }) {
    if (type.includes("Prompt")) {
      return <Rect x={x - 3} y={y - 3} width={6} height={6} fill="#fff" />;
    }
    if (type.includes("LLM")) {
      return <RegularPolygon x={x} y={y} sides={3} radius={4} fill="#fff" />;
    }
    return <Circle x={x} y={y} radius={4} fill="#fff" />;
  }

  function handleNodeContextMenu(
    node: NodeState,
    event: any
  ) {
    if (node.type !== "Interface") {
      return;
    }
    const container = containerRef.current;
    if (!container) {
      return;
    }
    const rect = container.getBoundingClientRect();
    const rawX = event.evt.clientX - rect.left;
    const rawY = event.evt.clientY - rect.top;
    const x = Math.min(
      Math.max(0, rawX),
      Math.max(0, rect.width - CONTEXT_MENU_WIDTH)
    );
    const y = Math.min(
      Math.max(0, rawY),
      Math.max(0, rect.height - CONTEXT_MENU_HEIGHT)
    );
    setContextMenu({ nodeId: node.id, x, y });
  }

  function handleOpenInterface(nodeId: string) {
    if (stageSize.width === 0 || stageSize.height === 0) {
      return;
    }
    const preferredPosition = contextMenu
      ? {
          x: contextMenu.x - 40,
          y: contextMenu.y - 40,
        }
      : undefined;
    openInterface(nodeId, { bounds: stageSize, preferredPosition });
    focusInterface(nodeId);
    setContextMenu(null);
  }

  const boundsReady = stageSize.width > 0 && stageSize.height > 0;

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full"
      onContextMenu={(e) => e.preventDefault()}
    >
      <Stage
        width={Math.max(stageSize.width, 0)}
        height={Math.max(stageSize.height, 0)}
        scaleX={scale}
        scaleY={scale}
        x={pos.x}
        y={pos.y}
        draggable
        ref={stageRef}
        onWheel={onWheel}
        onMouseDown={onMouseDown}
        onDragEnd={(e) => setPos({ x: e.target.x(), y: e.target.y() })}
        onContextMenu={() => setContextMenu(null)}
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
            <Node
              key={n.id}
              node={n}
              onPortClick={handlePort}
              onContextMenu={handleNodeContextMenu}
            />
          ))}
        </Layer>
      </Stage>
      {contextMenu && (
        <div
          ref={menuRef}
          className="absolute bg-white border border-gray-200 rounded shadow-lg text-sm"
          style={{
            left: contextMenu.x,
            top: contextMenu.y,
            zIndex: 20000,
          }}
          role="menu"
        >
          <button
            type="button"
            className="block w-full px-3 py-2 text-left hover:bg-gray-100"
            onClick={() => handleOpenInterface(contextMenu.nodeId)}
            role="menuitem"
          >
            Open Interface
          </button>
        </div>
      )}
      {boundsReady &&
        Object.entries(interfaceWindows).map(([id, state]) =>
          state.isMinimized ? null : (
            <InterfaceWindow
              key={id}
              id={id}
              state={state}
              getContainerRect={() => containerRef.current?.getBoundingClientRect() ?? null}
              onClose={() => closeInterface(id)}
              onMinimize={() => minimizeInterface(id)}
              onFocus={() => focusInterface(id)}
              onInputChange={(value) => setInterfaceInput(id, value)}
              onOutputChange={(value) => setInterfaceOutput(id, value)}
              onGeometryChange={(geometry) =>
                setInterfaceGeometry(id, geometry, stageSize)
              }
            />
          )
        )}
    </div>
  );
}
