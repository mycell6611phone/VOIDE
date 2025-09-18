import React from "react";
import GraphCanvas from "./components/GraphCanvas";
import RunControls from "./components/RunControls";
import Palette from "./components/Palette";
import { useFlowStore } from "./state/flowStore";
import { ipcClient } from "./lib/ipcClient";

export default function App() {
  const flow = useFlowStore((state) => state.flow);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100vh",
        background: "#e2e8f0"
      }}
    >
      <RunControls
        onRun={async () => {
          await ipcClient.runFlow(flow);
        }}
      />
      <div
        style={{
          display: "flex",
          flex: 1,
          minHeight: 0
        }}
      >
        <Palette />
        <div
          style={{
            flex: 1,
            minHeight: 0,
            position: "relative",
            background: "#ffffff"
          }}
        >
          <GraphCanvas />
        </div>
      </div>
    </div>
  );
}
