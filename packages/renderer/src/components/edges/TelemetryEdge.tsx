import React, { useMemo } from "react";
import {
  BaseEdge,
  EdgeLabelRenderer,
  getBezierPath,
  type EdgeProps,
  type BezierEdgeProps,
} from "reactflow";

import {
  getEdgeTelemetryStatus,
  useEdgeTelemetryStore,
  type EdgeTelemetryStatus,
} from "../../state/edgeActivityStore";

const indicatorSize = 18;

let telemetryEdgeStylesInjected = false;

const ensureStyles = () => {
  if (telemetryEdgeStylesInjected) {
    return;
  }
  telemetryEdgeStylesInjected = true;

  if (typeof document === "undefined") {
    return;
  }

  const style = document.createElement("style");
  style.setAttribute("data-voide", "edge-telemetry");
  style.textContent = `
    @keyframes voide-edge-flight {
      0% { transform: scale(0.75); opacity: 0.45; }
      50% { transform: scale(1.05); opacity: 1; }
      100% { transform: scale(0.75); opacity: 0.45; }
    }

    @keyframes voide-edge-success {
      0% { transform: scale(0.8); box-shadow: 0 0 0 0 rgba(34,197,94,0.4); }
      60% { transform: scale(1.1); box-shadow: 0 0 12px 6px rgba(34,197,94,0.45); }
      100% { transform: scale(0.92); box-shadow: 0 0 4px 2px rgba(34,197,94,0.35); }
    }

    @keyframes voide-edge-error {
      0%, 100% { transform: scale(0.85) translateX(0); box-shadow: 0 0 0 0 rgba(239,68,68,0.5); }
      30% { transform: scale(1.05) translateX(-2px); box-shadow: 0 0 10px 3px rgba(239,68,68,0.55); }
      60% { transform: scale(1.05) translateX(2px); box-shadow: 0 0 10px 3px rgba(239,68,68,0.55); }
    }
  `;
  document.head.appendChild(style);
};

const baseIndicatorStyle: React.CSSProperties = {
  width: indicatorSize,
  height: indicatorSize,
  borderRadius: "999px",
  border: "2px solid rgba(15,23,42,0.65)",
  background: "#94a3b8",
  boxShadow: "0 0 0 0 rgba(148,163,184,0.25)",
  transition: "background 0.2s ease, box-shadow 0.3s ease, transform 0.3s ease",
  display: "grid",
  placeItems: "center",
  color: "#0f172a",
  fontSize: 10,
  fontWeight: 700,
  pointerEvents: "none",
};

const statusStyles: Record<EdgeTelemetryStatus, React.CSSProperties> = {
  idle: {
    background: "#cbd5f5",
    opacity: 0.85,
  },
  "in-flight": {
    background: "#38bdf8",
    boxShadow: "0 0 10px 2px rgba(56,189,248,0.45)",
    animation: "voide-edge-flight 1.1s ease-in-out infinite",
    opacity: 1,
  },
  success: {
    background: "#22c55e",
    color: "#052e16",
    boxShadow: "0 0 8px 2px rgba(34,197,94,0.45)",
    animation: "voide-edge-success 1.4s ease-out 1",
    opacity: 1,
  },
  error: {
    background: "#ef4444",
    color: "#fff",
    boxShadow: "0 0 10px 4px rgba(239,68,68,0.5)",
    animation: "voide-edge-error 0.9s ease-in-out 1",
    opacity: 1,
  },
};

type TelemetryEdgeProps = EdgeProps<BezierEdgeProps>;

export default function TelemetryEdge(props: TelemetryEdgeProps) {
  ensureStyles();

  const status = useEdgeTelemetryStore(
    (state) => getEdgeTelemetryStatus(state, props.id),
  );

  const [edgePath, labelX, labelY] = useMemo(
    () =>
      getBezierPath({
        sourceX: props.sourceX,
        sourceY: props.sourceY,
        targetX: props.targetX,
        targetY: props.targetY,
        sourcePosition: props.sourcePosition,
        targetPosition: props.targetPosition,
        curvature: 0.32,
      }),
    [
      props.sourceX,
      props.sourceY,
      props.targetX,
      props.targetY,
      props.sourcePosition,
      props.targetPosition,
    ],
  );

  return (
    <>
      <BaseEdge
        id={props.id}
        path={edgePath}
        markerEnd={props.markerEnd}
        style={{ stroke: "#334155", strokeWidth: 2.2 }}
      />
      <EdgeLabelRenderer>
        <div
          data-voide-edge-telemetry
          data-status={status}
          style={{
            position: "absolute",
            transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)` as const,
            pointerEvents: "none",
          }}
        >
          <div style={{ ...baseIndicatorStyle, ...statusStyles[status] }} aria-hidden>
            ●
          </div>
        </div>
      </EdgeLabelRenderer>
    </>
  );
}
