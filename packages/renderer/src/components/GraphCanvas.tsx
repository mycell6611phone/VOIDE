import "reactflow/dist/style.css";

import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState
} from "react";

import ReactFlow, {
  Background,
  Connection,
  Edge,
  EdgeChange,
  Node,
  NodeChange,
  addEdge,
  useEdgesState,
  useNodesState
} from "reactflow";

import type { EdgeDef, NodeDef } from "@voide/shared";
import { useFlowStore } from "../state/flowStore";
import ModuleNode from "./nodes/BasicNode";
import LLMNode from "./nodes/LLMNode";
import { CanvasBoundaryProvider } from "./CanvasBoundaryContext";
import ContextWindow from "./ContextWindow";
import {
  clampGeometry,
  type WindowGeometry,
  type WindowSize
} from "./contextWindowUtils";

const POSITION_KEY = "__position";
const CONTEXT_WINDOW_DEFAULT_SIZE: WindowSize = { width: 320, height: 260 };
const CONTEXT_WINDOW_POINTER_OFFSET = 12;

interface GraphContextWindowState {
  node: NodeDef;
  geometry: WindowGeometry;
  open: boolean;
  minimized: boolean;
}

const getPosition = (node: NodeDef) => {
  const params = node.params as Record<string, unknown> | undefined;
  const value = params?.[POSITION_KEY] as { x?: number; y?: number } | undefined;
  if (value && typeof value.x === "number" && typeof value.y === "number") {
    return { x: value.x, y: value.y };
  }
  return { x: 360, y: 240 };
};

const toReactFlowNode = (node: NodeDef) => ({
  id: node.id,
  data: node,
  position: getPosition(node),
  type: node.type ?? "module"
});

const toReactFlowEdge = (edge: EdgeDef): Edge => ({
  id: edge.id,
  source: edge.from[0],
  target: edge.to[0],
  sourceHandle: `${edge.from[0]}:${edge.from[1]}`,
  targetHandle: `${edge.to[0]}:${edge.to[1]}`,
  label: edge.label ?? ""
});

export default function GraphCanvas() {
  const { flow, setFlow, activeTool } = useFlowStore((state) => ({
    flow: state.flow,
    setFlow: state.setFlow,
    activeTool: state.activeTool
  }));

  const containerRef = useRef<HTMLDivElement | null>(null);
  const overlayRef = useRef<HTMLDivElement | null>(null);
  const [bounds, setBounds] = useState<DOMRectReadOnly | null>(null);
  const [contextWindow, setContextWindow] = useState<
    GraphContextWindowState | null
  >(null);

  const refreshBounds = useCallback(() => {
    if (!containerRef.current) {
      return;
    }
    setBounds(containerRef.current.getBoundingClientRect());
  }, []);

  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return;
    }

    refreshBounds();

    let observer: ResizeObserver | null = null;
    if (typeof ResizeObserver !== "undefined") {
      observer = new ResizeObserver(() => refreshBounds());
      observer.observe(container);
    }

    const handleWindowResize = () => refreshBounds();
    window.addEventListener("resize", handleWindowResize);
    window.addEventListener("scroll", handleWindowResize, true);

    return () => {
      observer?.disconnect();
      window.removeEventListener("resize", handleWindowResize);
      window.removeEventListener("scroll", handleWindowResize, true);
    };
  }, [refreshBounds]);

  const nodeTypes = useMemo(
    () => ({
      module: ModuleNode,
      llm: LLMNode,
      default: ModuleNode
    }),
    []
  );

  const [nodes, setNodes, onNodesChangeBase] = useNodesState(
    flow.nodes.map(toReactFlowNode)
  );
  const [edges, setEdges, onEdgesChangeBase] = useEdgesState(
    flow.edges.map(toReactFlowEdge)
  );

  useEffect(() => {
    setNodes(flow.nodes.map(toReactFlowNode));
  }, [flow.nodes, setNodes]);

  useEffect(() => {
    setEdges(flow.edges.map(toReactFlowEdge));
  }, [flow.edges, setEdges]);

  const handleNodesChange = useCallback(
    (changes: NodeChange[]) => {
      onNodesChangeBase(changes);

      const positionChanges = changes.filter(
        (change) => change.type === "position" && !!change.position
      );

      if (positionChanges.length === 0) {
        return;
      }

      const updatedNodes = flow.nodes.map((node) => {
        const match = positionChanges.find((change) => change.id === node.id);
        if (!match || !match.position) {
          return node;
        }
        const params = { ...(node.params ?? {}) } as Record<string, unknown>;
        params[POSITION_KEY] = match.position;
        return { ...node, params };
      });

      setFlow({ ...flow, nodes: updatedNodes });
    },
    [flow, onNodesChangeBase, setFlow]
  );

  const handleEdgesChange = useCallback(
    (changes: EdgeChange[]) => {
      onEdgesChangeBase(changes);

      const removed = changes
        .filter((change) => change.type === "remove")
        .map((change) => change.id);

      if (removed.length === 0) {
        return;
      }

      setFlow({
        ...flow,
        edges: flow.edges.filter((edge) => !removed.includes(edge.id))
      });
    },
    [flow, onEdgesChangeBase, setFlow]
  );

  const onConnect = useCallback(
    (connection: Connection) => {
      if (!connection.source || !connection.target) {
        return;
      }

      const fromPort = connection.sourceHandle?.split(":")[1] ?? "out";
      const toPort = connection.targetHandle?.split(":")[1] ?? "in";
      const id = `e:${connection.source}-${fromPort}:${connection.target}-${toPort}`;

      const newEdge: Edge = {
        id,
        source: connection.source,
        target: connection.target,
        sourceHandle: connection.sourceHandle,
        targetHandle: connection.targetHandle,
        label: ""
      };

      setEdges((existing) => addEdge(newEdge, existing));

      const edgeDef: EdgeDef = {
        id,
        from: [connection.source, fromPort],
        to: [connection.target, toPort]
      };

      setFlow({ ...flow, edges: [...flow.edges, edgeDef] });
    },
    [flow, setEdges, setFlow]
  );

  const handleNodeContextMenu = useCallback(
    (event: React.MouseEvent, node: Node<NodeDef>) => {
      event.preventDefault();
      event.stopPropagation();

      const overlay = overlayRef.current;
      if (!overlay) {
        return;
      }

      const rect = overlay.getBoundingClientRect();
      const pointerPosition = {
        x: event.clientX - rect.left + CONTEXT_WINDOW_POINTER_OFFSET,
        y: event.clientY - rect.top + CONTEXT_WINDOW_POINTER_OFFSET
      };

      setContextWindow((previous) => {
        const previousSize =
          previous && previous.node.id === node.data.id
            ? previous.geometry.size
            : CONTEXT_WINDOW_DEFAULT_SIZE;

        const nextGeometry = clampGeometry(
          {
            position: pointerPosition,
            size: previousSize
          },
          { width: rect.width, height: rect.height }
        );

        return {
          node: node.data,
          geometry: nextGeometry,
          open: true,
          minimized: false
        };
      });

      refreshBounds();
    },
    [overlayRef, refreshBounds]
  );

  const handlePaneClick = useCallback(() => {
    setContextWindow((previous) =>
      previous ? { ...previous, open: false, minimized: false } : null
    );
  }, []);

  const handlePaneContextMenu = useCallback((event: React.MouseEvent) => {
    event.preventDefault();
    setContextWindow((previous) =>
      previous ? { ...previous, open: false, minimized: false } : null
    );
  }, []);

  const handleContextWindowUpdate = useCallback((geometry: WindowGeometry) => {
    setContextWindow((previous) =>
      previous ? { ...previous, geometry } : previous
    );
  }, []);

  const handleContextWindowClose = useCallback(() => {
    setContextWindow((previous) =>
      previous ? { ...previous, open: false, minimized: false } : null
    );
  }, []);

  const handleContextWindowToggleMinimize = useCallback(() => {
    setContextWindow((previous) =>
      previous
        ? { ...previous, minimized: !previous.minimized, open: true }
        : previous
    );
  }, []);

  const boundaryValue = useMemo(
    () => ({
      bounds,
      refreshBounds,
      overlayRef
    }),
    [bounds, refreshBounds]
  );

  return (
    <CanvasBoundaryProvider value={boundaryValue}>
      <div
        ref={containerRef}
        data-testid="graph-canvas-container"
        style={{ width: "100%", height: "100%", position: "relative" }}
      >
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={handleNodesChange}
          onEdgesChange={handleEdgesChange}
          onConnect={onConnect}
          nodeTypes={nodeTypes}
          onNodeContextMenu={handleNodeContextMenu}
          onPaneClick={handlePaneClick}
          onPaneContextMenu={handlePaneContextMenu}
          fitView
          proOptions={{ hideAttribution: true }}
          style={{
            background: "#ffffff",
            cursor: activeTool === "wire" ? "crosshair" : "default"
          }}
        >
          <Background color="#e2e8f0" gap={32} size={1} />
        </ReactFlow>

        <div
          ref={overlayRef}
          data-testid="graph-canvas-overlay"
          style={{
            position: "absolute",
            inset: 0,
            pointerEvents: "none"
          }}
        />

        {contextWindow ? (
          <ContextWindow
            title={`${contextWindow.node.name ?? contextWindow.node.id ?? "Node"} Context`}
            open={contextWindow.open}
            position={contextWindow.geometry.position}
            size={contextWindow.geometry.size}
            minimized={contextWindow.minimized}
            onUpdate={handleContextWindowUpdate}
            onRequestClose={handleContextWindowClose}
            onToggleMinimize={handleContextWindowToggleMinimize}
          >
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={{ fontSize: 14, fontWeight: 600 }}>
                {contextWindow.node.name ?? contextWindow.node.id ?? "Node"}
              </div>
              <div style={{ fontSize: 12, color: "#475569", lineHeight: 1.4 }}>
                Right-click menus for the graph will appear here. Select a node to
                inspect its details and shortcuts.
              </div>
              <div style={{ fontSize: 12 }}>
                <strong>ID:</strong> {contextWindow.node.id}
              </div>
              {contextWindow.node.type ? (
                <div style={{ fontSize: 12 }}>
                  <strong>Type:</strong> {contextWindow.node.type}
                </div>
              ) : null}
            </div>
          </ContextWindow>
        ) : null}
      </div>
    </CanvasBoundaryProvider>
  );
}

