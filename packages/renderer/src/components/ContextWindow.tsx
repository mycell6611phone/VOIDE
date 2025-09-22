import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { useCanvasBoundary } from "./CanvasBoundaryContext";
import {
  moveGeometry,
  resizeGeometry,
  type Bounds,
  type ResizeDirection,
  type WindowGeometry,
  type WindowPosition,
  type WindowSize,
} from "./contextWindowUtils";

const HEADER_HEIGHT = 40;
const TRANSITION_MS = 180;

const handleBaseStyle: React.CSSProperties = {
  position: "absolute",
  background: "transparent",
  zIndex: 2,
};

function getBoundsFromRef(ref: React.RefObject<HTMLDivElement> | null): Bounds {
  const rect = ref?.current?.getBoundingClientRect();
  if (!rect) {
    return { width: Number.MAX_SAFE_INTEGER, height: Number.MAX_SAFE_INTEGER };
  }
  return { width: rect.width, height: rect.height };
}

interface ContextWindowProps {
  title: string;
  open: boolean;
  position: WindowPosition;
  size: WindowSize;
  minimized: boolean;
  minSize?: WindowSize;
  onUpdate: (geometry: WindowGeometry) => void;
  onRequestClose: () => void;
  onToggleMinimize: () => void;
  children: React.ReactNode;
}

export default function ContextWindow({
  title,
  open,
  position,
  size,
  minimized,
  minSize,
  onUpdate,
  onRequestClose,
  onToggleMinimize,
  children,
}: ContextWindowProps) {
  const canvasRef = useCanvasBoundary();
  const [visible, setVisible] = useState(open);
  const closeTimerRef = useRef<number>();

  useEffect(() => {
    if (open) {
      setVisible(true);
      if (closeTimerRef.current) {
        window.clearTimeout(closeTimerRef.current);
        closeTimerRef.current = undefined;
      }
      return;
    }

    closeTimerRef.current = window.setTimeout(() => {
      setVisible(false);
      closeTimerRef.current = undefined;
    }, TRANSITION_MS);

    return () => {
      if (closeTimerRef.current) {
        window.clearTimeout(closeTimerRef.current);
        closeTimerRef.current = undefined;
      }
    };
  }, [open]);

  useEffect(
    () => () => {
      if (closeTimerRef.current) {
        window.clearTimeout(closeTimerRef.current);
      }
    },
    [],
  );

  const resolvedMinSize = useMemo<WindowSize>(
    () => ({
      width: Math.max(minSize?.width ?? 280, 240),
      height: Math.max(minSize?.height ?? 220, HEADER_HEIGHT + 40),
    }),
    [minSize],
  );

  const geometry = useMemo<WindowGeometry>(
    () => ({ position, size }),
    [position, size],
  );

  const beginDrag = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      event.preventDefault();
      event.stopPropagation();

      const startX = event.clientX;
      const startY = event.clientY;
      const startGeometry = geometry;
      const bounds = getBoundsFromRef(canvasRef);

      const handleMove = (moveEvent: MouseEvent) => {
        const delta = {
          dx: moveEvent.clientX - startX,
          dy: moveEvent.clientY - startY,
        };
        const next = moveGeometry(startGeometry, delta, bounds);
        onUpdate(next);
      };

      const handleUp = () => {
        window.removeEventListener("mousemove", handleMove);
        window.removeEventListener("mouseup", handleUp);
      };

      window.addEventListener("mousemove", handleMove);
      window.addEventListener("mouseup", handleUp, { once: true });
    },
    [canvasRef, geometry, onUpdate],
  );

  const beginResize = useCallback(
    (direction: ResizeDirection) =>
      (event: React.MouseEvent<HTMLDivElement>) => {
        if (minimized) {
          return;
        }

        event.preventDefault();
        event.stopPropagation();

        const startX = event.clientX;
        const startY = event.clientY;
        const startGeometry = geometry;
        const bounds = getBoundsFromRef(canvasRef);

        const handleMove = (moveEvent: MouseEvent) => {
          const delta = {
            dx: moveEvent.clientX - startX,
            dy: moveEvent.clientY - startY,
          };
          const next = resizeGeometry(
            direction,
            startGeometry,
            delta,
            bounds,
            resolvedMinSize,
          );
          onUpdate(next);
        };

        const handleUp = () => {
          window.removeEventListener("mousemove", handleMove);
          window.removeEventListener("mouseup", handleUp);
        };

        window.addEventListener("mousemove", handleMove);
        window.addEventListener("mouseup", handleUp, { once: true });
      },
    [canvasRef, geometry, minimized, onUpdate, resolvedMinSize],
  );

  const handles = useMemo(
    () => [
      {
        direction: "n" as ResizeDirection,
        style: {
          ...handleBaseStyle,
          top: -2,
          left: "50%",
          transform: "translateX(-50%)",
          width: "40%",
          height: 6,
          cursor: "ns-resize",
        },
      },
      {
        direction: "s" as ResizeDirection,
        style: {
          ...handleBaseStyle,
          bottom: -2,
          left: "50%",
          transform: "translateX(-50%)",
          width: "40%",
          height: 6,
          cursor: "ns-resize",
        },
      },
      {
        direction: "e" as ResizeDirection,
        style: {
          ...handleBaseStyle,
          right: -2,
          top: "50%",
          transform: "translateY(-50%)",
          width: 6,
          height: "40%",
          cursor: "ew-resize",
        },
      },
      {
        direction: "w" as ResizeDirection,
        style: {
          ...handleBaseStyle,
          left: -2,
          top: "50%",
          transform: "translateY(-50%)",
          width: 6,
          height: "40%",
          cursor: "ew-resize",
        },
      },
      {
        direction: "ne" as ResizeDirection,
        style: {
          ...handleBaseStyle,
          top: -4,
          right: -4,
          width: 12,
          height: 12,
          cursor: "nesw-resize",
        },
      },
      {
        direction: "nw" as ResizeDirection,
        style: {
          ...handleBaseStyle,
          top: -4,
          left: -4,
          width: 12,
          height: 12,
          cursor: "nwse-resize",
        },
      },
      {
        direction: "se" as ResizeDirection,
        style: {
          ...handleBaseStyle,
          bottom: -4,
          right: -4,
          width: 12,
          height: 12,
          cursor: "nwse-resize",
        },
      },
      {
        direction: "sw" as ResizeDirection,
        style: {
          ...handleBaseStyle,
          bottom: -4,
          left: -4,
          width: 12,
          height: 12,
          cursor: "nesw-resize",
        },
      },
    ],
    [],
  );

  const wrapperStyle: React.CSSProperties = {
    position: "absolute",
    top: geometry.position.y,
    left: geometry.position.x,
    width: geometry.size.width,
    height: minimized ? HEADER_HEIGHT : geometry.size.height,
    minWidth: resolvedMinSize.width,
    minHeight: minimized ? HEADER_HEIGHT : resolvedMinSize.height,
    background: "#f8fafc",
    border: "1px solid #cbd5f5",
    borderRadius: 12,
    boxShadow: "0 18px 32px rgba(15, 23, 42, 0.18)",
    overflow: "hidden",
    display: visible ? "flex" : "none",
    flexDirection: "column",
    transition: `opacity ${TRANSITION_MS}ms ease, transform ${TRANSITION_MS}ms ease, width 140ms ease, height 140ms ease`,
    opacity: open ? 1 : 0,
    transform: open ? "scale(1)" : "scale(0.98)",
    pointerEvents: "auto",
    zIndex: 30,
  };

  const headerStyle: React.CSSProperties = {
    height: HEADER_HEIGHT,
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "0 12px",
    background: "linear-gradient(180deg, #1f2937 0%, #0f172a 100%)",
    color: "#f8fafc",
    fontWeight: 600,
    letterSpacing: 0.2,
    cursor: "grab",
    userSelect: "none",
  };

  const buttonStyle: React.CSSProperties = {
    border: "none",
    background: "transparent",
    color: "inherit",
    cursor: "pointer",
    padding: "4px 6px",
    borderRadius: 6,
    transition: "background 0.2s ease",
  };

  const buttonContainerStyle: React.CSSProperties = {
    display: "flex",
    gap: 4,
  };

  const contentStyle: React.CSSProperties = {
    flex: 1,
    padding: "14px 16px",
    overflowY: "auto",
    background: "rgba(248, 250, 252, 0.92)",
    color: "#0f172a",
    fontSize: 13,
    display: minimized ? "none" : "block",
  };

  if (!visible) {
    return null;
  }

  return (
    <div style={wrapperStyle} onContextMenu={(e) => e.preventDefault()}>
      <div
        style={headerStyle}
        onMouseDown={beginDrag}
        role="toolbar"
        aria-label={`${title} controls`}
      >
        <span>{title}</span>
        <div style={buttonContainerStyle}>
          <button
            type="button"
            aria-label={minimized ? "Restore" : "Minimize"}
            style={buttonStyle}
            onMouseDown={(event) => event.stopPropagation()}
            onClick={(event) => {
              event.stopPropagation();
              onToggleMinimize();
            }}
          >
            {minimized ? "▢" : "_"}
          </button>
          <button
            type="button"
            aria-label="Close"
            style={buttonStyle}
            onMouseDown={(event) => event.stopPropagation()}
            onClick={(event) => {
              event.stopPropagation();
              onRequestClose();
            }}
          >
            ×
          </button>
        </div>
      </div>
      <div style={contentStyle}>{children}</div>
      {!minimized
        ? handles.map((handle) => (
            <div
              key={handle.direction}
              style={handle.style as CSSProperties}
              onMouseDown={beginResize(handle.direction)}
            />
          ))
        : null}
    </div>
  );
}
