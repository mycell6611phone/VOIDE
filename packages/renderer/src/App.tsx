import React, { useCallback, useEffect, useState } from "react";
import GraphCanvas from "./components/GraphCanvas";
import RunControls from "./components/RunControls";
import Palette from "./components/Palette";
import ChatInterface from "./components/ChatInterface";
import { useFlowStore } from "./state/flowStore";
import { voide } from "./voide";


const workspaceRowStyle: React.CSSProperties = {
  display: "flex",
  flex: 1,
  minHeight: 0
};

const canvasContainerStyle: React.CSSProperties = {
  flex: 1,
  minHeight: 0,
  position: "relative",
  background: "#ffffff"
};

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
    <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", height: "100vh" }}>
      <div style={{ display: "grid", gridTemplateRows: "48px 1fr 200px" }}>
        <RunControls
          onRun={async () => {
            const r = await voide.runFlow(flow);
            setRunId(r.runId);
          }}
          onStop={async () => {
            if (runId) await voide.stopFlow(runId);
          }}
        />
        <GraphCanvas />
        <Inspector runId={runId} />
      </div>
    </div>
  );
}

export default function App() {
  const [route, setRoute] = useState<string>(() => getCurrentRoute());

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    const handleHashChange = () => setRoute(getCurrentRoute());
    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);

  if (route === "chat") {
    return <ChatInterface />;
  }

  return <MainWorkspace />;
}
