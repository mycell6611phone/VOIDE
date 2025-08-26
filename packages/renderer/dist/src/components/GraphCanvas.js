import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useCallback } from "react";
import ReactFlow, { Background, Controls, MiniMap, addEdge, useEdgesState, useNodesState } from "react-flow-renderer";
import { useFlowStore } from "../state/flowStore";
function rfNodeFrom(n) {
    return { id: n.id, data: n, position: { x: Math.random() * 400, y: Math.random() * 200 }, type: "default" };
}
export default function GraphCanvas() {
    const { flow, setFlow } = useFlowStore();
    const [nodes, setNodes, onNodesChange] = useNodesState(flow.nodes.map(rfNodeFrom));
    const [edges, setEdges, onEdgesChange] = useEdgesState(flow.edges.map((e) => ({ id: e.id, source: e.from[0], target: e.to[0] })));
    const onConnect = useCallback((c) => {
        const from = c.sourceHandle?.split(":")[1] ?? "out";
        const to = c.targetHandle?.split(":")[1] ?? "in";
        const src = flow.nodes.find(n => n.id === c.source);
        const dst = flow.nodes.find(n => n.id === c.target);
        const fromPort = src?.out.find(p => p.port === from);
        const toPort = dst?.in.find(p => p.port === to);
        const ok = fromPort && toPort && fromPort.types.some(t => toPort.types.includes(t));
        if (!ok)
            return;
        const id = `e:${c.source}-${from}:${c.target}-${to}`;
        const newEdge = { id, source: c.source, target: c.target, sourceHandle: c.sourceHandle, targetHandle: c.targetHandle, label: "" };
        setEdges(eds => addEdge(newEdge, eds));
        const eDef = { id, from: [c.source, from], to: [c.target, to] };
        setFlow({ ...flow, edges: [...flow.edges, eDef] });
    }, [flow, setFlow, setEdges]);
    return (_jsxs(ReactFlow, { nodes: nodes, edges: edges, onNodesChange: onNodesChange, onEdgesChange: onEdgesChange, onConnect: onConnect, fitView: true, children: [_jsx(MiniMap, {}), _jsx(Controls, {}), _jsx(Background, {})] }));
}
