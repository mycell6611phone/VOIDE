import React, { useEffect, useState } from "react";
import GraphCanvas from "./components/GraphCanvas";
import RunControls from "./components/RunControls";
import Palette from "./components/Palette";
import ChatInterface from "./components/ChatInterface";
import { useFlowStore } from "./state/flowStore";
import { ipcClient } from "./lib/ipcClient";

const appShellStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  height: "100vh",
  background: "#e2e8f0"
};

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

function getCurrentRoute(): string {
  if (typeof window === "undefined") {
    return "";
  }
  const hash = window.location.hash.replace(/^#/, "");
  return hash.replace(/^\//, "");
}

function MainWorkspace() {
  const flow = useFlowStore((state) => state.flow);

  return (
    <div style={appShellStyle}>
      <RunControls
        onRun={async () => {
          await ipcClient.runFlow(flow);
        }}
      />
      <div style={workspaceRowStyle}>
        <Palette />
        <div style={canvasContainerStyle}>
          <GraphCanvas />
        </div>
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
