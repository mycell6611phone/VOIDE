import React, { useEffect, useState } from "react";

// Types describing model registry entries
export type ModelStatus =
  | "installed"
  | "available-local"
  | "unavailable-offline"
  | "blocked-license";

export interface RegistryModel {
  id: string;
  name: string;
  backend: string;
  filename: string;
  sha256: string;
  sizeBytes: number;
  status: ModelStatus;
}

interface Progress {
  loaded: number;
  total: number;
  status: "idle" | "installing" | "error";
}

// Helper to format bytes for display
function formatBytes(n: number) {
  const mb = n / (1024 * 1024);
  if (mb < 1024) return `${mb.toFixed(1)} MB`;
  return `${(mb / 1024).toFixed(1)} GB`;
}

export default function ModelPicker() {
  const [models, setModels] = useState<RegistryModel[]>([]);
  const [progress, setProgress] = useState<Record<string, Progress>>({});

  // Fetch registry on mount
  useEffect(() => {
    (async () => {
      try {
        const api = (window as any).voide;
        const res = await api?.getModelRegistry?.();
        if (res && Array.isArray(res.models)) setModels(res.models);
      } catch {
        setModels([]);
      }
    })();
  }, []);

  // Trigger a local install
  async function install(m: RegistryModel) {
    if (m.status === "unavailable-offline" || m.status === "blocked-license") return;
    const api = (window as any).voide;
    setProgress(p => ({ ...p, [m.id]: { loaded: 0, total: m.sizeBytes, status: "installing" } }));
    try {
      await api?.installModel?.(m.id, (p: { loaded: number; total: number }) => {
        setProgress(prev => ({ ...prev, [m.id]: { ...p, status: "installing" } }));
      });
      // refresh registry
      const reg = await api?.getModelRegistry?.();
      if (reg && Array.isArray(reg.models)) setModels(reg.models);
      setProgress(prev => ({ ...prev, [m.id]: { loaded: m.sizeBytes, total: m.sizeBytes, status: "idle" } }));
    } catch {
      setProgress(prev => ({ ...prev, [m.id]: { ...(prev[m.id] || { loaded: 0, total: m.sizeBytes }), status: "error" } }));
    }
  }

  return (
    <div className="model-picker">
      {models.map(m => {
        const prog = progress[m.id];
        const disabled = m.status === "unavailable-offline" || m.status === "blocked-license";
        const pct = prog ? Math.floor((prog.loaded / prog.total) * 100) : 0;
        const error = prog?.status === "error";
        const checksum = m.status === "installed" ? "checksum ok" : m.status === "available-local" ? "checksum mismatch" : "";
        return (
          <div
            key={m.id}
            onClick={() => install(m)}
            style={{
              opacity: disabled ? 0.5 : 1,
              pointerEvents: disabled ? "none" : "auto",
              border: error ? "1px solid red" : "1px solid #ccc",
              margin: 4,
              padding: 8,
              width: 240,
            }}
          >
            <div style={{ fontWeight: "bold" }}>{m.name}</div>
            <div style={{ fontSize: 12 }}>{formatBytes(m.sizeBytes)}</div>
            <div style={{ fontSize: 12 }}>{checksum}</div>
            <div style={{ fontSize: 12 }}>{m.status}</div>
            {prog && prog.status === "installing" && (
              <div style={{ fontSize: 12 }}>{pct}%</div>
            )}
          </div>
        );
      })}
    </div>
  );
}

