import { NODE_SPECS, useFlow } from "../store";

export default function Inspector() {
  const node = useFlow((s) => s.nodes.find((n) => n.id === s.selected));
  const update = useFlow((s) => s.updateNode);
  if (!node) return <div className="p-2 text-gray-500">No selection</div>;
  const spec = NODE_SPECS[node.type];
  return (
    <div className="p-2 space-y-2">
      {spec.config.map((f) => (
        <div key={f.key} className="space-y-1">
          <label className="block text-xs">{f.label}</label>
          <input
            className="w-full border rounded px-1 py-0.5"
            type={f.type === "string" ? "text" : f.type}
            value={node.config[f.key]}
            onChange={(e) =>
              update(node.id, {
                config: { ...node.config, [f.key]: e.target.value },
              })
            }
          />
        </div>
      ))}
    </div>
  );
}

