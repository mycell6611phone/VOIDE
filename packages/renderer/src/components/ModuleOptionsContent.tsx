import React from "react";

// Define the types that BasicNode.tsx expects to import from this file
export type ModuleCategory =
  | "prompt"
  | "debate"
  | "log"
  | "cache"
  | "divider"
  | "interface";

// This is a function that accepts the previous params and returns the new ones
export type ParamsUpdater = (
  previousParams: Record<string, any>
) => Record<string, any>;

interface ModuleOptionsContentProps {
  module: ModuleCategory;
  params: Record<string, any> | undefined;
  onUpdate: (updater: ParamsUpdater) => void;
}

const style: React.CSSProperties = {
  padding: '8px',
  fontFamily: 'sans-serif',
  fontSize: '14px',
  color: '#333'
};

// This is a placeholder component
export default function ModuleOptionsContent({
  module,
  params,
  onUpdate
}: ModuleOptionsContentProps) {
  return (
    <div style={style}>
      <h4 style={{ marginTop: 0 }}>Module Type: {module}</h4>
      <p>Parameters:</p>
      <pre style={{ background: '#f0f0f0', padding: '10px', borderRadius: '4px' }}>
        {JSON.stringify(params, null, 2) || "No parameters."}
      </pre>
    </div>
  );
}
