import React, { useEffect, useState } from "react";
import GraphCanvas from "./components/GraphCanvas";
import PropertiesPanel from "./components/PropertiesPanel";
import RunControls from "./components/RunControls";
import Inspector from "./components/Inspector";
import { useFlowStore } from "./state/flowStore";

declare global { interface Window { voide?: any } }

export default function App() {
  const { flow, setCatalog } = useFlowStore();
  const [runId, setRunId] = useState<string | null>(null);

  useEffect(() => {
    if (window.voide && window.voide.getNodeCatalog) {
      window.voide.getNodeCatalog().then(setCatalog);
    } else {
      console.warn("window.voide not available — running in browser dev mode");
    }
  }, [setCatalog]);

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", height: "100vh" }}>
      <div style={{ display: "grid", gridTemplateRows: "48px 1fr 200px" }}>
        <RunControls
          onRun={async () => {
            if (window.voide?.runFlow) {
              const r = await window.voide.runFlow(flow);
              setRunId(r.runId);
            } else {
              console.warn("runFlow not available — running in browser dev mode");
            }
          }}
          onStop={async () => {
            if (runId && window.voide?.stopFlow) {
              await window.voide.stopFlow(runId);
            } else {
              console.warn("stopFlow not available — running in browser dev mode");
            }
          }}
        />
        <GraphCanvas />
        <Inspector runId={runId} />
      </div>
      <PropertiesPanel />
    </div>
  );
}

