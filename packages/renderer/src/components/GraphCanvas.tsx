import 'reactflow/dist/style.css';
import React, { useCallback } from "react";
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  addEdge,
  Connection,
  Edge,
  Node,
  useEdgesState,
  useNodesState
} from "reactflow";
import { useFlowStore } from "../state/flowStore";
import type { EdgeDef, NodeDef } from "@voide/shared";

function rfNodeFrom(n: NodeDef): Node {
  return {
    id: n.id,
    data: n,
    position: { x: Math.random() * 400, y: Math.random() * 200 },
    type: "default"
  };
}

export default function GraphCanvas() {
  const { flow, setFlow } = useFlowStore();
  const [nodes, setNodes, onNodesChange] = useNodesState(
    flow.nodes.map(rfNodeFrom)
  );
  const [edges, setEdges, onEdgesChange] = useEdgesState(
    flow.edges.map((e) => ({ id: e.id, source: e.from[0], target: e.to[0] }))
  );

  const onConnect = useCallback(
    (c: Connection) => {
      // GUI stage policy: accept any wire. No type blocking here.
      if (!c.source || !c.target) return;

      const from = c.sourceHandle?.split(":")[1] ?? "out";
      const to = c.targetHandle?.split(":")[1] ?? "in";
      const id = `e:${c.source}-${from}:${c.target}-${to}`;

      const newEdge: Edge = {
        id,
        source: c.source!,
        target: c.target!,
        sourceHandle: c.sourceHandle,
        targetHandle: c.targetHandle,
        label: ""
      };

      setEdges((eds) => addEdge(newEdge, eds));
      const eDef: EdgeDef = { id, from: [c.source!, from], to: [c.target!, to] };
      setFlow({ ...flow, edges: [...flow.edges, eDef] });
    },
    [flow, setFlow, setEdges]
  );

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      onConnect={onConnect}
      fitView
    >
      <MiniMap />
      <Controls />
      <Background />
    </ReactFlow>
  );
}

