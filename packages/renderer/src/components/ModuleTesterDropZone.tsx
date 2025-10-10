import React, { useEffect, useRef } from "react";
import { useModuleTesterStore } from "../state/moduleTesterStore";

const BASE_WIDTH = 168;
const BASE_HEIGHT = 104;

const containerStyle: React.CSSProperties = {
  paddingTop: 12,
  paddingBottom: 8,
  display: "flex",
  justifyContent: "center",
  alignItems: "flex-start",
};

const labelStyle: React.CSSProperties = {
  fontSize: 14,
  fontWeight: 700,
  color: "#000000",
  lineHeight: 1.25,
  textAlign: "center",
};

export default function ModuleTesterDropZone(): JSX.Element {
  const ref = useRef<HTMLDivElement | null>(null);
  const zoom = useModuleTesterStore((state) => state.canvasZoom);
  const isHovering = useModuleTesterStore((state) => state.isHovering);
  const isDragging = useModuleTesterStore((state) => state.isDragging);
  const setDropZoneRect = useModuleTesterStore((state) => state.setDropZoneRect);

  useEffect(() => {
    const element = ref.current;
    if (!element) {
      setDropZoneRect(null);
      return;
    }

    const updateRect = () => {
      setDropZoneRect(element.getBoundingClientRect());
    };

    updateRect();

    const resizeObserver = typeof ResizeObserver !== "undefined" ? new ResizeObserver(updateRect) : null;
    resizeObserver?.observe(element);

    window.addEventListener("resize", updateRect);
    window.addEventListener("scroll", updateRect, true);

    return () => {
      resizeObserver?.disconnect();
      window.removeEventListener("resize", updateRect);
      window.removeEventListener("scroll", updateRect, true);
      setDropZoneRect(null);
    };
  }, [setDropZoneRect, zoom]);

  const scale = Math.min(Math.max(zoom, 0.7), 1.4);

  const zoneStyle: React.CSSProperties = {
    width: BASE_WIDTH,
    height: BASE_HEIGHT,
    borderRadius: 16,
    border: `${isHovering ? 2 : 2}px ${isHovering ? "solid" : "dashed"} ${
      isHovering ? "#2563eb" : "#94a3b8"
    }`,
    background: isHovering ? "#dbeafe" : "#e2e8f0",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    transform: `scale(${scale})`,
    transformOrigin: "top center",
    transition: "border-color 0.2s ease, background-color 0.2s ease, box-shadow 0.2s ease, transform 0.2s ease",
    boxShadow: isHovering
      ? "0 0 0 4px rgba(37, 99, 235, 0.2)"
      : isDragging
      ? "0 0 0 2px rgba(15, 23, 42, 0.08)"
      : "none",
  };

  return (
    <div style={containerStyle}>
      <div ref={ref} style={zoneStyle} data-testid="module-tester-dropzone">
        <div style={labelStyle}>Module Tester</div>
        <div style={{ ...labelStyle, fontSize: 13 }}>Place Here</div>
      </div>
    </div>
  );
}
