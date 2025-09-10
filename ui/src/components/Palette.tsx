import { NodeType, useFlow } from "../store";

const TYPES: NodeType[] = ["Input", "Prompt", "LLM", "Branch", "Log", "Output"];

export default function Palette() {
  const add = useFlow((s) => s.addNode);
  return (
    <div className="p-2 space-y-2 border-r h-full overflow-y-auto">
      {TYPES.map((t) => (
        <button
          key={t}
          className="block w-full bg-gray-200 hover:bg-gray-300 rounded px-2 py-1 text-left"
          onClick={() => add(t, 100, 100)}
        >
          {t}
        </button>
      ))}
    </div>
  );
}

