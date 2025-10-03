import React, { useEffect, useState } from "react";
import { voide } from "../voide";

export default function Inspector({ runId }: { runId: string | null }) {
  const [rows, setRows] = useState<any[]>([]);
  useEffect(() => {
    if (!runId) {
      setRows([]);
      return;
    }
    const t = setInterval(async () => {
      try {
        const payloads = await voide.getLastRunPayloads(runId);
        setRows(payloads);
      } catch (err) {
        console.error("Failed to fetch run payloads", err);
      }
    }, 700);
    return () => clearInterval(t);
  }, [runId]);
  return (
    <div style={{ overflow: "auto", borderTop: "1px solid #eee" }}>
      <table style={{ width: "100%", fontSize: 12 }}>
        <thead><tr><th>Node</th><th>Port</th><th>Payload</th></tr></thead>
        <tbody>
          {rows.map((r, i) => (<tr key={i}><td>{r.nodeId}</td><td>{r.port}</td><td><pre style={{ whiteSpace: "pre-wrap" }}>{JSON.stringify(r.payload, null, 2)}</pre></td></tr>))}
        </tbody>
      </table>
    </div>
  );
}
