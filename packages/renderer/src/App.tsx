import React, { useEffect, useState } from "react";
import GraphCanvas from "./components/GraphCanvas";
import PropertiesPanel from "./components/PropertiesPanel";
import RunControls from "./components/RunControls";
import Inspector from "./components/Inspector";
import { useFlowStore } from "./state/flowStore";

declare global { interface Window { voide: any } }

export default function App() {
  const { flow, setCatalog } = useFlowStore();
  const [runId, setRunId] = useState<string | null>(null);

  useEffect(() => { window.voide.getNodeCatalog().then(setCatalog); }, [setCatalog]);

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", height: "100vh" }}>
      <div style={{ display: "grid", gridTemplateRows: "48px 1fr 200px" }}>
        <RunControls onRun={async () => { const r = await window.voide.runFlow(flow); setRunId(r.runId); }} onStop={async ()=> runId && window.voide.stopFlow(runId)} />
        <GraphCanvas />
        <Inspector runId={runId} />
      </div>
      <PropertiesPanel />
    </div>
  );
}
