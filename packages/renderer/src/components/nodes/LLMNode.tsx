import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState
} from "react";
import { Handle, Position, type NodeProps } from "reactflow";
import type { NodeDef } from "@voide/shared";
import ContextWindow, {
  CONTEXT_WINDOW_MIN_HEIGHT,
  CONTEXT_WINDOW_MIN_WIDTH,
  CONTEXT_WINDOW_PADDING,
  CanvasViewport,
  ContextWindowRect,
  constrainRectToBounds
} from "../ContextWindow";

const containerStyle: React.CSSProperties = {
  width: 184,
  height: 96,
  borderRadius: 9999,
  border: "3px solid #dc2626",
  background: "#fff1f2",
  color: "#991b1b",
  fontWeight: 700,
  textTransform: "uppercase",
  letterSpacing: 1,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  position: "relative",
  boxShadow: "0 6px 12px rgba(220, 38, 38, 0.18)"
};

const handleStyle: React.CSSProperties = {
  width: 14,
  height: 14,
  borderRadius: "50%",
  background: "#dc2626",
  border: "2px solid #fff1f2"
};

const sectionTitleStyle: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 700,
  textTransform: "uppercase",
  letterSpacing: 0.6,
  color: "#9f1239",
  marginBottom: 8
};

const quickActionButtonStyle: React.CSSProperties = {
  padding: "8px 12px",
  borderRadius: 8,
  border: "1px solid rgba(244, 63, 94, 0.35)",
  background: "linear-gradient(135deg, rgba(254, 205, 211, 0.7), rgba(254, 226, 226, 0.7))",
  color: "#9f1239",
  fontWeight: 600,
  fontSize: 12,
  cursor: "pointer",
  transition: "transform 140ms ease, box-shadow 140ms ease",
  boxShadow: "0 4px 12px rgba(244, 63, 94, 0.18)"
};

const summaryRowStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 4,
  padding: "8px 12px",
  borderRadius: 10,
  background: "rgba(254, 226, 226, 0.6)"
};

const summaryLabelStyle: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 600,
  color: "#991b1b",
  textTransform: "uppercase",
  letterSpacing: 0.5
};

const summaryValueStyle: React.CSSProperties = {
  fontSize: 13,
  fontWeight: 500,
  color: "#7f1d1d"
};

const DEFAULT_WINDOW_WIDTH = 320;
const DEFAULT_WINDOW_HEIGHT = 260;
const APPROX_THRESHOLD = 0.5;

type RelativeAnchor = {
  left: number;
  top: number;
  right: number;
  bottom: number;
};

const computeOffset = (index: number, total: number) =>
  `${((index + 1) / (total + 1)) * 100}%`;

const toCanvasViewport = (rect: DOMRect): CanvasViewport => ({
  top: rect.top,
  left: rect.left,
  width: rect.width,
  height: rect.height
});

const toRelativeAnchor = (
  anchor: DOMRect,
  canvas: CanvasViewport
): RelativeAnchor => ({
  left: anchor.left - canvas.left,
  top: anchor.top - canvas.top,
  right: anchor.right - canvas.left,
  bottom: anchor.bottom - canvas.top
});

const rectsApproximatelyEqual = (
  a: ContextWindowRect | null,
  b: ContextWindowRect | null
) => {
  if (!a || !b) {
    return false;
  }
  return (
    Math.abs(a.left - b.left) < APPROX_THRESHOLD &&
    Math.abs(a.top - b.top) < APPROX_THRESHOLD &&
    Math.abs(a.width - b.width) < APPROX_THRESHOLD &&
    Math.abs(a.height - b.height) < APPROX_THRESHOLD
  );
};

const viewportsApproximatelyEqual = (
  a: CanvasViewport | null,
  b: CanvasViewport | null
) => {
  if (!a || !b) {
    return false;
  }
  return (
    Math.abs(a.left - b.left) < APPROX_THRESHOLD &&
    Math.abs(a.top - b.top) < APPROX_THRESHOLD &&
    Math.abs(a.width - b.width) < APPROX_THRESHOLD &&
    Math.abs(a.height - b.height) < APPROX_THRESHOLD
  );
};

const computeInitialWindowRect = (
  anchorRect: DOMRect,
  canvasRect: CanvasViewport
): ContextWindowRect => {
  const width = Math.min(
    DEFAULT_WINDOW_WIDTH,
    Math.max(
      canvasRect.width - CONTEXT_WINDOW_PADDING * 2,
      CONTEXT_WINDOW_MIN_WIDTH
    )
  );
  const height = Math.min(
    DEFAULT_WINDOW_HEIGHT,
    Math.max(
      canvasRect.height - CONTEXT_WINDOW_PADDING * 2,
      CONTEXT_WINDOW_MIN_HEIGHT
    )
  );

  const anchorLeft = anchorRect.left - canvasRect.left;
  const anchorRight = anchorRect.right - canvasRect.left;
  const anchorTop = anchorRect.top - canvasRect.top;
  const anchorBottom = anchorRect.bottom - canvasRect.top;

  let left = anchorRight + CONTEXT_WINDOW_PADDING;
  if (left + width > canvasRect.width - CONTEXT_WINDOW_PADDING) {
    left = anchorLeft - width - CONTEXT_WINDOW_PADDING;
  }
  if (left < CONTEXT_WINDOW_PADDING) {
    left = CONTEXT_WINDOW_PADDING;
  }

  let top = anchorTop;
  if (top + height > canvasRect.height - CONTEXT_WINDOW_PADDING) {
    top = Math.max(CONTEXT_WINDOW_PADDING, anchorBottom - height);
  }
  if (top < CONTEXT_WINDOW_PADDING) {
    top = CONTEXT_WINDOW_PADDING;
  }

  return constrainRectToBounds(
    { left, top, width, height },
    canvasRect
  );
};

export default function LLMNode({ data }: NodeProps<NodeDef>) {
  const inputs = data.in ?? [];
  const outputs = data.out ?? [];
  const nodeRef = useRef<HTMLDivElement | null>(null);
  const [canvasRect, setCanvasRect] = useState<CanvasViewport | null>(null);
  const [windowRect, setWindowRect] = useState<ContextWindowRect | null>(null);
  const [isWindowOpen, setIsWindowOpen] = useState(false);
  const [isDocked, setIsDocked] = useState(false);
  const anchorSnapshot = useRef<RelativeAnchor | null>(null);

  const syncCanvasRect = useCallback((viewport: CanvasViewport) => {
    setCanvasRect((previous) =>
      viewportsApproximatelyEqual(previous, viewport) ? previous : viewport
    );
  }, []);

  const gatherGeometry = useCallback(() => {
    const element = nodeRef.current;
    if (!element) {
      return null;
    }
    const canvasElement = element.closest(".react-flow") as HTMLElement | null;
    if (!canvasElement) {
      return null;
    }
    return {
      canvasMetrics: toCanvasViewport(canvasElement.getBoundingClientRect()),
      anchorBounds: element.getBoundingClientRect()
    };
  }, []);

  const openWindow = useCallback(() => {
    const geometry = gatherGeometry();
    if (!geometry) {
      return;
    }

    const { canvasMetrics, anchorBounds } = geometry;
    syncCanvasRect(canvasMetrics);
    anchorSnapshot.current = toRelativeAnchor(anchorBounds, canvasMetrics);

    setWindowRect((previous) => {
      const baseline =
        previous ?? computeInitialWindowRect(anchorBounds, canvasMetrics);
      const constrained = constrainRectToBounds(baseline, canvasMetrics);
      if (previous && rectsApproximatelyEqual(previous, constrained)) {
        return previous;
      }
      return constrained;
    });

    setIsWindowOpen(true);
    setIsDocked(false);
  }, [gatherGeometry, syncCanvasRect]);

  const handleContextMenu = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      event.preventDefault();
      event.stopPropagation();
      openWindow();
    },
    [openWindow]
  );

  const handleDockIconOpen = useCallback(() => {
    openWindow();
  }, [openWindow]);

  const handleRectChange = useCallback((next: ContextWindowRect) => {
    setWindowRect((previous) =>
      rectsApproximatelyEqual(previous, next) ? previous : next
    );
  }, []);

  const handleClose = useCallback(() => {
    setIsWindowOpen(false);
    setIsDocked(true);
  }, []);

  const handleMinimize = useCallback(() => {
    setIsWindowOpen(false);
    setIsDocked(true);
  }, []);

  useEffect(() => {
    if (!(isWindowOpen || isDocked)) {
      return;
    }

    const updateMetrics = () => {
      const geometry = gatherGeometry();
      if (!geometry) {
        return;
      }
      const { canvasMetrics, anchorBounds } = geometry;
      syncCanvasRect(canvasMetrics);
      anchorSnapshot.current = toRelativeAnchor(anchorBounds, canvasMetrics);
      setWindowRect((previous) => {
        if (!previous) {
          return previous;
        }
        const constrained = constrainRectToBounds(previous, canvasMetrics);
        return rectsApproximatelyEqual(previous, constrained)
          ? previous
          : constrained;
      });
    };

    updateMetrics();
    window.addEventListener("resize", updateMetrics);

    let resizeObserver: ResizeObserver | null = null;
    const element = nodeRef.current;
    const canvasElement = element?.closest(".react-flow") as HTMLElement | null;
    if (canvasElement && typeof ResizeObserver !== "undefined") {
      resizeObserver = new ResizeObserver(updateMetrics);
      resizeObserver.observe(canvasElement);
    }

    return () => {
      window.removeEventListener("resize", updateMetrics);
      resizeObserver?.disconnect();
    };
  }, [gatherGeometry, isDocked, isWindowOpen, syncCanvasRect]);

  useEffect(() => {
    if (!isWindowOpen) {
      return;
    }

    const element = nodeRef.current;
    if (!element) {
      return;
    }

    const handleAnchorShift = () => {
      const geometry = gatherGeometry();
      if (!geometry) {
        return;
      }
      const { canvasMetrics, anchorBounds } = geometry;
      syncCanvasRect(canvasMetrics);
      const nextAnchor = toRelativeAnchor(anchorBounds, canvasMetrics);
      const previousAnchor = anchorSnapshot.current;
      anchorSnapshot.current = nextAnchor;

      if (!previousAnchor) {
        return;
      }

      const deltaX = nextAnchor.left - previousAnchor.left;
      const deltaY = nextAnchor.top - previousAnchor.top;

      if (Math.abs(deltaX) < 0.2 && Math.abs(deltaY) < 0.2) {
        return;
      }

      setWindowRect((previous) => {
        if (!previous) {
          return previous;
        }
        const moved = {
          ...previous,
          left: previous.left + deltaX,
          top: previous.top + deltaY
        };
        const constrained = constrainRectToBounds(moved, canvasMetrics);
        return rectsApproximatelyEqual(previous, constrained)
          ? previous
          : constrained;
      });
    };

    const observer = new MutationObserver(handleAnchorShift);
    observer.observe(element, {
      attributes: true,
      attributeFilter: ["style", "class"]
    });

    return () => observer.disconnect();
  }, [gatherGeometry, isWindowOpen, syncCanvasRect]);

  const iconVisible = isDocked && !!windowRect;

  const dockIconStyle = useMemo<React.CSSProperties>(
    () => ({
      position: "absolute",
      bottom: 6,
      right: 6,
      width: 28,
      height: 28,
      borderRadius: "50%",
      border: "2px solid #dc2626",
      background: "#fee2e2",
      color: "#b91c1c",
      fontSize: 14,
      fontWeight: 700,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      boxShadow: "0 4px 14px rgba(220, 38, 38, 0.28)",
      cursor: "pointer",
      transition: "opacity 160ms ease, transform 160ms ease",
      opacity: iconVisible ? 1 : 0,
      transform: iconVisible ? "scale(1)" : "scale(0.85)",
      pointerEvents: iconVisible ? "auto" : "none"
    }),
    [iconVisible]
  );

  return (
    <>
      <div ref={nodeRef} style={containerStyle} onContextMenu={handleContextMenu}>
        {inputs.map((port, index) => (
          <Handle
            key={port.port}
            type="target"
            position={Position.Left}
            id={`${data.id}:${port.port}`}
            style={{
              ...handleStyle,
              top: computeOffset(index, inputs.length)
            }}
          />
        ))}

        <span>{data.name}</span>

        {outputs.map((port, index) => (
          <Handle
            key={port.port}
            type="source"
            position={Position.Right}
            id={`${data.id}:${port.port}`}
            style={{
              ...handleStyle,
              top: computeOffset(index, outputs.length)
            }}
          />
        ))}

        <button
          type="button"
          onClick={handleDockIconOpen}
          onContextMenu={(event) => {
            event.preventDefault();
            event.stopPropagation();
            handleDockIconOpen();
          }}
          style={dockIconStyle}
          aria-label="Open LLM options"
        >
          ⚙
        </button>
      </div>

      {canvasRect && windowRect && (
        <ContextWindow
          rect={windowRect}
          canvasRect={canvasRect}
          isVisible={isWindowOpen}
          title={`${data.name} Options`}
          onRequestClose={handleClose}
          onRequestMinimize={handleMinimize}
          onRectChange={handleRectChange}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div>
              <div style={sectionTitleStyle}>Quick Actions</div>
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                <button type="button" style={quickActionButtonStyle}>
                  Preview Prompt
                </button>
                <button type="button" style={quickActionButtonStyle}>
                  Inspect Responses
                </button>
                <button type="button" style={quickActionButtonStyle}>
                  Manage Variants
                </button>
              </div>
            </div>

            <div>
              <div style={sectionTitleStyle}>Current Summary</div>
              <div style={{ display: "grid", gap: 10 }}>
                <div style={summaryRowStyle}>
                  <span style={summaryLabelStyle}>Model</span>
                  <span style={summaryValueStyle}>LLM Core (offline)</span>
                </div>
                <div style={summaryRowStyle}>
                  <span style={summaryLabelStyle}>Context</span>
                  <span style={summaryValueStyle}>
                    Listening to upstream prompt and tools. Right-click to reopen if you
                    minimize.
                  </span>
                </div>
              </div>
            </div>
          </div>
        </ContextWindow>
      )}
    </>
  );
}
