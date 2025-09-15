import React, { useState } from "react";
import {
  DebateConfig as DebateCfg,
  DebateFormat,
  debateConfigFromBytes,
  debateConfigToBytes,
} from "./debateConfig";
import { ModulePayload, executeDebate } from "./runtime";

export interface DebateModuleNodeProps {
  id: string;
  config?: Uint8Array;
  onConnect?: (from: string, to: string) => void;
  onConfigure?: (cfg: Uint8Array) => void;
}

const defaultCfg: DebateCfg = {
  debateFormat: DebateFormat.SINGLE_PASS_VALIDATE,
  customPrompt: "",
  roundNumber: 1,
  iterativeLoop: false,
  loopTargetModuleId: "",
};

export function DebateModuleNode({ id, config, onConfigure }: DebateModuleNodeProps) {
  const [cfg, setCfg] = useState<DebateCfg>(() =>
    config ? debateConfigFromBytes(config) : { ...defaultCfg }
  );
  const [showMenu, setShowMenu] = useState(false);

  function save() {
    onConfigure?.(debateConfigToBytes(cfg));
    setShowMenu(false);
  }

  return (
    <div
      style={{ border: "1px solid #4b5563", width: 120, padding: 8, position: "relative" }}
      onContextMenu={(e) => {
        e.preventDefault();
        setShowMenu(true);
      }}
    >
      <div style={{ textAlign: "center", fontWeight: "bold" }}>Debate</div>
      {/* Ports */}
      <div
        style={{ position: "absolute", left: -5, top: "50%", width: 10, height: 10, background: "#0ea5e9" }}
      />
      <div
        style={{ position: "absolute", right: -5, top: "50%", width: 10, height: 10, background: "#f97316" }}
      />
      {showMenu && (
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 130,
            background: "white",
            border: "1px solid #e5e7eb",
            padding: 8,
            zIndex: 10,
            width: 200,
          }}
        >
          <div>
            <label>Format </label>
            <select
              value={cfg.debateFormat}
              onChange={(e) =>
                setCfg({ ...cfg, debateFormat: Number(e.target.value) })
              }
            >
              <option value={DebateFormat.SINGLE_PASS_VALIDATE}>SINGLE_PASS_VALIDATE</option>
              <option value={DebateFormat.CONCISENESS_MULTI_PASS}>CONCISENESS_MULTI_PASS</option>
              <option value={DebateFormat.DEBATE_ADD_ON}>DEBATE_ADD_ON</option>
              <option value={DebateFormat.CUSTOM}>CUSTOM</option>
            </select>
          </div>
          <div>
            <label>Prompt </label>
            <textarea
              value={cfg.customPrompt}
              onChange={(e) => setCfg({ ...cfg, customPrompt: e.target.value })}
              rows={3}
            />
          </div>
          <div>
            <label>Round </label>
            <input
              type="number"
              value={cfg.roundNumber}
              onChange={(e) =>
                setCfg({ ...cfg, roundNumber: Number(e.target.value) })
              }
            />
          </div>
          <div>
            <label>
              <input
                type="checkbox"
                checked={cfg.iterativeLoop}
                onChange={(e) =>
                  setCfg({ ...cfg, iterativeLoop: e.target.checked })
                }
              />
              Iterative
            </label>
          </div>
          {cfg.iterativeLoop && (
            <div>
              <label>Next Module </label>
              <input
                value={cfg.loopTargetModuleId}
                onChange={(e) =>
                  setCfg({ ...cfg, loopTargetModuleId: e.target.value })
                }
              />
            </div>
          )}
          <button onClick={save}>Save</button>
        </div>
      )}
    </div>
  );
}

export async function runDebateNode(
  input: ModulePayload,
  cfgBytes: Uint8Array
): Promise<ModulePayload> {
  const cfg = debateConfigFromBytes(cfgBytes);
  return executeDebate(input, cfg);
}

