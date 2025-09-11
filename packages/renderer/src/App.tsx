import React, { useState } from "react";
import GraphCanvas from "./components/GraphCanvas";
import PropertiesPanel from "./components/PropertiesPanel";
import RunControls from "./components/RunControls";
import Inspector from "./components/Inspector";
import { useFlowStore } from "./state/flowStore";
import { ipcClient } from "./lib/ipcClient";

export default function App() {
  const { flow } = useFlowStore();
  const [runId, setRunId] = useState<string | null>(null);

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", height: "100vh" }}>
      <div style={{ display: "grid", gridTemplateRows: "48px 1fr 200px" }}>
        <RunControls onRun={async () => { const r = await ipcClient.runFlow(flow); setRunId(r.runId); }} />
        <GraphCanvas />
        <Inspector runId={runId} />
      </div>
      <PropertiesPanel />
    </div>
  );
}
