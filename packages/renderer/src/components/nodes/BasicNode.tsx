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
import EditMenu, {
  EDIT_MENU_DATA_ATTRIBUTE,
  EDIT_MENU_HEIGHT,
  EDIT_MENU_ITEMS,
  EDIT_MENU_WIDTH,
  type EditMenuItemLabel
} from "../EditMenu";
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
  interface: { width: 340, height: 300 },
  memory: { width: 340, height: 300 },
  tool: { width: 320, height: 280 }
};

const fallbackSize: WindowSize = { width: 320, height: 260 };

const getDefaultSize = (category: ModuleCategory | null): WindowSize =>
  (category ? moduleDefaultSizes[category] : fallbackSize) ?? fallbackSize;
const POSITION_KEY = "__position";
const EDIT_MENU_SELECTOR = `[${EDIT_MENU_DATA_ATTRIBUTE}]`;

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

const deriveModuleCategory = (node: NodeDef): ModuleCategory | null => {
  const name = (node.name ?? "").toLowerCase();
  const id = (node.id ?? "").toLowerCase();
  const moduleKeyRaw = typeof node.params?.moduleKey === "string" ? node.params.moduleKey : "";
  const moduleKey = moduleKeyRaw.toLowerCase();
  const haystack = `${name} ${id} ${moduleKey}`;

  if (moduleKey === "tool" || moduleKey === "toolcall" || moduleKey === "tool-call") {
    return "tool";
  }
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
  if (haystack.includes("memory") || haystack.includes("recall")) {
    return "memory";
  }
  if (haystack.includes("divert") || haystack.includes("divider") || haystack.includes("switch")) {
    return "divider";
  }
  if (
    haystack.includes("tool call") ||
    haystack.includes("tool-call") ||
    haystack.includes("tool:") ||
    haystack.includes("toolcall") ||
    haystack.includes("tool ") ||
    haystack.endsWith("tool")
  ) {
    return "tool";
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
  const { overlayRef } = useCanvasBoundary();
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
  const [editMenu, setEditMenu] = useState<
    { left: number; top: number; pointer: { x: number; y: number } | null } | null
  >(null);

  const {
    updateNodeParams,
    copyNode,
    cutNode,
    deleteNode,
    pasteClipboard,
    clipboard
  } = useFlowStore((state) => ({
    updateNodeParams: state.updateNodeParams,
    copyNode: state.copyNode,
    cutNode: state.cutNode,
    deleteNode: state.deleteNode,
    pasteClipboard: state.pasteClipboard,
    clipboard: state.clipboard
  }));

  const clampWithCanvas = useCallback(
    (geometry: WindowGeometry): WindowGeometry => {
      const rect = overlayRef.current?.getBoundingClientRect();
      if (!rect) {
        return geometry;
      }
      return clampGeometry(geometry, { width: rect.width, height: rect.height });
    },
    [overlayRef]
  );

  const openOptionsWindow = useCallback(
    (clientX?: number, clientY?: number) => {
      setEditMenu(null);
      setMenuState((previous) => {
        const rect = overlayRef.current?.getBoundingClientRect();
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
    [overlayRef]
  );

  const handleContextMenu = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      event.preventDefault();
      event.stopPropagation();

      setMenuState((previous) => ({ ...previous, open: false, minimized: false }));

      const rect = overlayRef.current?.getBoundingClientRect();
      if (!rect) {
        setEditMenu({
          left: event.clientX,
          top: event.clientY,
          pointer: null
        });
        return;
      }

      const relativeX = event.clientX - rect.left;
      const relativeY = event.clientY - rect.top;
      const clampedX = clamp(
        relativeX,
        CONTEXT_WINDOW_PADDING,
        Math.max(
          CONTEXT_WINDOW_PADDING,
          rect.width - EDIT_MENU_WIDTH - CONTEXT_WINDOW_PADDING
        )
      );
      const clampedY = clamp(
        relativeY,
        CONTEXT_WINDOW_PADDING,
        Math.max(
          CONTEXT_WINDOW_PADDING,
          rect.height - EDIT_MENU_HEIGHT - CONTEXT_WINDOW_PADDING
        )
      );

      setEditMenu({
        left: rect.left + clampedX,
        top: rect.top + clampedY,
        pointer: { x: clampedX, y: clampedY }
      });
    },
    [overlayRef]
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
      updateNodeParams(data.id, updater);
    },
    [data.id, updateNodeParams]
  );

  const canPasteNode = clipboard?.kind === "node";

  const handleEditMenuSelect = useCallback(
    (label: EditMenuItemLabel) => {
      const pointer = editMenu?.pointer ?? null;
      setEditMenu(null);

      switch (label) {
        case "Copy":
          copyNode(data.id);
          break;
        case "Cut":
          cutNode(data.id);
          break;
        case "Delete":
          deleteNode(data.id);
          break;
        case "Paste": {
          if (!canPasteNode) {
            break;
          }
          const pasted = pasteClipboard("node");
          if (pasted && !("from" in pasted) && pointer) {
            updateNodeParams(pasted.id, (previous) => {
              const base =
                previous && typeof previous === "object" ? previous : {};
              return {
                ...base,
                [POSITION_KEY]: { x: pointer.x, y: pointer.y }
              };
            });
          }
          break;
        }
        default:
          break;
      }
    },
    [
      canPasteNode,
      copyNode,
      cutNode,
      data.id,
      deleteNode,
      editMenu,
      pasteClipboard,
      updateNodeParams
    ]
  );

  const editMenuItems = useMemo(
    () =>
      EDIT_MENU_ITEMS.map((label) => ({
        label,
        disabled: label === "Paste" && !canPasteNode,
        onSelect: () => handleEditMenuSelect(label)
      })),
    [canPasteNode, handleEditMenuSelect]
  );

  useEffect(() => {
    if (!editMenu) {
      return;
    }

    const handleDismiss = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.closest?.(EDIT_MENU_SELECTOR)) {
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
        <EditMenu
          position={{ left: editMenu.left, top: editMenu.top }}
          items={editMenuItems}
        />
      ) : null}
    </>
  );
}

