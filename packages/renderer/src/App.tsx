import React, { useEffect } from "react";
import GraphCanvas from "./components/GraphCanvas";
import RunControls from "./components/RunControls";
import Palette from "./components/Palette";
import { useFlowStore } from "./state/flowStore";
import { voide } from "./voide";
import GlobalStyles from "./components/GlobalStyles";

function App() {
  const setCatalog = useFlowStore((state) => state.setCatalog);

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
        gridTemplateRows: "64px 1fr",
        height: "100vh",
      }}
    >
      <GlobalStyles />
      <div style={{ gridColumn: "1 / -1", width: "100%", height: "100%" }}>
        <RunControls />
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "240px 1fr",
          minHeight: 0,
          height: "100%",
        }}
      >
        <div style={{ height: "100%", overflow: "auto" }}>
          <Palette />
        </div>
        <div
          style={{
            minHeight: 0,
            height: "100%",
            overflow: "hidden",
          }}
        >
          <GraphCanvas />
        </div>
      </div>
    </div>
  );
}

export default App;

