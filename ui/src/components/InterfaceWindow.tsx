import { useCallback, useEffect, useId, useRef } from "react";
import type { InterfaceWindowState } from "../store";

interface Geometry {
  position: { x: number; y: number };
  size: { width: number; height: number };
}

interface InterfaceWindowProps {
  id: string;
  state: InterfaceWindowState;
  getContainerRect: () => DOMRect | null;
  onClose: () => void;
  onMinimize: () => void;
  onFocus: () => void;
  onInputChange: (value: string) => void;
  onOutputChange: (value: string) => void;
  onGeometryChange: (geometry: Geometry) => void;
}

const MAX_LINES = 7;

const HANDLE_CONFIG = [
  {
    dir: "n",
    style: {
      top: -4,
      left: "50%",
      marginLeft: -8,
      width: 16,
      height: 8,
      cursor: "ns-resize",
    },
  },
  {
    dir: "s",
    style: {
      bottom: -4,
      left: "50%",
      marginLeft: -8,
      width: 16,
      height: 8,
      cursor: "ns-resize",
    },
  },
  {
    dir: "e",
    style: {
      right: -4,
      top: "50%",
      marginTop: -8,
      width: 8,
      height: 16,
      cursor: "ew-resize",
    },
  },
  {
    dir: "w",
    style: {
      left: -4,
      top: "50%",
      marginTop: -8,
      width: 8,
      height: 16,
      cursor: "ew-resize",
    },
  },
  {
    dir: "ne",
    style: {
      top: -4,
      right: -4,
      width: 12,
      height: 12,
      cursor: "nesw-resize",
    },
  },
  {
    dir: "nw",
    style: {
      top: -4,
      left: -4,
      width: 12,
      height: 12,
      cursor: "nwse-resize",
    },
  },
  {
    dir: "se",
    style: {
      bottom: -4,
      right: -4,
      width: 12,
      height: 12,
      cursor: "nwse-resize",
    },
  },
  {
    dir: "sw",
    style: {
      bottom: -4,
      left: -4,
      width: 12,
      height: 12,
      cursor: "nesw-resize",
    },
  },
];

export default function InterfaceWindow({
  id,
  state,
  getContainerRect,
  onClose,
  onMinimize,
  onFocus,
  onInputChange,
  onOutputChange,
  onGeometryChange,
}: InterfaceWindowProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const outputRef = useRef<HTMLTextAreaElement>(null);
  const dragState = useRef<{
    offsetX: number;
    offsetY: number;
    size: { width: number; height: number };
  } | null>(null);
  const resizeState = useRef<{
    direction: string;
    startX: number;
    startY: number;
    startPosition: { x: number; y: number };
    startSize: { width: number; height: number };
  } | null>(null);
  const geometryRef = useRef(onGeometryChange);
  const rectRef = useRef(getContainerRect);
  const titleId = useId();

  geometryRef.current = onGeometryChange;
  rectRef.current = getContainerRect;

  const adjustTextarea = useCallback((el: HTMLTextAreaElement | null) => {
    if (!el) return;
    el.style.height = "auto";
    const styles = window.getComputedStyle(el);
    const lineHeight = parseFloat(styles.lineHeight || "20");
    const maxHeight = lineHeight * MAX_LINES;
    const newHeight = Math.min(el.scrollHeight, maxHeight);
    el.style.height = `${newHeight}px`;
    el.style.overflowY = el.scrollHeight > maxHeight ? "auto" : "hidden";
  }, []);

  useEffect(() => {
    adjustTextarea(inputRef.current);
  }, [adjustTextarea, state.inputText]);

  useEffect(() => {
    adjustTextarea(outputRef.current);
  }, [adjustTextarea, state.outputText]);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      inputRef.current?.focus({ preventScroll: true });
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    return () => {
      window.removeEventListener("mousemove", handleDragMove);
      window.removeEventListener("mouseup", handleDragEnd);
      window.removeEventListener("mousemove", handleResizeMove);
      window.removeEventListener("mouseup", handleResizeEnd);
    };
  }, []);

  const getFocusable = useCallback(() => {
    if (!containerRef.current) return [] as HTMLElement[];
    const focusable = containerRef.current.querySelectorAll<HTMLElement>(
      'button, [href], textarea, input, select, [tabindex]:not([tabindex="-1"])'
    );
    return Array.from(focusable).filter(
      (el) => !el.hasAttribute("disabled") && el.tabIndex !== -1
    );
  }, []);

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Escape") {
      event.preventDefault();
      onClose();
      return;
    }
    if ((event.key === "m" || event.key === "M") && (event.ctrlKey || event.metaKey)) {
      event.preventDefault();
      onMinimize();
      return;
    }
    if (event.key === "Tab") {
      const focusable = getFocusable();
      if (focusable.length === 0) {
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      } else if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      }
    }
  };

  const handleDragMove = (event: MouseEvent) => {
    if (!dragState.current) return;
    const rect = rectRef.current?.();
    if (!rect) return;
    const x = event.clientX - rect.left - dragState.current.offsetX;
    const y = event.clientY - rect.top - dragState.current.offsetY;
    geometryRef.current({
      position: { x, y },
      size: dragState.current.size,
    });
  };

  const handleDragEnd = () => {
    dragState.current = null;
    window.removeEventListener("mousemove", handleDragMove);
    window.removeEventListener("mouseup", handleDragEnd);
  };

  const startDrag = (event: React.MouseEvent<HTMLDivElement>) => {
    if ((event.target as HTMLElement).closest("button")) {
      return;
    }
    event.preventDefault();
    const rect = rectRef.current?.();
    if (!rect) return;
    dragState.current = {
      offsetX: event.clientX - rect.left - state.position.x,
      offsetY: event.clientY - rect.top - state.position.y,
      size: state.size,
    };
    window.addEventListener("mousemove", handleDragMove);
    window.addEventListener("mouseup", handleDragEnd);
  };

  const handleResizeMove = (event: MouseEvent) => {
    if (!resizeState.current) return;
    const { direction, startX, startY, startPosition, startSize } =
      resizeState.current;
    const dx = event.clientX - startX;
    const dy = event.clientY - startY;
    let width = startSize.width;
    let height = startSize.height;
    let x = startPosition.x;
    let y = startPosition.y;
    if (direction.includes("e")) {
      width = startSize.width + dx;
    }
    if (direction.includes("s")) {
      height = startSize.height + dy;
    }
    if (direction.includes("w")) {
      width = startSize.width - dx;
      x = startPosition.x + dx;
    }
    if (direction.includes("n")) {
      height = startSize.height - dy;
      y = startPosition.y + dy;
    }
    geometryRef.current({
      position: { x, y },
      size: { width, height },
    });
  };

  const handleResizeEnd = () => {
    resizeState.current = null;
    window.removeEventListener("mousemove", handleResizeMove);
    window.removeEventListener("mouseup", handleResizeEnd);
  };

  const startResize = (direction: string, event: React.MouseEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    resizeState.current = {
      direction,
      startX: event.clientX,
      startY: event.clientY,
      startPosition: state.position,
      startSize: state.size,
    };
    window.addEventListener("mousemove", handleResizeMove);
    window.addEventListener("mouseup", handleResizeEnd);
  };

  const copyText = useCallback(async (text: string) => {
    if (!text) {
      return;
    }
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const helper = document.createElement("textarea");
      helper.value = text;
      helper.setAttribute("readonly", "");
      helper.style.position = "absolute";
      helper.style.left = "-9999px";
      document.body.appendChild(helper);
      helper.select();
      document.execCommand("copy");
      document.body.removeChild(helper);
    }
  }, []);

  return (
    <div
      ref={containerRef}
      className="absolute flex flex-col bg-white border border-gray-300 rounded shadow-2xl overflow-hidden"
      style={{
        left: state.position.x,
        top: state.position.y,
        width: state.size.width,
        height: state.size.height,
        zIndex: state.zIndex,
      }}
      role="dialog"
      aria-modal="false"
      aria-labelledby={titleId}
      tabIndex={-1}
      onKeyDown={handleKeyDown}
      onMouseDownCapture={onFocus}
      onFocusCapture={onFocus}
    >
      <div
        className="flex items-center justify-between bg-gray-100 border-b border-gray-200 px-3 py-2 select-none cursor-move"
        onMouseDown={startDrag}
      >
        <h2 id={titleId} className="text-sm font-semibold text-gray-700">
          Interface
        </h2>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="px-2 py-1 text-xs border border-gray-300 rounded hover:bg-gray-200"
            onClick={(event) => {
              event.stopPropagation();
              onMinimize();
            }}
            aria-label="Minimize interface window"
          >
            Minimize
          </button>
          <button
            type="button"
            className="px-2 py-1 text-xs border border-gray-300 rounded hover:bg-gray-200"
            onClick={(event) => {
              event.stopPropagation();
              onClose();
            }}
            aria-label="Close interface window"
          >
            Close
          </button>
        </div>
      </div>
      <div className="flex-1 overflow-auto p-4 space-y-6">
        <section className="space-y-2" style={{ width: "min(100%, 816px)" }}>
          <div className="flex items-center justify-between">
            <label
              htmlFor={`${id}-interface-input`}
              className="text-sm font-medium text-gray-700"
            >
              Input
            </label>
            <button
              type="button"
              className="text-xs px-2 py-1 border border-gray-300 rounded hover:bg-gray-200"
              onClick={() => copyText(state.inputText)}
              aria-label="Copy input text"
            >
              Copy
            </button>
          </div>
          <textarea
            id={`${id}-interface-input`}
            ref={inputRef}
            value={state.inputText}
            onChange={(event) => onInputChange(event.target.value)}
            onInput={(event) => adjustTextarea(event.currentTarget)}
            spellCheck
            rows={1}
            className="w-full border border-gray-300 rounded px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-400"
            style={{ maxWidth: "100%" }}
          />
          <div className="flex justify-end">
            <button
              type="button"
              className="text-xs px-2 py-1 border border-gray-300 rounded hover:bg-gray-200"
              onClick={() => onInputChange("")}
              aria-label="Reset input text"
            >
              Reset
            </button>
          </div>
        </section>
        <section className="space-y-2" style={{ width: "min(100%, 816px)" }}>
          <div className="flex items-center justify-between">
            <label
              htmlFor={`${id}-interface-output`}
              className="text-sm font-medium text-gray-700"
            >
              Output
            </label>
            <button
              type="button"
              className="text-xs px-2 py-1 border border-gray-300 rounded hover:bg-gray-200"
              onClick={() => copyText(state.outputText)}
              aria-label="Copy output text"
            >
              Copy
            </button>
          </div>
          <textarea
            id={`${id}-interface-output`}
            ref={outputRef}
            value={state.outputText}
            readOnly
            aria-readonly="true"
            spellCheck={false}
            rows={1}
            className="w-full border border-gray-300 rounded px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-400"
            style={{ maxWidth: "100%" }}
            onInput={(event) => adjustTextarea(event.currentTarget)}
          />
          <div className="flex justify-end">
            <button
              type="button"
              className="text-xs px-2 py-1 border border-gray-300 rounded hover:bg-gray-200"
              onClick={() => onOutputChange("")}
              aria-label="Reset output text"
            >
              Reset
            </button>
          </div>
        </section>
      </div>
      {HANDLE_CONFIG.map((handle) => (
        <div
          key={handle.dir}
          aria-hidden="true"
          className="absolute"
          style={{
            ...handle.style,
            zIndex: 1,
          }}
          onMouseDown={(event) => startResize(handle.dir, event)}
        />
      ))}
    </div>
  );
}
