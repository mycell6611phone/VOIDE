import React, { useEffect, useState } from "react";
import GraphCanvas from "./components/GraphCanvas";
import RunControls from "./components/RunControls";
import Palette from "./components/Palette";
import ChatInterface from "./components/ChatInterface";
import { useFlowStore } from "./state/flowStore";
import { voide } from "./voide";
import Inspector from "./components/Inspector";
import PropertiesPanel from "./components/PropertiesPanel";

function App() {
  const { flow, setCatalog } = useFlowStore();
  const [runId, setRunId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    voide
      .getNodeCatalog()
      .then((catalog) => {
        if (!cancelled) setCatalog(catalog);
      })
      .catch((err) => console.error("Failed to load node catalog", err));
    return () => {
      cancelled = true;
    };
  }, [setCatalog]);

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "240px 1fr 320px",
        height: "100vh",
      }}
    >
      <div style={{ height: "100%", overflow: "auto" }}>
        <Palette />
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateRows: "48px 1fr 200px",
          height: "100%",
          minHeight: 0,
        }}
      >
        <RunControls
          onRun={async () => {
            const r = await voide.runFlow(flow);
            setRunId(r.runId);
          }}
          onStop={async () => {
            if (runId) await voide.stopFlow(runId);
          }}
        />
        <div style={{ minHeight: 0, height: "100%" }}>
          <GraphCanvas />
        </div>
        <div style={{ height: "100%", overflow: "auto" }}>
          <Inspector runId={runId} />
        </div>
      </div>
      <div style={{ height: "100%", overflow: "auto" }}>
        <PropertiesPanel />
      </div>
    </div>
  );
}

export default App;

