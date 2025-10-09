import React, { useMemo } from "react";
import { Position, type EdgeProps } from "react-flow-renderer";

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

const EDGE_CURVATURE = 0.32;

interface BezierParams {
  sourceX: number;
  sourceY: number;
  targetX: number;
  targetY: number;
  sourcePosition: Position;
  targetPosition: Position;
  curvature: number;
}

const calculateControlOffset = (distance: number, curvature: number) =>
  distance >= 0 ? 0.5 * distance : curvature * 25 * Math.sqrt(-distance);

const getControlPoint = (
  pos: Position,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  curvature: number,
) => {
  switch (pos) {
    case Position.Left:
      return { x: x1 - calculateControlOffset(x1 - x2, curvature), y: y1 };
    case Position.Right:
      return { x: x1 + calculateControlOffset(x2 - x1, curvature), y: y1 };
    case Position.Top:
      return { x: x1, y: y1 - calculateControlOffset(y1 - y2, curvature) };
    case Position.Bottom:
    default:
      return { x: x1, y: y1 + calculateControlOffset(y2 - y1, curvature) };
  }
};

const computeBezierGeometry = ({
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  curvature,
}: BezierParams) => {
  const sourceControl = getControlPoint(
    sourcePosition,
    sourceX,
    sourceY,
    targetX,
    targetY,
    curvature,
  );
  const targetControl = getControlPoint(
    targetPosition,
    targetX,
    targetY,
    sourceX,
    sourceY,
    curvature,
  );

  const path = `M${sourceX},${sourceY} C${sourceControl.x},${sourceControl.y} ${targetControl.x},${targetControl.y} ${targetX},${targetY}`;
  const centerX =
    sourceX * 0.125 +
    sourceControl.x * 0.375 +
    targetControl.x * 0.375 +
    targetX * 0.125;
  const centerY =
    sourceY * 0.125 +
    sourceControl.y * 0.375 +
    targetControl.y * 0.375 +
    targetY * 0.125;

  return { path, center: { x: centerX, y: centerY } };
};

type TelemetryEdgeProps = EdgeProps;

export default function TelemetryEdge(props: TelemetryEdgeProps) {
  ensureStyles();

  const status = useEdgeTelemetryStore(
    (state) => getEdgeTelemetryStatus(state, props.id),
  );

  const geometry = useMemo(() =>
    computeBezierGeometry({
      sourceX: props.sourceX,
      sourceY: props.sourceY,
      targetX: props.targetX,
      targetY: props.targetY,
      sourcePosition: props.sourcePosition,
      targetPosition: props.targetPosition,
      curvature: EDGE_CURVATURE,
    }),
  [
    props.sourceX,
    props.sourceY,
    props.targetX,
    props.targetY,
    props.sourcePosition,
    props.targetPosition,
  ]);

  return (
    <>
      <path
        className="react-flow__edge-path"
        d={geometry.path}
        markerStart={props.markerStart}
        markerEnd={props.markerEnd}
        style={{
          stroke: "#334155",
          strokeWidth: 2.2,
          fill: "none",
          ...(props.style ?? {}),
        }}
      />
      <foreignObject
        pointerEvents="none"
        x={geometry.center.x - indicatorSize / 2}
        y={geometry.center.y - indicatorSize / 2}
        width={indicatorSize}
        height={indicatorSize}
        data-voide-edge-telemetry
        data-status={status}
      >
        <div style={{ ...baseIndicatorStyle, ...statusStyles[status] }} aria-hidden>
          ●
        </div>
      </foreignObject>
    </>
  );
}
