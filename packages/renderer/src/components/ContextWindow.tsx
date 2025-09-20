<<<<<<< ours
<<<<<<< ours
import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties
} from "react";

export type ContextWindowRect = {
  left: number;
  top: number;
  width: number;
  height: number;
};

export type CanvasViewport = {
  top: number;
  left: number;
  width: number;
  height: number;
};

type ResizeDirection =
  | "top"
  | "bottom"
  | "left"
  | "right"
  | "top-left"
  | "top-right"
  | "bottom-left"
  | "bottom-right";

export const CONTEXT_WINDOW_MIN_WIDTH = 240;
export const CONTEXT_WINDOW_MIN_HEIGHT = 180;
export const CONTEXT_WINDOW_PADDING = 12;

export function constrainRectToBounds(
  rect: ContextWindowRect,
  canvasRect: CanvasViewport
): ContextWindowRect {
  const padding = CONTEXT_WINDOW_PADDING;
  const availableWidth = Math.max(canvasRect.width - padding * 2, 0);
  const availableHeight = Math.max(canvasRect.height - padding * 2, 0);

  const minWidth = Math.min(
    CONTEXT_WINDOW_MIN_WIDTH,
    Math.max(availableWidth, 1)
  );
  const minHeight = Math.min(
    CONTEXT_WINDOW_MIN_HEIGHT,
    Math.max(availableHeight, 1)
  );

  const maxWidth = Math.max(minWidth, availableWidth);
  const maxHeight = Math.max(minHeight, availableHeight);

  const width = Math.min(Math.max(rect.width, minWidth), maxWidth);
  const height = Math.min(Math.max(rect.height, minHeight), maxHeight);

  const maxLeft = Math.max(padding, canvasRect.width - padding - width);
  const maxTop = Math.max(padding, canvasRect.height - padding - height);

  const left = Math.min(Math.max(rect.left, padding), maxLeft);
  const top = Math.min(Math.max(rect.top, padding), maxTop);

  return { left, top, width, height };
}

interface ContextWindowProps {
  rect: ContextWindowRect;
  canvasRect: CanvasViewport;
  isVisible: boolean;
  title: string;
  onRequestClose: () => void;
  onRequestMinimize: () => void;
  onRectChange: (rect: ContextWindowRect) => void;
=======
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useCanvasBoundary } from "./CanvasBoundaryContext";
import {
  moveGeometry,
  resizeGeometry,
  type Bounds,
  type ResizeDirection,
  type WindowGeometry,
  type WindowPosition,
  type WindowSize
} from "./contextWindowUtils";

const HEADER_HEIGHT = 40;
const TRANSITION_MS = 180;

const handleBaseStyle: React.CSSProperties = {
  position: "absolute",
  background: "transparent",
  zIndex: 2
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
>>>>>>> theirs
  children: React.ReactNode;
}

export default function ContextWindow({
<<<<<<< ours
  rect,
  canvasRect,
  isVisible,
  title,
  onRequestClose,
  onRequestMinimize,
  onRectChange,
  children
}: ContextWindowProps) {
  const [isInteracting, setIsInteracting] = useState(false);
  const [shouldRender, setShouldRender] = useState(isVisible);
  const hideTimerRef = useRef<number | null>(null);
  const rectRef = useRef(rect);

  useEffect(() => {
    rectRef.current = rect;
  }, [rect]);

  useEffect(() => {
    if (isVisible) {
      setShouldRender(true);
      if (hideTimerRef.current) {
        window.clearTimeout(hideTimerRef.current);
        hideTimerRef.current = null;
=======
  title,
  open,
  position,
  size,
  minimized,
  minSize,
  onUpdate,
  onRequestClose,
  onToggleMinimize,
  children
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
>>>>>>> theirs
      }
      return;
    }

<<<<<<< ours
    hideTimerRef.current = window.setTimeout(() => {
      setShouldRender(false);
      hideTimerRef.current = null;
    }, 220);

    return () => {
      if (hideTimerRef.current) {
        window.clearTimeout(hideTimerRef.current);
        hideTimerRef.current = null;
      }
    };
  }, [isVisible]);

  useEffect(() => {
    if (!isVisible) {
      return;
    }

    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onRequestMinimize();
      }
    };

    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [isVisible, onRequestMinimize]);

  useEffect(() => () => {
    if (hideTimerRef.current) {
      window.clearTimeout(hideTimerRef.current);
    }
  }, []);

  const frameStyle: CSSProperties = useMemo(
    () => ({
      position: "fixed",
      top: canvasRect.top + rect.top,
      left: canvasRect.left + rect.left,
      width: rect.width,
      height: rect.height,
      background: "#ffffff",
      borderRadius: 16,
      border: "1px solid rgba(15, 23, 42, 0.12)",
      boxShadow: "0 16px 40px rgba(15, 23, 42, 0.18)",
      overflow: "hidden",
      display: "flex",
      flexDirection: "column",
      opacity: isVisible ? 1 : 0,
      transform: isVisible ? "scale(1)" : "scale(0.94)",
      transformOrigin: "top left",
      transition: isInteracting
        ? "none"
        : "opacity 160ms ease, transform 180ms ease, width 180ms ease, height 180ms ease",
      zIndex: 1000,
      pointerEvents: isVisible ? "auto" : "none"
    }),
    [canvasRect.left, canvasRect.top, rect.height, rect.left, rect.top, rect.width, isVisible, isInteracting]
  );

  const beginInteraction = () => {
    setIsInteracting(true);
  };

  const finishInteraction = () => {
    setIsInteracting(false);
  };

  const handlePointerSequence = (
    event: React.PointerEvent,
    computeNext: (dx: number, dy: number, startRect: ContextWindowRect) => ContextWindowRect
  ) => {
    event.preventDefault();
    event.stopPropagation();

    const startX = event.clientX;
    const startY = event.clientY;
    const startRect = rectRef.current;

    beginInteraction();

    const handleMove = (moveEvent: PointerEvent) => {
      moveEvent.preventDefault();
      const dx = moveEvent.clientX - startX;
      const dy = moveEvent.clientY - startY;

      const next = constrainRectToBounds(
        computeNext(dx, dy, startRect),
        canvasRect
      );
      onRectChange(next);
    };

    const handleUp = () => {
      finishInteraction();
      document.removeEventListener("pointermove", handleMove);
      document.removeEventListener("pointerup", handleUp);
    };

    document.addEventListener("pointermove", handleMove);
    document.addEventListener("pointerup", handleUp);
  };

  const handleResizePointerDown = (
    direction: ResizeDirection
  ) => (event: React.PointerEvent) => {
    handlePointerSequence(event, (dx, dy, startRect) => {
      let nextRect = { ...startRect };

      switch (direction) {
        case "top":
          nextRect.top = startRect.top + dy;
          nextRect.height = startRect.height - dy;
          break;
        case "bottom":
          nextRect.height = startRect.height + dy;
          break;
        case "left":
          nextRect.left = startRect.left + dx;
          nextRect.width = startRect.width - dx;
          break;
        case "right":
          nextRect.width = startRect.width + dx;
          break;
        case "top-left":
          nextRect.top = startRect.top + dy;
          nextRect.height = startRect.height - dy;
          nextRect.left = startRect.left + dx;
          nextRect.width = startRect.width - dx;
          break;
        case "top-right":
          nextRect.top = startRect.top + dy;
          nextRect.height = startRect.height - dy;
          nextRect.width = startRect.width + dx;
          break;
        case "bottom-left":
          nextRect.height = startRect.height + dy;
          nextRect.left = startRect.left + dx;
          nextRect.width = startRect.width - dx;
          break;
        case "bottom-right":
          nextRect.height = startRect.height + dy;
          nextRect.width = startRect.width + dx;
          break;
        default:
          break;
      }

      return nextRect;
    });
  };

  const handleHeaderPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement;
    if (target.dataset?.action) {
      return;
    }
    handlePointerSequence(event, (dx, dy, startRect) => ({
      ...startRect,
      left: startRect.left + dx,
      top: startRect.top + dy
    }));
  };

  if (!shouldRender) {
=======
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

  useEffect(() => () => {
    if (closeTimerRef.current) {
      window.clearTimeout(closeTimerRef.current);
    }
  }, []);

  const resolvedMinSize = useMemo<WindowSize>(() => ({
    width: Math.max(minSize?.width ?? 280, 240),
    height: Math.max(minSize?.height ?? 220, HEADER_HEIGHT + 40)
  }), [minSize]);

  const geometry = useMemo<WindowGeometry>(
    () => ({ position, size }),
    [position, size]
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
          dy: moveEvent.clientY - startY
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
    [canvasRef, geometry, onUpdate]
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
            dy: moveEvent.clientY - startY
          };
          const next = resizeGeometry(direction, startGeometry, delta, bounds, resolvedMinSize);
          onUpdate(next);
        };

        const handleUp = () => {
          window.removeEventListener("mousemove", handleMove);
          window.removeEventListener("mouseup", handleUp);
        };

        window.addEventListener("mousemove", handleMove);
        window.addEventListener("mouseup", handleUp, { once: true });
      },
    [canvasRef, geometry, minimized, onUpdate, resolvedMinSize]
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
          cursor: "ns-resize"
        }
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
          cursor: "ns-resize"
        }
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
          cursor: "ew-resize"
        }
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
          cursor: "ew-resize"
        }
      },
      {
        direction: "ne" as ResizeDirection,
        style: {
          ...handleBaseStyle,
          top: -4,
          right: -4,
          width: 12,
          height: 12,
          cursor: "nesw-resize"
        }
      },
      {
        direction: "nw" as ResizeDirection,
        style: {
          ...handleBaseStyle,
          top: -4,
          left: -4,
          width: 12,
          height: 12,
          cursor: "nwse-resize"
        }
      },
      {
        direction: "se" as ResizeDirection,
        style: {
          ...handleBaseStyle,
          bottom: -4,
          right: -4,
          width: 12,
          height: 12,
          cursor: "nwse-resize"
        }
      },
      {
        direction: "sw" as ResizeDirection,
        style: {
          ...handleBaseStyle,
          bottom: -4,
          left: -4,
          width: 12,
          height: 12,
          cursor: "nesw-resize"
        }
      }
    ],
    []
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
    zIndex: 30
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
    userSelect: "none"
  };

  const buttonStyle: React.CSSProperties = {
    border: "none",
    background: "transparent",
    color: "inherit",
    cursor: "pointer",
    padding: "4px 6px",
    borderRadius: 6,
    transition: "background 0.2s ease"
  };

  const buttonContainerStyle: React.CSSProperties = {
    display: "flex",
    gap: 4
  };

  const contentStyle: React.CSSProperties = {
    flex: 1,
    padding: "14px 16px",
    overflowY: "auto",
    background: "rgba(248, 250, 252, 0.92)",
    color: "#0f172a",
    fontSize: 13,
    display: minimized ? "none" : "block"
  };

  if (!visible) {
>>>>>>> theirs
    return null;
  }

  return (
<<<<<<< ours
    <div style={frameStyle} role="dialog" aria-label={title}>
      <div
        style={{
          height: 40,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 14px",
          background: "linear-gradient(135deg, #fef2f2, #fee2e2)",
          borderBottom: "1px solid rgba(252, 165, 165, 0.45)",
          color: "#881337",
          fontWeight: 600,
          cursor: "grab",
          userSelect: "none"
        }}
        onPointerDown={handleHeaderPointerDown}
      >
        <span>{title}</span>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            type="button"
            data-action="minimize"
            onClick={(event) => {
              event.stopPropagation();
              onRequestMinimize();
            }}
            style={controlButtonStyle}
            aria-label="Minimize"
          >
            _
          </button>
          <button
            type="button"
            data-action="close"
=======
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
>>>>>>> theirs
            onClick={(event) => {
              event.stopPropagation();
              onRequestClose();
            }}
<<<<<<< ours
            style={{ ...controlButtonStyle, color: "#b91c1c" }}
            aria-label="Close"
=======
>>>>>>> theirs
          >
            ×
          </button>
        </div>
      </div>
<<<<<<< ours

      <div
        style={{
          flex: 1,
          padding: 16,
          background: "#fff",
          color: "#1f2937",
          overflow: "auto"
        }}
      >
        {children}
      </div>

      {renderResizeHandle("top", "ns-resize", handleResizePointerDown("top"))}
      {renderResizeHandle("bottom", "ns-resize", handleResizePointerDown("bottom"))}
      {renderResizeHandle("left", "ew-resize", handleResizePointerDown("left"))}
      {renderResizeHandle("right", "ew-resize", handleResizePointerDown("right"))}
      {renderResizeHandle(
        "top-left",
        "nwse-resize",
        handleResizePointerDown("top-left")
      )}
      {renderResizeHandle(
        "top-right",
        "nesw-resize",
        handleResizePointerDown("top-right")
      )}
      {renderResizeHandle(
        "bottom-left",
        "nesw-resize",
        handleResizePointerDown("bottom-left")
      )}
      {renderResizeHandle(
        "bottom-right",
        "nwse-resize",
        handleResizePointerDown("bottom-right")
      )}
=======
      <div style={contentStyle}>{children}</div>
      {!minimized
        ? handles.map((handle) => (
            <div
              key={handle.direction}
              style={handle.style}
              onMouseDown={beginResize(handle.direction)}
            />
          ))
        : null}
>>>>>>> theirs
    </div>
  );
}

<<<<<<< ours
const controlButtonStyle: CSSProperties = {
  width: 22,
  height: 22,
  borderRadius: 6,
  border: "1px solid rgba(136, 19, 55, 0.3)",
  background: "rgba(254, 226, 226, 0.7)",
  color: "#881337",
  fontSize: 14,
  lineHeight: "16px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  cursor: "pointer",
  transition: "background 140ms ease"
};

function renderResizeHandle(
  position: ResizeDirection,
  cursor: CSSProperties["cursor"],
  onPointerDown: (event: React.PointerEvent<HTMLDivElement>) => void
) {
  const base: CSSProperties = {
    position: "absolute",
    zIndex: 2,
    cursor,
    background: "transparent"
  };

  let style: CSSProperties;

  if (position === "top") {
    style = { ...base, top: -4, left: 12, right: 12, height: 8 };
  } else if (position === "bottom") {
    style = { ...base, bottom: -4, left: 12, right: 12, height: 8 };
  } else if (position === "left") {
    style = { ...base, top: 12, bottom: 12, left: -4, width: 8 };
  } else if (position === "right") {
    style = { ...base, top: 12, bottom: 12, right: -4, width: 8 };
  } else {
    const size = 14;
    const offset = -7;
    const cornerStyle: Record<ResizeDirection, CSSProperties> = {
      "top-left": { top: offset, left: offset },
      "top-right": { top: offset, right: offset },
      "bottom-left": { bottom: offset, left: offset },
      "bottom-right": { bottom: offset, right: offset },
      top: {},
      bottom: {},
      left: {},
      right: {}
    };

    style = {
      ...base,
      width: size,
      height: size,
      borderRadius: 8,
      background: "transparent",
      ...cornerStyle[position]
    };
  }

  return (
    <div
      key={position}
      onPointerDown={onPointerDown}
      style={style}
      aria-hidden="true"
      data-resize-handle={position}
    />
  );
}

=======
>>>>>>> theirs
=======
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import { createPortal } from "react-dom";
import type { NodeDef } from "@voide/shared";
import { useCanvasBoundary } from "./CanvasBoundaryContext";

const DEFAULT_SIZE = { width: 280, height: 200 } as const;
const MIN_SIZE = { width: 200, height: 140 } as const;

export interface ContextWindowGeometry {
  position: { x: number; y: number };
  size: { width: number; height: number };
}

export interface ClampBounds {
  width: number;
  height: number;
}

export function clampGeometry(
  geometry: ContextWindowGeometry,
  bounds: ClampBounds,
  minSize: { width: number; height: number } = MIN_SIZE
): ContextWindowGeometry {
  const width = Math.min(Math.max(geometry.size.width, minSize.width), bounds.width);
  const height = Math.min(Math.max(geometry.size.height, minSize.height), bounds.height);

  const maxX = Math.max(bounds.width - width, 0);
  const maxY = Math.max(bounds.height - height, 0);

  const x = Math.min(Math.max(geometry.position.x, 0), maxX);
  const y = Math.min(Math.max(geometry.position.y, 0), maxY);

  return {
    position: { x, y },
    size: { width, height }
  };
}

interface ContextWindowProps {
  node: NodeDef;
  anchor: { x: number; y: number };
  onClose: () => void;
}

export default function ContextWindow({ node, anchor, onClose }: ContextWindowProps) {
  const { overlayRef, bounds, refreshBounds } = useCanvasBoundary();
  const windowRef = useRef<HTMLDivElement | null>(null);
  const geometryRef = useRef<ContextWindowGeometry | null>(null);
  const dragState = useRef<{
    startX: number;
    startY: number;
    origin: { x: number; y: number };
  } | null>(null);
  const resizeState = useRef<{
    startX: number;
    startY: number;
    origin: ContextWindowGeometry;
  } | null>(null);

  const [geometry, setGeometry] = useState<ContextWindowGeometry>(() => ({
    position: { x: anchor.x, y: anchor.y },
    size: { ...DEFAULT_SIZE }
  }));

  geometryRef.current = geometry;

  const handleDragMove = useCallback(
    (event: PointerEvent) => {
      const overlay = overlayRef.current;
      if (!dragState.current || !overlay) {
        return;
      }
      const rect = overlay.getBoundingClientRect();
      const next = clampGeometry(
        {
          position: {
            x: dragState.current.origin.x + (event.clientX - dragState.current.startX),
            y: dragState.current.origin.y + (event.clientY - dragState.current.startY)
          },
          size: geometryRef.current ? geometryRef.current.size : { ...DEFAULT_SIZE }
        },
        { width: rect.width, height: rect.height }
      );
      setGeometry(next);
    },
    [overlayRef]
  );

  const handleDragEnd = useCallback(() => {
    dragState.current = null;
    window.removeEventListener("pointermove", handleDragMove);
    window.removeEventListener("pointerup", handleDragEnd);
  }, [handleDragMove]);

  const handleDragStart = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      const overlay = overlayRef.current;
      if (!overlay) {
        return;
      }
      event.preventDefault();
      event.stopPropagation();
      dragState.current = {
        startX: event.clientX,
        startY: event.clientY,
        origin: geometryRef.current
          ? { ...geometryRef.current.position }
          : { x: anchor.x, y: anchor.y }
      };
      window.addEventListener("pointermove", handleDragMove);
      window.addEventListener("pointerup", handleDragEnd);
    },
    [anchor.x, anchor.y, handleDragEnd, handleDragMove, overlayRef]
  );

  const handleResizeMove = useCallback(
    (event: PointerEvent) => {
      const overlay = overlayRef.current;
      if (!resizeState.current || !overlay) {
        return;
      }
      const rect = overlay.getBoundingClientRect();
      const origin = resizeState.current.origin;
      const next = clampGeometry(
        {
          position: { ...origin.position },
          size: {
            width: origin.size.width + (event.clientX - resizeState.current.startX),
            height: origin.size.height + (event.clientY - resizeState.current.startY)
          }
        },
        { width: rect.width, height: rect.height }
      );
      setGeometry(next);
    },
    [overlayRef]
  );

  const handleResizeEnd = useCallback(() => {
    resizeState.current = null;
    window.removeEventListener("pointermove", handleResizeMove);
    window.removeEventListener("pointerup", handleResizeEnd);
  }, [handleResizeMove]);

  const handleResizeStart = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      const overlay = overlayRef.current;
      if (!overlay) {
        return;
      }
      event.preventDefault();
      event.stopPropagation();
      resizeState.current = {
        startX: event.clientX,
        startY: event.clientY,
        origin: geometryRef.current
          ? {
              position: { ...geometryRef.current.position },
              size: { ...geometryRef.current.size }
            }
          : {
              position: { x: anchor.x, y: anchor.y },
              size: { ...DEFAULT_SIZE }
            }
      };
      window.addEventListener("pointermove", handleResizeMove);
      window.addEventListener("pointerup", handleResizeEnd);
    },
    [anchor.x, anchor.y, handleResizeEnd, handleResizeMove, overlayRef]
  );

  const overlay = overlayRef.current;

  useEffect(() => {
    if (!overlay) {
      return;
    }
    const rect = overlay.getBoundingClientRect();
    setGeometry((previous) =>
      clampGeometry(
        {
          position: { x: anchor.x, y: anchor.y },
          size: previous ? previous.size : { ...DEFAULT_SIZE }
        },
        { width: rect.width, height: rect.height }
      )
    );
  }, [anchor.x, anchor.y, overlay]);

  useEffect(() => {
    if (!bounds) {
      return;
    }
    setGeometry((previous) =>
      clampGeometry(
        previous ?? {
          position: { x: anchor.x, y: anchor.y },
          size: { ...DEFAULT_SIZE }
        },
        { width: bounds.width, height: bounds.height }
      )
    );
  }, [anchor.x, anchor.y, bounds]);

  useEffect(() => refreshBounds(), [refreshBounds]);

  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };
    const handleMouseDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (windowRef.current && !windowRef.current.contains(target)) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKey);
    window.addEventListener("mousedown", handleMouseDown);
    return () => {
      window.removeEventListener("keydown", handleKey);
      window.removeEventListener("mousedown", handleMouseDown);
    };
  }, [onClose]);

  useEffect(() => {
    return () => {
      window.removeEventListener("pointermove", handleDragMove);
      window.removeEventListener("pointerup", handleDragEnd);
      window.removeEventListener("pointermove", handleResizeMove);
      window.removeEventListener("pointerup", handleResizeEnd);
    };
  }, [handleDragEnd, handleDragMove, handleResizeEnd, handleResizeMove]);

  const ports = useMemo(() => ({
    inputs: node.in ?? [],
    outputs: node.out ?? []
  }), [node.in, node.out]);

  if (!overlay) {
    return null;
  }

  return createPortal(
    <div
      ref={windowRef}
      data-testid="context-window"
      role="menu"
      style={{
        position: "absolute",
        left: `${geometry.position.x}px`,
        top: `${geometry.position.y}px`,
        width: `${geometry.size.width}px`,
        height: `${geometry.size.height}px`,
        borderRadius: 12,
        border: "1px solid #cbd5f5",
        background: "#ffffff",
        boxShadow: "0 12px 32px rgba(15, 23, 42, 0.18)",
        display: "flex",
        flexDirection: "column",
        pointerEvents: "auto",
        overflow: "hidden"
      }}
    >
      <div
        onPointerDown={handleDragStart}
        style={{
          cursor: "move",
          padding: "12px 16px",
          fontWeight: 600,
          fontSize: 14,
          background: "#1f2937",
          color: "#f9fafb",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between"
        }}
      >
        <span style={{ marginRight: 12 }}>Node: {node.name}</span>
        <button
          type="button"
          onClick={onClose}
          style={{
            background: "transparent",
            border: "none",
            color: "#f9fafb",
            cursor: "pointer",
            fontSize: 16,
            fontWeight: 600,
            lineHeight: 1
          }}
          aria-label="Close context window"
        >
          ×
        </button>
      </div>
      <div
        style={{
          flex: 1,
          padding: "12px 16px",
          display: "grid",
          gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
          gap: 12,
          fontSize: 13,
          color: "#111827",
          overflow: "auto"
        }}
      >
        <div>
          <strong style={{ display: "block", marginBottom: 8 }}>Inputs</strong>
          {ports.inputs.length === 0 ? (
            <span style={{ color: "#6b7280" }}>None</span>
          ) : (
            <ul style={{ margin: 0, paddingLeft: 16 }}>
              {ports.inputs.map((port) => (
                <li key={port.port}>{port.port}</li>
              ))}
            </ul>
          )}
        </div>
        <div>
          <strong style={{ display: "block", marginBottom: 8 }}>Outputs</strong>
          {ports.outputs.length === 0 ? (
            <span style={{ color: "#6b7280" }}>None</span>
          ) : (
            <ul style={{ margin: 0, paddingLeft: 16 }}>
              {ports.outputs.map((port) => (
                <li key={port.port}>{port.port}</li>
              ))}
            </ul>
          )}
        </div>
      </div>
      <div
        onPointerDown={handleResizeStart}
        aria-label="Resize context window"
        style={{
          position: "absolute",
          right: 4,
          bottom: 4,
          width: 16,
          height: 16,
          cursor: "nwse-resize",
          borderRight: "2px solid #1f2937",
          borderBottom: "2px solid #1f2937"
        }}
      />
    </div>,
    overlay
  );
}

>>>>>>> theirs
