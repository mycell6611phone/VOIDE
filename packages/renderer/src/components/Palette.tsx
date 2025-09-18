import React from "react";
import type { NodeDef, PortDef } from "@voide/shared";
import { useFlowStore } from "../state/flowStore";

type ModuleConfig = {
  key: string;
  label: string;
  nodeType: "llm" | "module";
  inputs: PortDef[];
  outputs: PortDef[];
  description?: string;
};

type ToolConfig = {
  key: "wire";
  label: string;
  description?: string;
};

const POSITION_KEY = "__position";

const MODULES: ModuleConfig[] = [
  {
    key: "llm",
    label: "LLM",
    nodeType: "llm",
    inputs: [{ port: "prompt", types: ["TEXT"] }],
    outputs: [{ port: "response", types: ["TEXT"] }],
    description: "Large language model"
  },
  {
    key: "prompt",
    label: "Prompt",
    nodeType: "module",
    inputs: [],
    outputs: [{ port: "prompt", types: ["TEXT"] }],
    description: "Prepare model prompts"
  },
  {
    key: "debate",
    label: "Debate/Loop",
    nodeType: "module",
    inputs: [{ port: "input", types: ["TEXT"] }],
    outputs: [{ port: "result", types: ["TEXT"] }],
    description: "Iterative reasoning"
  },
  {
    key: "cache",
    label: "Cache",
    nodeType: "module",
    inputs: [{ port: "in", types: ["TEXT", "JSON"] }],
    outputs: [{ port: "out", types: ["TEXT", "JSON"] }],
    description: "Reuse previous outputs"
  },
  {
    key: "log",
    label: "Log",
    nodeType: "module",
    inputs: [{ port: "entry", types: ["TEXT", "JSON"] }],
    outputs: [],
    description: "Record activity"
  },
  {
    key: "memory",
    label: "Memory",
    nodeType: "module",
    inputs: [{ port: "store", types: ["TEXT", "JSON"] }],
    outputs: [{ port: "recall", types: ["TEXT", "JSON"] }],
    description: "Long-lived context"
  },
  {
    key: "diverter",
    label: "Divirter",
    nodeType: "module",
    inputs: [{ port: "in", types: ["TEXT", "JSON"] }],
    outputs: [
      { port: "pathA", types: ["TEXT", "JSON"] },
      { port: "pathB", types: ["TEXT", "JSON"] }
    ],
    description: "Route outputs"
  }
];

const TOOLS: ToolConfig[] = [
  {
    key: "wire",
    label: "Wiring Tool",
    description: "Connect modules together"
  }
];

const computePosition = (index: number) => {
  const columns = 3;
  const spacingX = 220;
  const spacingY = 140;
  const col = index % columns;
  const row = Math.floor(index / columns);
  return {
    x: 220 + col * spacingX,
    y: 160 + row * spacingY
  };
};

const uniqueNodeId = (prefix: string) =>
  `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;

const makeNode = (config: ModuleConfig, index: number): NodeDef => {
  const position = computePosition(index);
  return {
    id: uniqueNodeId(config.key),
    type: config.nodeType,
    name: config.label,
    params: { [POSITION_KEY]: position },
    in: config.inputs,
    out: config.outputs
  };
};

const sectionTitleStyle: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 700,
  textTransform: "uppercase",
  letterSpacing: 0.6,
  color: "#475569",
  marginBottom: 8
};

const moduleButtonStyle: React.CSSProperties = {
  border: "1px solid #d1d5db",
  borderRadius: 12,
  padding: "12px 10px",
  background: "#ffffff",
  color: "#1f2937",
  fontWeight: 600,
  textAlign: "left",
  display: "flex",
  flexDirection: "column",
  gap: 4,
  cursor: "pointer",
  transition: "border-color 0.2s ease, box-shadow 0.2s ease"
};

const toolButtonStyle: React.CSSProperties = {
  ...moduleButtonStyle,
  justifyContent: "space-between",
  flexDirection: "row",
  alignItems: "center"
};

export default function Palette() {
  const { flow, addNode, activeTool, setActiveTool } = useFlowStore((state) => ({
    flow: state.flow,
    addNode: state.addNode,
    activeTool: state.activeTool,
    setActiveTool: state.setActiveTool
  }));

  const handleAddModule = (config: ModuleConfig) => {
    const node = makeNode(config, flow.nodes.length);
    addNode(node);
    if (activeTool !== "select") {
      setActiveTool("select");
    }
  };

  const handleToggleTool = (tool: ToolConfig) => {
    setActiveTool(activeTool === tool.key ? "select" : tool.key);
  };

  return (
    <aside
      style={{
        width: 240,
        borderRight: "1px solid #e2e8f0",
        background: "#f8fafc",
        padding: "16px 14px",
        display: "flex",
        flexDirection: "column",
        gap: 24,
        overflowY: "auto"
      }}
    >
      <div>
        <div style={sectionTitleStyle}>Modules</div>
        <div style={{ display: "grid", gap: 12 }}>
          {MODULES.map((module) => (
            <button
              key={module.key}
              style={{
                ...moduleButtonStyle,
                borderColor: module.key === "llm" ? "#fca5a5" : moduleButtonStyle.border,
                boxShadow: "none"
              }}
              onClick={() => handleAddModule(module)}
            >
              <span>{module.label}</span>
              {module.description ? (
                <span style={{ fontSize: 12, fontWeight: 400, color: "#64748b" }}>
                  {module.description}
                </span>
              ) : null}
            </button>
          ))}
        </div>
      </div>

      <div>
        <div style={sectionTitleStyle}>Tools</div>
        <div style={{ display: "grid", gap: 12 }}>
          {TOOLS.map((tool) => (
            <button
              key={tool.key}
              style={{
                ...toolButtonStyle,
                borderColor: activeTool === tool.key ? "#94a3b8" : toolButtonStyle.border,
                background: activeTool === tool.key ? "#e2e8f0" : toolButtonStyle.background
              }}
              onClick={() => handleToggleTool(tool)}
            >
              <span>{tool.label}</span>
              {tool.description ? (
                <span style={{ fontSize: 12, fontWeight: 400, color: "#64748b" }}>
                  {tool.description}
                </span>
              ) : null}
            </button>
          ))}
        </div>
      </div>
    </aside>
  );
}

