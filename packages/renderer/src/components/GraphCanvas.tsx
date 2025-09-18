import "reactflow/dist/style.css";
import React, { useCallback, useEffect, useMemo } from "react";
import ReactFlow, {
  Background,
  Connection,
  Edge,
  EdgeChange,
  NodeChange,
  addEdge,
  useEdgesState,
  useNodesState
} from "reactflow";
import type { EdgeDef, NodeDef } from "@voide/shared";
import { useFlowStore } from "../state/flowStore";
import ModuleNode from "./nodes/BasicNode";
import LLMNode from "./nodes/LLMNode";

const POSITION_KEY = "__position";

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

  return (
    <div style={{ width: "100%", height: "100%" }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={handleNodesChange}
        onEdgesChange={handleEdgesChange}
        onConnect={onConnect}
        nodeTypes={nodeTypes}
        fitView
        proOptions={{ hideAttribution: true }}
        style={{
          background: "#ffffff",
          cursor: activeTool === "wire" ? "crosshair" : "default"
        }}
      >
        <Background color="#e2e8f0" gap={32} size={1} />
      </ReactFlow>
    </div>
  );
}

