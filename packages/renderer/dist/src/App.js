import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from "react";
import GraphCanvas from "./components/GraphCanvas";
import PropertiesPanel from "./components/PropertiesPanel";
import RunControls from "./components/RunControls";
import Inspector from "./components/Inspector";
import { useFlowStore } from "./state/flowStore";
export default function App() {
    const { flow, setCatalog } = useFlowStore();
    const [runId, setRunId] = useState(null);
    useEffect(() => { window.voide.getNodeCatalog().then(setCatalog); }, [setCatalog]);
    return (_jsxs("div", { style: { display: "grid", gridTemplateColumns: "1fr 320px", height: "100vh" }, children: [_jsxs("div", { style: { display: "grid", gridTemplateRows: "48px 1fr 200px" }, children: [_jsx(RunControls, { onRun: async () => { const r = await window.voide.runFlow(flow); setRunId(r.runId); }, onStop: async () => runId && window.voide.stopFlow(runId) }), _jsx(GraphCanvas, {}), _jsx(Inspector, { runId: runId })] }), _jsx(PropertiesPanel, {})] }));
}
