import { useFlow } from "../store";

export default function OutputPanel() {
  const text = useFlow((s) => s.output);
  return (
    <div className="h-full w-full overflow-auto p-2 bg-gray-100">
      <pre className="whitespace-pre-wrap text-sm">{text}</pre>
    </div>
  );
}

