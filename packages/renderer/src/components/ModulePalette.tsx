import React, { useCallback, useMemo } from "react";
import { useFlowStore } from "../state/flowStore";

const CATEGORY_NAMES = ["LLMs", "Prompt", "Loop", "Persona", "Tool", "Memory", "Validate"] as const;

function buildCategories(catalog: any[]) {
  const cats: Record<(typeof CATEGORY_NAMES)[number], any[]> = {
    LLMs: [],
    Prompt: [],
    Loop: [],
    Persona: [],
    Tool: [],
    Memory: [],
    Validate: [],
  };
  catalog.forEach((item) => {
    const t = item.type as string;
    if (t.startsWith("llm")) cats.LLMs.push(item);
    else if (t.includes("prompt")) cats.Prompt.push(item);
    else if (t === "loop") cats.Loop.push(item);
    else if (t.includes("persona")) cats.Persona.push(item);
    else if (["retriever", "vector.store", "embedding"].includes(t)) cats.Memory.push(item);
    else if (t === "critic") cats.Validate.push(item);
    else cats.Tool.push(item);
  });
  return cats;
}

export default function ModulePalette() {
  const catalog = useFlowStore((s) => s.catalog);
  const cats = useMemo(() => buildCategories(catalog), [catalog]);

  const onDragStart = useCallback((event: React.DragEvent, type: string) => {
    event.dataTransfer.setData("application/reactflow", type);
    event.dataTransfer.effectAllowed = "move";
  }, []);

  return (
    <div style={{ width: 200, borderRight: "1px solid #eee", padding: 8, overflowY: "auto" }}>
      {CATEGORY_NAMES.map((cat) => (
        <div key={cat} style={{ marginBottom: 16 }}>
          <h4 style={{ margin: "8px 0" }}>{cat}</h4>
          {cats[cat].map((item) => (
            <div
              key={item.type}
              draggable
              onDragStart={(e) => onDragStart(e, item.type)}
              style={{
                padding: "4px 8px",
                border: "1px solid #ccc",
                borderRadius: 4,
                marginBottom: 4,
                cursor: "grab",
                background: "#fff",
              }}
            >
              {item.type}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}


