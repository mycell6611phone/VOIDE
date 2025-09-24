import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Handle, Position, type NodeProps } from "reactflow";
import type { NodeDef } from "@voide/shared";
import ContextWindow from "../ContextWindow";
import ModuleOptionsContent, {
  type ModuleCategory,
  type ParamsUpdater
} from "../ModuleOptionsContent";
import { useCanvasBoundary } from "../CanvasBoundaryContext";
import {
  CONTEXT_WINDOW_PADDING,
  clampGeometry,
  type WindowGeometry,
  type WindowSize
} from "../contextWindowUtils";
import { useFlowStore } from "../../state/flowStore";

const containerStyle: React.CSSProperties = {
  width: 156,
  minHeight: 82,
  padding: "16px 20px",
  borderRadius: 16,
  border: "2px solid #1f2937",
  background: "#ffffff",
  color: "#111827",
  fontWeight: 600,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  textAlign: "center",
  position: "relative",
  boxShadow: "0 4px 8px rgba(15, 23, 42, 0.08)"
};

const handleStyle: React.CSSProperties = {
  width: 12,
  height: 12,
  borderRadius: "50%",
  background: "#1f2937",
  border: "2px solid #ffffff"
};

const computeOffset = (index: number, total: number) =>
  `${((index + 1) / (total + 1)) * 100}%`;

const moduleDefaultSizes: Record<ModuleCategory, WindowSize> = {
  prompt: { width: 360, height: 320 },
  debate: { width: 380, height: 360 },
  log: { width: 380, height: 360 },
  cache: { width: 320, height: 280 },
  divider: { width: 320, height: 260 },
  interface: { width: 340, height: 300 }
};

const fallbackSize: WindowSize = { width: 320, height: 260 };

const getDefaultSize = (category: ModuleCategory | null): WindowSize =>
  (category ? moduleDefaultSizes[category] : fallbackSize) ?? fallbackSize;

const EDIT_MENU_ITEMS = ["Cut", "Copy", "Paste", "Delete"] as const;

const MENU_WIDTH = 176;
const MENU_HEIGHT = 192;

const editMenuBaseStyle: React.CSSProperties = {
  position: "fixed",
  minWidth: MENU_WIDTH,
  background: "#f9fafb",
  border: "1px solid rgba(15, 23, 42, 0.15)",
  borderRadius: 12,
  boxShadow: "0 18px 36px rgba(15, 23, 42, 0.18)",
  padding: 6,
  display: "flex",
  flexDirection: "column",
  gap: 2,
  zIndex: 160,
  pointerEvents: "auto"
};

const editMenuItemStyle: React.CSSProperties = {
  padding: "8px 12px",
  borderRadius: 8,
  border: "none",
  background: "transparent",
  color: "#111827",
  fontWeight: 600,
  fontSize: 13,
  textAlign: "left" as const,
  cursor: "pointer",
  transition: "background 120ms ease, transform 120ms ease"
};

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

const deriveModuleCategory = (node: NodeDef): ModuleCategory | null => {
  const name = (node.name ?? "").toLowerCase();
  const id = (node.id ?? "").toLowerCase();
  const moduleKeyRaw = typeof node.params?.moduleKey === "string" ? node.params.moduleKey : "";
  const moduleKey = moduleKeyRaw.toLowerCase();
  const haystack = `${name} ${id} ${moduleKey}`;

  if (haystack.includes("prompt")) {
    return "prompt";
  }
  if (haystack.includes("debate") || haystack.includes("loop")) {
    return "debate";
  }
  if (haystack.includes("log")) {
    return "log";
  }
  if (haystack.includes("cache") || haystack.includes("memo")) {
    return "cache";
  }
  if (haystack.includes("divert") || haystack.includes("divider") || haystack.includes("switch")) {
    return "divider";
  }
  if (haystack.includes("ui") || haystack.includes("interface")) {
    return "interface";
  }
  return null;
};

interface MenuState {
  open: boolean;
  minimized: boolean;
  geometry: WindowGeometry;
}

export default function BasicNode({ data }: NodeProps<NodeDef>) {
  const inputs = data.in ?? [];
  const outputs = data.out ?? [];
  const canvasRef = useCanvasBoundary();
  const moduleCategory = useMemo(() => deriveModuleCategory(data), [data]);
  const defaultSize = useMemo(() => getDefaultSize(moduleCategory), [moduleCategory]);
  const [menuState, setMenuState] = useState<MenuState>(() => ({
    open: false,
    minimized: false,
    geometry: {
      position: { x: 0, y: 0 },
      size: { ...defaultSize }
    }
  }));
  const [editMenu, setEditMenu] = useState<{ left: number; top: number } | null>(
    null
  );

  const updateNodeParams = useFlowStore((state) => state.updateNodeParams);

  const clampWithCanvas = useCallback(
    (geometry: WindowGeometry): WindowGeometry => {
      const rect = canvasRef?.current?.getBoundingClientRect();
      if (!rect) {
        return geometry;
      }
      return clampGeometry(geometry, { width: rect.width, height: rect.height });
    },
    [canvasRef]
  );

  const openOptionsWindow = useCallback(
    (clientX?: number, clientY?: number) => {
      setEditMenu(null);
      setMenuState((previous) => {
        const rect = canvasRef?.current?.getBoundingClientRect();
        if (!rect) {
          return { ...previous, open: true, minimized: false };
        }

        const pointerGeometry: WindowGeometry = {
          position: {
            x:
              typeof clientX === "number"
                ? clientX - rect.left + 12
                : previous.geometry.position.x,
            y:
              typeof clientY === "number"
                ? clientY - rect.top + 12
                : previous.geometry.position.y
          },
          size: previous.geometry.size
        };

        const nextGeometry = clampGeometry(pointerGeometry, {
          width: rect.width,
          height: rect.height
        });

        return {
          ...previous,
          open: true,
          minimized: false,
          geometry: nextGeometry
        };
      });
    },
    [canvasRef]
  );

  const handleContextMenu = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      event.preventDefault();
      event.stopPropagation();

      setMenuState((previous) => ({ ...previous, open: false, minimized: false }));

      const rect = canvasRef?.current?.getBoundingClientRect();
      if (!rect) {
        setEditMenu({ left: event.clientX, top: event.clientY });
        return;
      }

      const relativeX = event.clientX - rect.left;
      const relativeY = event.clientY - rect.top;
      const clampedX = clamp(
        relativeX,
        CONTEXT_WINDOW_PADDING,
        Math.max(
          CONTEXT_WINDOW_PADDING,
          rect.width - MENU_WIDTH - CONTEXT_WINDOW_PADDING
        )
      );
      const clampedY = clamp(
        relativeY,
        CONTEXT_WINDOW_PADDING,
        Math.max(
          CONTEXT_WINDOW_PADDING,
          rect.height - MENU_HEIGHT - CONTEXT_WINDOW_PADDING
        )
      );

      setEditMenu({
        left: rect.left + clampedX,
        top: rect.top + clampedY
      });
    },
    [canvasRef]
  );

  const handleNodeClick = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      if (event.button !== 0) {
        return;
      }

      const target = event.target as HTMLElement | null;
      if (target?.closest?.(".react-flow__handle")) {
        return;
      }

      event.stopPropagation();
      openOptionsWindow(event.clientX, event.clientY);
    },
    [openOptionsWindow]
  );

  const handleClose = useCallback(
    () => setMenuState((previous) => ({ ...previous, open: false })),
    []
  );

  const handleToggleMinimize = useCallback(
    () =>
      setMenuState((previous) => ({
        ...previous,
        minimized: !previous.minimized
      })),
    []
  );

  const handleUpdateGeometry = useCallback(
    (geometry: WindowGeometry) => {
      setMenuState((previous) => ({
        ...previous,
        geometry: clampWithCanvas(geometry)
      }));
    },
    [clampWithCanvas]
  );

  const handleParamsUpdate = useCallback(
    (updater: ParamsUpdater) => {
      if (!updateNodeParams) {
        return;
      }
      updateNodeParams(data.id, updater);
    },
    [data.id, updateNodeParams]
  );

  useEffect(() => {
    if (!editMenu) {
      return;
    }

    const handleDismiss = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.closest?.("[data-node-edit-menu]")) {
        return;
      }
      setEditMenu(null);
    };

    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setEditMenu(null);
      }
    };

    window.addEventListener("mousedown", handleDismiss);
    window.addEventListener("contextmenu", handleDismiss);
    window.addEventListener("keydown", handleKey);

    return () => {
      window.removeEventListener("mousedown", handleDismiss);
      window.removeEventListener("contextmenu", handleDismiss);
      window.removeEventListener("keydown", handleKey);
    };
  }, [editMenu]);

  const shouldRenderMenu = Boolean(moduleCategory);
  const enableChatShortcut = moduleCategory === "interface";

  const handlePrimaryClick = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      if (enableChatShortcut) {
        if (typeof window !== "undefined") {
          const opener = window.voide?.openChatWindow;
          if (typeof opener === "function") {
            event.stopPropagation();
            void opener();
            return;
          }
        }
      }

      handleNodeClick(event);
    },
    [enableChatShortcut, handleNodeClick]
  );

  return (
    <>
      <div
        style={containerStyle}
        onClick={shouldRenderMenu ? handlePrimaryClick : undefined}
        onContextMenu={shouldRenderMenu ? handleContextMenu : undefined}
      >
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
      </div>

      {shouldRenderMenu ? (
        <ContextWindow
          title={`${data.name} Options`}
          open={menuState.open}
          position={menuState.geometry.position}
          size={menuState.geometry.size}
          minimized={menuState.minimized}
          onRequestClose={handleClose}
          onToggleMinimize={handleToggleMinimize}
          onUpdate={handleUpdateGeometry}
        >
          <ModuleOptionsContent
            module={moduleCategory!}
            params={data.params}
            onUpdate={handleParamsUpdate}
          />
        </ContextWindow>
      ) : null}

      {editMenu ? (
        <div
          data-node-edit-menu
          style={{ ...editMenuBaseStyle, left: editMenu.left, top: editMenu.top }}
        >
          {EDIT_MENU_ITEMS.map((label) => (
            <button
              key={label}
              type="button"
              style={editMenuItemStyle}
              onMouseDown={(event) => event.stopPropagation()}
              onClick={(event) => {
                event.stopPropagation();
                setEditMenu(null);
              }}
              onMouseEnter={(event) => {
                (event.currentTarget as HTMLButtonElement).style.background =
                  "rgba(15, 23, 42, 0.08)";
              }}
              onMouseLeave={(event) => {
                (event.currentTarget as HTMLButtonElement).style.background =
                  "transparent";
              }}
            >
              {label}
            </button>
          ))}
        </div>
      ) : null}
    </>
  );
}

