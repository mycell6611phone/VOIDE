import React from "react";

import { StandaloneChatView } from "./ChatWindow";

const shellStyle: React.CSSProperties = {
  height: "100vh",
  width: "100vw",
  background: "linear-gradient(135deg, rgba(15, 23, 42, 0.95), rgba(30, 41, 59, 0.92))",
  display: "flex",
  alignItems: "stretch",
  justifyContent: "center",
  padding: "32px 24px"
};

const containerStyle: React.CSSProperties = {
  flex: 1,
  maxWidth: 840,
  minHeight: 0
};

export default function ChatInterface() {
  return (
    <div style={shellStyle}>
      <div style={containerStyle}>
        <StandaloneChatView nodeId="standalone" label="Interface" />
      </div>
    </div>
  );
}
