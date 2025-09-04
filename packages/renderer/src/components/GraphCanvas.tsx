import React, { useCallback, useRef, useState } from "react";
import ReactFlow, { Background, Controls, MiniMap, addEdge, Connection, Edge, Node, ReactFlowInstance, useEdgesState, useNodesState } from "react-flow-renderer";
import { useFlowStore } from "../state/flowStore";
import type { EdgeDef, NodeDef, PortDef, NodeKind } from "@voide/shared";
import LLMNode from "./nodes/LLMNode";
import PromptNode from "./nodes/PromptNode";
import ToolNode from "./nodes/ToolNode";

const nodeTypes = {
  llm: LLMNode,
  prompt: PromptNode,
  tool: ToolNode,
};

function rfNodeFrom(n: NodeDef): Node {
  const kindMap: Partial<Record<NodeKind, string>> = {
    LLM: "llm",
    Prompt: "prompt",
    ToolCall: "tool",
  };
  const type = kindMap[n.kind as NodeKind] ?? "default";
   return { id: n.id, data: n, position: { x: Math.random() * 400, y: Math.random() * 200 }, type: "default" };
}

export default function GraphCanvas() {
  const { flow, setFlow, catalog } = useFlowStore();
  const [nodes, setNodes, onNodesChange] = useNodesState(flow.nodes.map(rfNodeFrom));
  const [edges, setEdges, onEdgesChange] = useEdgesState(
    flow.edges.map((e) => ({ id: e.id, source: e.from[0], target: e.to[0] }))
  );

  const wrapperRef = useRef<HTMLDivElement>(null);
  const [rfInstance, setRfInstance] = useState<ReactFlowInstance | null>(null);
  const idRef = useRef(0);
  const getId = () => `n${idRef.current++}`;

  const onConnect = useCallback(
    (c: Connection) => {
      const from = c.sourceHandle?.split(":")[1] ?? "out";
      const to = c.targetHandle?.split(":")[1] ?? "in";
      const src = flow.nodes.find((n) => n.id === c.source);
      const dst = flow.nodes.find((n) => n.id === c.target);
      const fromPort = src?.out.find((p) => p.port === from) as PortDef | undefined;
      const toPort = dst?.in.find((p) => p.port === to) as PortDef | undefined;
      const ok = fromPort && toPort && fromPort.types.some((t) => toPort.types.includes(t));
      if (!ok) return;

      const id = `e:${c.source}-${from}:${c.target}-${to}`;
      const newEdge: Edge = {
        id,
        source: c.source!,
        target: c.target!,
        sourceHandle: c.sourceHandle,
        targetHandle: c.targetHandle,
        label: "",
      };
      setEdges((eds) => addEdge(newEdge, eds));

      const eDef: EdgeDef = {
        id,
        from: [c.source!, from],
        to: [c.target!, to],
        direction: "forward",
        edgeType: "data",
      };
      setFlow({ ...flow, edges: [...flow.edges, eDef] });
    },
    [flow, setFlow, setEdges]
  );

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      const type = event.dataTransfer.getData("application/reactflow");
      if (!type || !rfInstance) return;

      const bounds = wrapperRef.current?.getBoundingClientRect();
      const position = rfInstance.project({
        x: event.clientX - (bounds?.left ?? 0),
        y: event.clientY - (bounds?.top ?? 0),
      });

      const id = getId();
      const spec = catalog.find((c) => c.type === type) ?? { in: [], out: [] };
      const nodeDef: NodeDef = {
        id,
        kind: "UI" as unknown as NodeKind,
        type,
        name: type,
        params: {},
        in: spec.in,
        out: spec.out,
      };
      const newNode: Node = { id, data: nodeDef, position, type: "default" };
      setNodes((nds) => nds.concat(newNode));
      setFlow({ ...flow, nodes: [...flow.nodes, nodeDef] });
    },
    [rfInstance, catalog, setNodes, flow, setFlow]
  );

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }, []);

  return (
    <div ref={wrapperRef} style={{ width: "100%", height: "100%" }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onDrop={onDrop}
        onDragOver={onDragOver}
        onLoad={setRfInstance}
        fitView
      >
        <MiniMap />
        <Controls />
        <Background />
      </ReactFlow>
    </div>
  );
}

