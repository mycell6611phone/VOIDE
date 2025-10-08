import React, { useMemo } from "react";
import type { NodeDef, PortDef } from "@voide/shared";
import { useFlowStore } from "../state/flowStore";
import type { NodeCatalogEntry } from "../voide";

type ToolConfig = {
  key: "wire";
  label: string;
  description?: string;
};

const POSITION_KEY = "__position";

const MODULE_DESCRIPTIONS: Record<string, string> = {
  "chat.input": "Chat entry point",
  prompt: "Prepare model prompts",
  llm: "Large language model",
  "debate.loop": "Iterative reasoning",
  cache: "Reuse previous outputs",
  log: "Record activity",
  memory: "Store and retrieve persistent context",
  diverter: "Route outputs",
  "tool.call": "Invoke registered tools",
};

const TOOLS: ToolConfig[] = [
  {
    key: "wire",
    label: "Wiring Tool",
    description: "Connect modules together",
  },
];

const computePosition = (index: number) => {
  const columns = 3;
  const spacingX = 220;
  const spacingY = 140;
  const col = index % columns;
  const row = Math.floor(index / columns);
  return {
    x: 220 + col * spacingX,
    y: 160 + row * spacingY,
  };
};

const uniqueNodeId = (prefix: string) =>
  `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;

const clonePorts = (ports: Array<{ port: string; types: string[] }> | undefined): PortDef[] =>
  Array.isArray(ports)
    ? ports.map((port) => ({ port: port.port, types: [...port.types] }))
    : [];

const makeNode = (entry: NodeCatalogEntry, index: number): NodeDef => {
  const position = computePosition(index);
  return {
    id: uniqueNodeId(entry.type),
    type: entry.type,
    name: entry.label,
    params: {
      [POSITION_KEY]: position,
      moduleKey: entry.type,
      ...(entry.params ?? {}),
    },
    in: clonePorts(entry.inputs),
    out: clonePorts(entry.outputs),
  };
};

const sectionTitleStyle: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 700,
  textTransform: "uppercase",
  letterSpacing: 0.6,
  color: "#475569",
  marginBottom: 8,
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
  transition: "border-color 0.2s ease, box-shadow 0.2s ease",
};

const toolButtonStyle: React.CSSProperties = {
  ...moduleButtonStyle,
  justifyContent: "space-between",
  flexDirection: "row",
  alignItems: "center",
};

export default function Palette() {
  const { flow, addNode, activeTool, setActiveTool, catalog } = useFlowStore((state) => ({
    flow: state.flow,
    addNode: state.addNode,
    activeTool: state.activeTool,
    setActiveTool: state.setActiveTool,
    catalog: state.catalog,
  }));

  const modules = useMemo(() => {
    if (!Array.isArray(catalog)) {
      return [] as NodeCatalogEntry[];
    }
    return catalog
      .map((entry) => {
        if (!entry || typeof entry !== "object") {
          return null;
        }
        const record = entry as NodeCatalogEntry;
        if (typeof record.type !== "string" || typeof record.label !== "string") {
          return null;
        }
        return record;
      })
      .filter((entry): entry is NodeCatalogEntry => Boolean(entry));
  }, [catalog]);

  const handleAddModule = (entry: NodeCatalogEntry) => {
    const node = makeNode(entry, flow.nodes.length);
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
        width: 192,
        borderRight: "1px solid #e2e8f0",
        background: "#f8fafc",
        padding: "16px 14px",
        display: "flex",
        flexDirection: "column",
        gap: 18,
      }}
    >
      <div>
        <div style={sectionTitleStyle}>Modules</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {modules.length === 0 ? (
            <div style={{ fontSize: 12, color: "#64748b" }}>
              Node catalog unavailable. Connect to the runtime to load modules.
            </div>
          ) : (
            modules.map((entry) => {
              const description = MODULE_DESCRIPTIONS[entry.type] ?? "";
              return (
                <button
                  key={entry.type}
                  style={moduleButtonStyle}
                  onClick={() => handleAddModule(entry)}
                >
                  <span style={{ fontSize: 14 }}>{entry.label}</span>
                  {description ? (
                    <span style={{ fontSize: 11, color: "#64748b" }}>{description}</span>
                  ) : null}
                </button>
              );
            })
          )}
        </div>
      </div>
      <div>
        <div style={sectionTitleStyle}>Tools</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {TOOLS.map((tool) => {
            const isActive = activeTool === tool.key;
            return (
              <button
                key={tool.key}
                style={{
                  ...toolButtonStyle,
                  borderColor: isActive ? "#2563eb" : "#d1d5db",
                  background: isActive ? "#e0f2fe" : toolButtonStyle.background,
                }}
                onClick={() => handleToggleTool(tool)}
              >
                <span style={{ fontSize: 13 }}>{tool.label}</span>
                {tool.description ? (
                  <span style={{ fontSize: 11, color: "#64748b" }}>{tool.description}</span>
                ) : null}
              </button>
            );
          })}
        </div>
      </div>
    </aside>
  );
}
