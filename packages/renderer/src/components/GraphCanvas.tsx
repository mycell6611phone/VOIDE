
import "./react-flow-renderer.css";

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
  EdgeChange,
  Node,
  NodeChange,
  ReactFlowInstance,
  Viewport,
  useEdgesState,
  useNodesState,
} from "react-flow-renderer";

import type { EdgeDef, FlowDef, NodeDef } from "@voide/shared";
import type { TelemetryPayload } from "@voide/ipc";
import { useFlowStore, type CanvasBridge } from "../state/flowStore";
import ModuleNode from "./nodes/BasicNode";
import LLMNode from "./nodes/LLMNode";
import { CanvasBoundaryProvider } from "./CanvasBoundaryContext";
import ContextWindow from "./ContextWindow";
import EditMenu, {
  EDIT_MENU_DATA_ATTRIBUTE,
  EDIT_MENU_HEIGHT,
  EDIT_MENU_ITEMS,
  EDIT_MENU_WIDTH,
  type EditMenuItemLabel
} from "./EditMenu";
import { type WindowGeometry, type WindowSize } from "./contextWindowUtils";
import ChatWindow from "./ChatWindow";
import {
  recordInputPortActivity,
  recordOutputPortActivity
} from "../state/portActivityStore";
import { voide } from "../voide";
import TelemetryEdge from "./edges/TelemetryEdge";
import {
  markEdgeError,
  recordEdgeTransferError,
  recordEdgeTransferSuccess
} from "../state/edgeActivityStore";
import { useModuleTesterStore } from "../state/moduleTesterStore";

const POSITION_KEY = "__position";
const CONTEXT_WINDOW_DEFAULT_SIZE: WindowSize = { width: 320, height: 260 };
const CONTEXT_WINDOW_POINTER_OFFSET = 12;
const EDIT_MENU_SELECTOR = `[${EDIT_MENU_DATA_ATTRIBUTE}]`;

const cloneValue = <T,>(value: T): T => {
  if (typeof structuredClone === "function") {
    return structuredClone(value);
  }
  return JSON.parse(JSON.stringify(value)) as T;
};

const cloneNodeDef = (node: NodeDef): NodeDef => ({
  ...node,
  params: node.params ? { ...node.params } : undefined,
  in: Array.isArray(node.in) ? node.in.map((port) => ({ ...port })) : [],
  out: Array.isArray(node.out) ? node.out.map((port) => ({ ...port })) : [],
});

const cloneEdgeDef = (edge: EdgeDef): EdgeDef => ({
  ...edge,
  from: [edge.from[0], edge.from[1]],
  to: [edge.to[0], edge.to[1]],
});

interface GraphContextWindowState {
  node: NodeDef;
  geometry: WindowGeometry;
  open: boolean;
  minimized: boolean;
}

interface EdgeContextMenuState {
  edgeId: string;
  left: number;
  top: number;
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
  type: "telemetry"
});

export default function GraphCanvas() {
  const {
    flow,
    activeTool,
    copyEdge,
    cutEdge,
    deleteEdge,
    pasteClipboard,
    clipboard: clipboardItem,
    registerCanvasBridge,
    unregisterCanvasBridge,
    syncFlowFromCanvas,
  } = useFlowStore((state) => ({
    flow: state.flow,
    activeTool: state.activeTool,
    copyEdge: state.copyEdge,
    cutEdge: state.cutEdge,
    deleteEdge: state.deleteEdge,
    pasteClipboard: state.pasteClipboard,
    clipboard: state.clipboard,
    registerCanvasBridge: state.registerCanvasBridge,
    unregisterCanvasBridge: state.unregisterCanvasBridge,
    syncFlowFromCanvas: state.syncFlowFromCanvas,
  }));

  const containerRef = useRef<HTMLDivElement | null>(null);
  const overlayRef = useRef<HTMLDivElement | null>(null);
  const reactFlowInstanceRef = useRef<ReactFlowInstance | null>(null);
  const [bounds, setBounds] = useState<DOMRectReadOnly | null>(null);
  const [contextWindow, setContextWindow] = useState<
    GraphContextWindowState | null
  >(null);
  const [edgeMenu, setEdgeMenu] = useState<EdgeContextMenuState | null>(null);
  const flowRef = useRef<FlowDef>(flow);
  const edgesRef = useRef<EdgeDef[]>(flow.edges);

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

  const edgeTypes = useMemo(
    () => ({ telemetry: TelemetryEdge }),
    []
  );

  const applyFlowUpdate = useCallback(
    (
      recipe: (current: FlowDef) => { flow: FlowDef; changed: boolean },
      invalidate: boolean
    ) => {
      const { flow: next, changed } = recipe(flowRef.current);
      if (!changed) {
        return { flow: flowRef.current, changed: false } as const;
      }
      flowRef.current = next;
      edgesRef.current = next.edges;
      if (invalidate) {
        syncFlowFromCanvas(next, { invalidate: true });
      } else {
        syncFlowFromCanvas(next);
      }
      return { flow: next, changed: true } as const;
    },
    [syncFlowFromCanvas]
  );

  const replaceFlowSilently = useCallback(
    (nextFlow: FlowDef) => {
      const normalized = cloneValue(nextFlow);
      flowRef.current = normalized;
      edgesRef.current = normalized.edges;
      setNodes(normalized.nodes.map(toReactFlowNode));
      setEdges(normalized.edges.map(toReactFlowEdge));
    },
    [setEdges, setNodes]
  );

  const addNodeToCanvas = useCallback(
    (node: NodeDef) => {
      const nodeClone = cloneNodeDef(node);
      const result = applyFlowUpdate(
        (current) => ({
          flow: { ...current, nodes: [...current.nodes, nodeClone] },
          changed: true,
        }),
        true
      );
      if (result.changed) {
        setNodes((prev) => [...prev, toReactFlowNode(nodeClone)]);
      }
      return nodeClone;
    },
    [applyFlowUpdate, setNodes]
  );

  const setNodeOnCanvas = useCallback(
    (node: NodeDef) => {
      const nodeClone = cloneNodeDef(node);
      const result = applyFlowUpdate(
        (current) => {
          let changed = false;
          const nodes = current.nodes.map((existing) => {
            if (existing.id !== nodeClone.id) {
              return existing;
            }
            changed = true;
            return nodeClone;
          });
          if (!changed) {
            return { flow: current, changed: false } as const;
          }
          return { flow: { ...current, nodes }, changed: true } as const;
        },
        true
      );
      if (result.changed) {
        setNodes((prev) =>
          prev.map((reactNode) =>
            reactNode.id === nodeClone.id
              ? {
                  ...reactNode,
                  data: nodeClone,
                  position: getPosition(nodeClone),
                }
              : reactNode
          )
        );
        return nodeClone;
      }
      return null;
    },
    [applyFlowUpdate, setNodes]
  );

  const deleteNodeFromCanvas = useCallback(
    (nodeId: string) => {
      const result = applyFlowUpdate(
        (current) => {
          if (!current.nodes.some((node) => node.id === nodeId)) {
            return { flow: current, changed: false } as const;
          }
          const nodes = current.nodes.filter((node) => node.id !== nodeId);
          const edges = current.edges.filter(
            (edge) => edge.from[0] !== nodeId && edge.to[0] !== nodeId
          );
          return { flow: { ...current, nodes, edges }, changed: true } as const;
        },
        true
      );
      if (result.changed) {
        setNodes((prev) => prev.filter((node) => node.id !== nodeId));
        setEdges((prev) =>
          prev.filter((edge) => edge.source !== nodeId && edge.target !== nodeId)
        );
        return true;
      }
      return false;
    },
    [applyFlowUpdate, setEdges, setNodes]
  );

  const addEdgeOnCanvas = useCallback(
    (edge: EdgeDef) => {
      const edgeClone = cloneEdgeDef(edge);
      const result = applyFlowUpdate(
        (current) => {
          if (current.edges.some((existing) => existing.id === edgeClone.id)) {
            return { flow: current, changed: false } as const;
          }
          return {
            flow: { ...current, edges: [...current.edges, edgeClone] },
            changed: true,
          } as const;
        },
        true
      );
      if (result.changed) {
        setEdges((prev) => [...prev, toReactFlowEdge(edgeClone)]);
      }
      return edgeClone;
    },
    [applyFlowUpdate, setEdges]
  );

  const deleteEdgeFromCanvas = useCallback(
    (edgeId: string) => {
      const result = applyFlowUpdate(
        (current) => {
          if (!current.edges.some((edge) => edge.id === edgeId)) {
            return { flow: current, changed: false } as const;
          }
          return {
            flow: {
              ...current,
              edges: current.edges.filter((edge) => edge.id !== edgeId),
            },
            changed: true,
          } as const;
        },
        true
      );
      if (result.changed) {
        setEdges((prev) => prev.filter((edge) => edge.id !== edgeId));
        return true;
      }
      return false;
    },
    [applyFlowUpdate, setEdges]
  );

  const serializeFlowFromReactFlow = useCallback((): FlowDef => {
    const instance = reactFlowInstanceRef.current;
    const base = flowRef.current;
    if (!instance) {
      return cloneValue(base);
    }
    const { nodes: rfNodes, edges: rfEdges } = instance.toObject();
    const baseNodes = new Map(base.nodes.map((node) => [node.id, node]));
    const nodes: NodeDef[] = rfNodes.map((rfNode) => {
      const dataCandidate =
        rfNode.data && typeof rfNode.data === "object"
          ? (rfNode.data as NodeDef)
          : undefined;
      const baseNode = baseNodes.get(rfNode.id);
      const resolved = dataCandidate ?? baseNode;
      const params = { ...(resolved?.params ?? {}) };
      params[POSITION_KEY] = { x: rfNode.position.x, y: rfNode.position.y };
      if (resolved) {
        const cloned = cloneNodeDef(resolved);
        cloned.params = params;
        return cloned;
      }
      return {
        id: rfNode.id,
        type: (rfNode.type as string | undefined) ?? "module",
        name:
          dataCandidate?.name ?? baseNode?.name ?? rfNode.id ?? "Node",
        params,
        in: baseNode?.in ? baseNode.in.map((port) => ({ ...port })) : [],
        out: baseNode?.out ? baseNode.out.map((port) => ({ ...port })) : [],
      };
    });
    const baseEdges = new Map(base.edges.map((edge) => [edge.id, edge]));
    const edges: EdgeDef[] = rfEdges.map((rfEdge) => {
      const baseEdge = baseEdges.get(rfEdge.id);
      const fromPort =
        rfEdge.sourceHandle?.split(":")[1] ?? baseEdge?.from?.[1] ?? "out";
      const toPort =
        rfEdge.targetHandle?.split(":")[1] ?? baseEdge?.to?.[1] ?? "in";
      const edgeDef: EdgeDef = {
        id: rfEdge.id,
        from: [rfEdge.source, fromPort],
        to: [rfEdge.target, toPort],
      };
      if (baseEdge?.label) {
        edgeDef.label = baseEdge.label;
      }
      return edgeDef;
    });
    return cloneValue({ ...base, nodes, edges });
  }, []);

  const canvasBridge = useMemo<CanvasBridge>(
    () => ({
      getFlow: () => serializeFlowFromReactFlow(),
      replaceFlow: (nextFlow) => replaceFlowSilently(nextFlow),
      addNode: (node) => addNodeToCanvas(node),
      setNode: (node) => setNodeOnCanvas(node),
      deleteNode: (nodeId) => deleteNodeFromCanvas(nodeId),
      addEdge: (edge) => addEdgeOnCanvas(edge),
      deleteEdge: (edgeId) => deleteEdgeFromCanvas(edgeId),
    }),
    [
      addEdgeOnCanvas,
      addNodeToCanvas,
      deleteEdgeFromCanvas,
      deleteNodeFromCanvas,
      replaceFlowSilently,
      serializeFlowFromReactFlow,
      setNodeOnCanvas,
    ]
  );

  useEffect(() => {
    registerCanvasBridge(canvasBridge);
    return () => unregisterCanvasBridge(canvasBridge);
  }, [canvasBridge, registerCanvasBridge, unregisterCanvasBridge]);

  useEffect(() => {
    if (flow === flowRef.current) {
      return;
    }
    replaceFlowSilently(flow);
  }, [flow, replaceFlowSilently]);

  useEffect(() => {
    if (typeof voide.onTelemetry !== "function") {
      return;
    }

    const handleTelemetry = (payload: TelemetryPayload) => {
      if (!payload || typeof payload !== "object") {
        return;
      }
      const eventAt = "at" in payload && typeof payload.at === "number" ? payload.at : undefined;
      if (payload.type !== "edge_transfer") {
        return;
      }
      if (payload.type === "edge_transfer") {
        const edges = edgesRef.current;
        const match = edges.find((edge) => edge.id === payload.edgeId);
        if (!match) {
          return;
        }
        const [sourceNode, sourcePort] = match.from;
        const [targetNode, targetPort] = match.to;
        if (sourceNode && sourcePort) {
          recordOutputPortActivity(sourceNode, sourcePort, eventAt);
        }
        if (targetNode && targetPort) {
          recordInputPortActivity(targetNode, targetPort, eventAt);
        }
        recordEdgeTransferSuccess(match.id, eventAt);
        return;
      }

      if (payload.type === "error") {
        const relatedEdges = edgesRef.current.filter((edge) => edge.from[0] === payload.nodeId);
        relatedEdges.forEach((edge) => markEdgeError(edge.id, eventAt));
        return;
      }

      if (payload.type === "operation_progress" && payload.status === "error") {
        const relatedEdges = edgesRef.current.filter((edge) => edge.from[0] === payload.nodeId);
        relatedEdges.forEach((edge) => recordEdgeTransferError(edge.id));
      }
    };

    const unsubscribe = voide.onTelemetry(handleTelemetry);

    return () => {
      if (typeof unsubscribe === "function") {
        unsubscribe();
      }
    };
  }, []);

  const handleReactFlowInit = useCallback((instance: ReactFlowInstance) => {
    reactFlowInstanceRef.current = instance;
  }, []);

  const setCanvasZoom = useModuleTesterStore((state) => state.setCanvasZoom);
  const setTesterDragging = useModuleTesterStore((state) => state.setDragging);
  const setTesterHover = useModuleTesterStore((state) => state.setDropZoneHover);
  const isPointInsideTester = useModuleTesterStore((state) => state.isPointInsideDropZone);
  const startTesterSession = useModuleTesterStore((state) => state.startSession);

  const handleMove = useCallback(
    (_event: MouseEvent | TouchEvent | null, viewport: Viewport) => {
      if (viewport && typeof viewport.zoom === "number") {
        setCanvasZoom(viewport.zoom);
      }
    },
    [setCanvasZoom]
  );

  const handleNodeDragStart = useCallback(
    (event: React.MouseEvent, _node: Node<NodeDef>) => {
      setTesterDragging(true);
      const inside = isPointInsideTester(event.clientX, event.clientY);
      setTesterHover(inside);
    },
    [isPointInsideTester, setTesterDragging, setTesterHover]
  );

  const handleNodeDrag = useCallback(
    (event: React.MouseEvent, _node: Node<NodeDef>) => {
      const inside = isPointInsideTester(event.clientX, event.clientY);
      setTesterHover(inside);
    },
    [isPointInsideTester, setTesterHover]
  );

  const handleNodeDragStop = useCallback(
    (event: React.MouseEvent, node: Node<NodeDef>) => {
      setTesterDragging(false);
      const inside = isPointInsideTester(event.clientX, event.clientY);
      setTesterHover(false);
      if (!inside) {
        return;
      }
      const matched = flow.nodes.find((candidate) => candidate.id === node.id) ?? node.data;
      if (matched) {
        startTesterSession(matched as NodeDef);
      }
    },
    [flow.nodes, isPointInsideTester, setTesterDragging, setTesterHover, startTesterSession]
  );

  const handleNodesChange = useCallback(
    (changes: NodeChange[]) => {
      onNodesChangeBase(changes);

      const positionChanges = changes.filter(
        (change) => change.type === "position" && !!change.position
      );

      if (positionChanges.length === 0) {
        return;
      }

      const result = applyFlowUpdate(
        (current) => {
          let changed = false;
          const nodes = current.nodes.map((node) => {
            const match = positionChanges.find((change) => change.id === node.id);
            if (!match || !match.position) {
              return node;
            }
            const params = { ...(node.params ?? {}) } as Record<string, unknown>;
            const previous = params[POSITION_KEY] as { x?: number; y?: number } | undefined;
            const nextPosition = match.position!;
            if (
              previous &&
              typeof previous.x === "number" &&
              typeof previous.y === "number" &&
              previous.x === nextPosition.x &&
              previous.y === nextPosition.y
            ) {
              return node;
            }
            params[POSITION_KEY] = nextPosition;
            changed = true;
            return { ...node, params };
          });
          if (!changed) {
            return { flow: current, changed: false } as const;
          }
          return { flow: { ...current, nodes }, changed: true } as const;
        },
        false
      );

      if (result.changed) {
        const lookup = new Map(result.flow.nodes.map((node) => [node.id, node]));
        setNodes((prev) =>
          prev.map((reactNode) => {
            const updated = lookup.get(reactNode.id);
            return updated ? { ...reactNode, data: updated } : reactNode;
          })
        );
      }
    },
    [applyFlowUpdate, onNodesChangeBase, setNodes]
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

      applyFlowUpdate(
        (current) => {
          const remaining = current.edges.filter((edge) => !removed.includes(edge.id));
          if (remaining.length === current.edges.length) {
            return { flow: current, changed: false } as const;
          }
          return { flow: { ...current, edges: remaining }, changed: true } as const;
        },
        true
      );
    },
    [applyFlowUpdate, onEdgesChangeBase]
  );

  const onConnect = useCallback(
    (connection: Connection) => {
      if (!connection.source || !connection.target) {
        return;
      }

      const fromPort = connection.sourceHandle?.split(":")[1] ?? "out";
      const toPort = connection.targetHandle?.split(":")[1] ?? "in";
      const id = `e:${connection.source}-${fromPort}:${connection.target}-${toPort}`;

      const edgeDef: EdgeDef = {
        id,
        from: [connection.source, fromPort],
        to: [connection.target, toPort],
      };

      addEdgeOnCanvas(edgeDef);
    },
    [addEdgeOnCanvas]
  );

const handleNodeContextMenu = useCallback(
  (event: React.MouseEvent, node: Node<NodeDef>) => {
    event.preventDefault();
    event.stopPropagation();

    const PAD = CONTEXT_WINDOW_POINTER_OFFSET;
    const size =
      contextWindow && contextWindow.node.id === node.data.id
        ? contextWindow.geometry.size
        : CONTEXT_WINDOW_DEFAULT_SIZE;

    const overlay = overlayRef.current;
    let x: number;
    let y: number;

    if (overlay) {
      const rect = overlay.getBoundingClientRect();
      const pointerX = event.clientX - rect.left;
      const pointerY = event.clientY - rect.top;

      const maxX = Math.max(PAD, rect.width - size.width - PAD);
      const maxY = Math.max(PAD, rect.height - size.height - PAD);

      x = Math.min(Math.max(pointerX + PAD, PAD), maxX);
      y = Math.min(Math.max(pointerY + PAD, PAD), maxY);
    } else {
      const vw = window.innerWidth;
      const vh = window.innerHeight;

      x = Math.min(Math.max(event.clientX + PAD, PAD), vw - size.width - PAD);
      y = Math.min(Math.max(event.clientY + PAD, PAD), vh - size.height - PAD);
    }

    setEdgeMenu(null);
    setContextWindow({
      node: node.data,
      geometry: { position: { x, y }, size },
      open: true,
      minimized: false
    });
  },
  [contextWindow, overlayRef]
);

  const handlePaneClick = useCallback(() => {
    setEdgeMenu(null);
    setContextWindow((previous) =>
      previous ? { ...previous, open: false, minimized: false } : null
    );
  }, []);

  const handlePaneContextMenu = useCallback((event: React.MouseEvent) => {
    event.preventDefault();
    setEdgeMenu(null);
    setContextWindow((previous) =>
      previous ? { ...previous, open: false, minimized: false } : null
    );
  }, []);

 const handleEdgeContextMenu = useCallback(
  (event: React.MouseEvent, edge: Edge<NodeDef>) => {
    event.preventDefault();
    event.stopPropagation();

    const vw = window.innerWidth;
    const vh = window.innerHeight;

    const clampedX = Math.min(
      Math.max(event.clientX, CONTEXT_WINDOW_POINTER_OFFSET),
      vw - EDIT_MENU_WIDTH - CONTEXT_WINDOW_POINTER_OFFSET
    );
    const clampedY = Math.min(
      Math.max(event.clientY, CONTEXT_WINDOW_POINTER_OFFSET),
      vh - EDIT_MENU_HEIGHT - CONTEXT_WINDOW_POINTER_OFFSET
    );

    setContextWindow(null);
    setEdgeMenu({
      edgeId: edge.id,
      left: clampedX,
      top: clampedY,
    });
  },
  []
);


  const handleEdgeMenuSelect = useCallback(
    (label: EditMenuItemLabel) => {
      if (!edgeMenu) {
        return;
      }
      const targetEdgeId = edgeMenu.edgeId;
      setEdgeMenu(null);
      switch (label) {
        case "Copy":
          copyEdge(targetEdgeId);
          break;
        case "Cut":
          cutEdge(targetEdgeId);
          break;
        case "Delete":
          deleteEdge(targetEdgeId);
          break;
        case "Paste":
          pasteClipboard("edge");
          break;
        default:
          break;
      }
    },
    [copyEdge, cutEdge, deleteEdge, edgeMenu, pasteClipboard]
  );

  useEffect(() => {
    if (!edgeMenu) {
      return;
    }

    const handleDismiss = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.closest?.(EDIT_MENU_SELECTOR)) {
        return;
      }
      setEdgeMenu(null);
    };

    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setEdgeMenu(null);
      }
    };

    window.addEventListener("mousedown", handleDismiss);
    window.addEventListener("contextmenu", handleDismiss);
    window.addEventListener("keydown", handleKey);

    return () => {
      window.removeEventListener("mousedown", handleDismiss);
      window.removeEventListener("contextmenu", handleDismiss);
      window.removeEventListener("keydown", handleKey);
    };
  }, [edgeMenu]);

  useEffect(() => {
    if (!edgeMenu) {
      return;
    }

    const exists = flow.edges.some((edge) => edge.id === edgeMenu.edgeId);
    if (!exists) {
      setEdgeMenu(null);
    }
  }, [edgeMenu, flow.edges]);

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
        style={{
          width: "100%",
          height: "100%",
          position: "relative",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden"
        }}
      >
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={handleNodesChange}
          onEdgesChange={handleEdgesChange}
          onConnect={onConnect}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          defaultEdgeOptions={{ type: "telemetry" }}
          onNodeContextMenu={handleNodeContextMenu}
          onEdgeContextMenu={handleEdgeContextMenu}
          onPaneClick={handlePaneClick}
          onPaneContextMenu={handlePaneContextMenu}
          onInit={handleReactFlowInit}
          onMove={handleMove}
          onNodeDragStart={handleNodeDragStart}
          onNodeDrag={handleNodeDrag}
          onNodeDragStop={handleNodeDragStop}
          proOptions={{ hideAttribution: true }}
          autoPanOnNodeDrag={false}
          autoPanOnConnect={false}
          panOnDrag={true}
          panOnScroll={false}
          zoomOnScroll
          zoomOnPinch
          zoomOnDoubleClick={false}
          minZoom={0.1}
          maxZoom={2.4}
          style={{
            flex: 1,
            width: "100%",
            height: "100%",
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

        <ChatWindow />

        {edgeMenu ? (
          <EditMenu
            position={{ left: edgeMenu.left, top: edgeMenu.top }}
            items={EDIT_MENU_ITEMS.map((label) => ({
              label,
              disabled: label === "Paste" && clipboardItem?.kind !== "edge",
              onSelect: () => handleEdgeMenuSelect(label)
            }))}
          />
        ) : null}

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

