import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Handle, Position, type NodeProps } from "reactflow";
import type { NodeDef } from "@voide/shared";
import ContextWindow from "../ContextWindow";
import ModuleOptionsContent, {
  MEMORY_SUB_MENUS,
  type MemorySubMenuKey,
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
import {
  DEFAULT_CHAT_WINDOW_SIZE,
  useChatStore
} from "../../state/chatStore";
import {
  readNodeOrientation,
  toggleNodeOrientationParams
} from "./orientation";

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

const portLabelBaseStyle: React.CSSProperties = {
  position: "absolute",
  fontSize: 10,
  fontWeight: 600,
  letterSpacing: 0.5,
  color: "#6b7280",
  pointerEvents: "none",
  transform: "translateY(-50%)"
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
  if (
    haystack.includes("memory") ||
    haystack.includes("recall") ||
    haystack.includes("attach")
  ) {
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

interface MemorySubWindowState {
  open: boolean;
  minimized: boolean;
  geometry: WindowGeometry;
}

type MemorySubWindowMap = Record<MemorySubMenuKey, MemorySubWindowState>;

const createMemorySubWindowMap = (size: WindowSize): MemorySubWindowMap => {
  const halfSize: WindowSize = {
    width: Math.max(1, Math.round(size.width / 2)),
    height: Math.max(1, Math.round(size.height / 2))
  };

  const map = {} as MemorySubWindowMap;
  for (const menu of MEMORY_SUB_MENUS) {
    map[menu.key] = {
      open: false,
      minimized: false,
      geometry: {
        position: { x: 0, y: 0 },
        size: { ...halfSize }
      }
    };
  }
  return map;
};

export default function BasicNode({ data }: NodeProps<NodeDef>) {
  const inputs = data.in ?? [];
  const outputs = data.out ?? [];
  const { overlayRef } = useCanvasBoundary();
  const orientation = useMemo(
    () => readNodeOrientation(data.params),
    [data.params]
  );
  const inputHandlePosition =
    orientation === "reversed" ? Position.Right : Position.Left;
  const outputHandlePosition =
    orientation === "reversed" ? Position.Left : Position.Right;
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
  const [memorySubWindows, setMemorySubWindows] = useState<MemorySubWindowMap>(
    () => createMemorySubWindowMap(defaultSize)
  );
  const menuGeometry = menuState.geometry;
  const menuPosition = menuGeometry.position;
  const menuSize = menuGeometry.size;

  const memorySubWindowMinSize = useMemo<WindowSize>(
    () => ({
      width: Math.max(1, Math.round(menuSize.width / 2)),
      height: Math.max(1, Math.round(menuSize.height / 2))
    }),
    [menuSize.height, menuSize.width]
  );
  const [editMenu, setEditMenu] = useState<
    { left: number; top: number; pointer: { x: number; y: number } | null } | null
  >(null);

  const openChat = useChatStore((state) => state.openChat);
  const getThread = useChatStore((state) => state.getThread);

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

  useEffect(() => {
    setMemorySubWindows(createMemorySubWindowMap(defaultSize));
  }, [defaultSize]);

  useEffect(() => {
    if (moduleCategory !== "memory" || menuState.open) {
      return;
    }
    setMemorySubWindows((previous) => {
      let changed = false;
      const next: MemorySubWindowMap = { ...previous };
      for (const menu of MEMORY_SUB_MENUS) {
        const current = next[menu.key];
        if (!current) {
          continue;
        }
        if (current.open || current.minimized) {
          next[menu.key] = { ...current, open: false, minimized: false };
          changed = true;
        }
      }
      return changed ? next : previous;
    });
  }, [menuState.open, moduleCategory]);

  const handleMemorySubWindowUpdate = useCallback(
    (key: MemorySubMenuKey) => (geometry: WindowGeometry) => {
      setMemorySubWindows((previous) => {
        const current = previous[key];
        if (!current) {
          return previous;
        }
        const clamped = clampWithCanvas(geometry);
        const { position, size } = current.geometry;
        if (
          position.x === clamped.position.x &&
          position.y === clamped.position.y &&
          size.width === clamped.size.width &&
          size.height === clamped.size.height
        ) {
          return previous;
        }
        return {
          ...previous,
          [key]: {
            ...current,
            geometry: clamped
          }
        };
      });
    },
    [clampWithCanvas]
  );

  const handleMemorySubWindowClose = useCallback(
    (key: MemorySubMenuKey) => () => {
      setMemorySubWindows((previous) => {
        const current = previous[key];
        if (!current) {
          return previous;
        }
        if (!current.open && !current.minimized) {
          return previous;
        }
        return {
          ...previous,
          [key]: {
            ...current,
            open: false,
            minimized: false
          }
        };
      });
    },
    []
  );

  const handleMemorySubWindowToggleMinimize = useCallback(
    (key: MemorySubMenuKey) => () => {
      setMemorySubWindows((previous) => {
        const current = previous[key];
        if (!current) {
          return previous;
        }
        return {
          ...previous,
          [key]: {
            ...current,
            minimized: !current.minimized
          }
        };
      });
    },
    []
  );

  const openMemorySubWindow = useCallback(
    (key: MemorySubMenuKey) => {
      if (moduleCategory !== "memory") {
        return;
      }
      setMemorySubWindows((previous) => {
        const desiredSize: WindowSize = { ...memorySubWindowMinSize };
        const menuIndex = MEMORY_SUB_MENUS.findIndex((menu) => menu.key === key);
        const desiredGeometry = clampWithCanvas({
          position: {
            x: menuPosition.x + menuSize.width + 16,
            y: menuPosition.y + Math.max(0, menuIndex) * 24
          },
          size: desiredSize
        });
        const existing = previous[key];
        const geometry =
          existing && existing.open ? existing.geometry : desiredGeometry;
        return {
          ...previous,
          [key]: {
            open: true,
            minimized: false,
            geometry
          }
        };
      });
    },

    [clampWithCanvas, memorySubWindowMinSize, menuPosition.x, menuPosition.y, menuSize.width, moduleCategory]
  );

  const openOptionsWindow = useCallback(
    (options?: { clientX?: number; clientY?: number; anchorRect?: DOMRect | null }) => {
      const { clientX, clientY, anchorRect } = options ?? {};
      setEditMenu(null);
      setMenuState((previous) => {
        const rect = overlayRef.current?.getBoundingClientRect();
        if (!rect) {
          return { ...previous, open: true, minimized: false };
        }

        const { width, height } = previous.geometry.size;
        let targetX = previous.geometry.position.x;
        let targetY = previous.geometry.position.y;

        if (anchorRect) {
          const anchorLeft = anchorRect.left - rect.left;
          const anchorTop = anchorRect.top - rect.top;
          const anchorCenterX = anchorLeft + anchorRect.width / 2;
          const anchorCenterY = anchorTop + anchorRect.height / 2;
          targetX = anchorCenterX - width / 2;
          targetY = anchorCenterY - height / 2;
        } else if (typeof clientX === "number" && typeof clientY === "number") {
          const pointerX = clientX - rect.left;
          const pointerY = clientY - rect.top;
          targetX = pointerX - width / 2;
          targetY = pointerY - height / 2;
        }

        const pointerGeometry: WindowGeometry = {
          position: {
            x: targetX,
            y: targetY
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
          left: event.clientX - EDIT_MENU_WIDTH / 2,
          top: event.clientY - EDIT_MENU_HEIGHT / 2,
          pointer: null
        });
        return;
      }

      const maxX = Math.max(
        CONTEXT_WINDOW_PADDING,
        rect.width - EDIT_MENU_WIDTH - CONTEXT_WINDOW_PADDING
      );
      const maxY = Math.max(
        CONTEXT_WINDOW_PADDING,
        rect.height - EDIT_MENU_HEIGHT - CONTEXT_WINDOW_PADDING
      );

      const pointerX = clamp(
        event.clientX - rect.left,
        CONTEXT_WINDOW_PADDING,
        maxX
      );
      const pointerY = clamp(
        event.clientY - rect.top,
        CONTEXT_WINDOW_PADDING,
        maxY
      );

      const targetX = pointerX - EDIT_MENU_WIDTH / 2;
      const targetY = pointerY - EDIT_MENU_HEIGHT / 2;

      const menuX = clamp(targetX, CONTEXT_WINDOW_PADDING, maxX);
      const menuY = clamp(targetY, CONTEXT_WINDOW_PADDING, maxY);

      setEditMenu({
        left: rect.left + menuX,
        top: rect.top + menuY,
        pointer: { x: pointerX, y: pointerY }
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
      openOptionsWindow({
        clientX: event.clientX,
        clientY: event.clientY,
        anchorRect: event.currentTarget.getBoundingClientRect()
      });
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
  const canToggleOrientation = inputs.length > 0 || outputs.length > 0;

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
        case "Reverse Inputs": {
          updateNodeParams(data.id, (previous) =>
            toggleNodeOrientationParams(previous)
          );
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
      EDIT_MENU_ITEMS.map((label) => {
        const disabled =
          label === "Paste"
            ? !canPasteNode
            : label === "Reverse Inputs"
              ? !canToggleOrientation
              : false;
        return {
          label,
          disabled,
          onSelect: () => handleEditMenuSelect(label)
        };
      }),
    [canPasteNode, canToggleOrientation, handleEditMenuSelect]
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
        event.stopPropagation();
        const overlayRect = overlayRef.current?.getBoundingClientRect();
        const nodeRect = event.currentTarget.getBoundingClientRect();
        const existing = getThread(data.id);
        const size = existing?.geometry?.size ?? { ...DEFAULT_CHAT_WINDOW_SIZE };
        let geometry: WindowGeometry = existing?.geometry ?? {
          position: { x: 0, y: 0 },
          size: { ...size }
        };

        if (overlayRect) {
          const relativeLeft = nodeRect.left - overlayRect.left;
          const relativeRight = nodeRect.right - overlayRect.left;
          const relativeTop = nodeRect.top - overlayRect.top;
          const centerY = relativeTop + nodeRect.height / 2;
          const offset = 20;
          const canvasWidth = overlayRect.width;
          const canvasHeight = overlayRect.height;

          let x = relativeRight + offset;
          if (x + size.width > canvasWidth) {
            x = relativeLeft - offset - size.width;
          }
          if (x < 0) {
            x = Math.max(0, Math.min(relativeLeft, canvasWidth - size.width));
          }

          let y = centerY - size.height / 2;
          if (y + size.height > canvasHeight) {
            y = canvasHeight - size.height;
          }
          if (y < 0) {
            y = 0;
          }

          geometry = clampGeometry(
            {
              position: { x, y },
              size
            },
            { width: canvasWidth, height: canvasHeight }
          );
        }

        openChat({
          nodeId: data.id,
          nodeLabel: data.name ?? data.id ?? "Interface",
          geometry
        });
        return;
      }

      handleNodeClick(event);
    },
    [
      data.id,
      data.name,
      enableChatShortcut,
      getThread,
      handleNodeClick,
      openChat,
      overlayRef
    ]
  );
  return (
    <>
      <div
        style={containerStyle}
        data-voide-io-orientation={orientation}
        onClick={shouldRenderMenu ? handlePrimaryClick : undefined}
        onContextMenu={shouldRenderMenu ? handleContextMenu : undefined}
      >
        {inputs.map((port, index) => {
          const top = computeOffset(index, inputs.length);
          return (
            <React.Fragment key={port.port}>
              <Handle
                type="target"
                position={inputHandlePosition}
                id={`${data.id}:${port.port}`}
                style={{
                  ...handleStyle,
                  top
                }}
              />
              <span
                style={{
                  ...portLabelBaseStyle,
                  top,
                  left: inputHandlePosition === Position.Left ? 20 : undefined,
                  right: inputHandlePosition === Position.Right ? 20 : undefined
                }}
              >
                IN
              </span>
            </React.Fragment>
          );
        })}
        <span>{data.name}</span>
        {outputs.map((port, index) => {
          const top = computeOffset(index, outputs.length);
          return (
            <React.Fragment key={port.port}>
              <Handle
                type="source"
                position={outputHandlePosition}
                id={`${data.id}:${port.port}`}
                style={{
                  ...handleStyle,
                  top
                }}
              />
              <span
                style={{
                  ...portLabelBaseStyle,
                  top,
                  left: outputHandlePosition === Position.Left ? 20 : undefined,
                  right: outputHandlePosition === Position.Right ? 20 : undefined
                }}
              >
                OUT
              </span>
            </React.Fragment>
          );
        })}
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
            onOpenMemorySubMenu={
              moduleCategory === "memory" ? openMemorySubWindow : undefined
            }
          />
        </ContextWindow>
      ) : null}
      {moduleCategory === "memory"
        ? MEMORY_SUB_MENUS.map((menu) => {
            const subWindow = memorySubWindows[menu.key];
            if (!subWindow) {
              return null;
            }
            return (
              <ContextWindow
                key={`${data.id}-${menu.key}`}
                title={`${data.name} • ${menu.label}`}
                open={subWindow.open}
                position={subWindow.geometry.position}
                size={subWindow.geometry.size}
                minimized={subWindow.minimized}
                onRequestClose={handleMemorySubWindowClose(menu.key)}
                onToggleMinimize={handleMemorySubWindowToggleMinimize(menu.key)}
                onUpdate={handleMemorySubWindowUpdate(menu.key)}
                minSize={memorySubWindowMinSize}
               >
                <div />
              </ContextWindow>
            );
          })
        : null}
      {editMenu ? (
        <EditMenu
          position={{ left: editMenu.left, top: editMenu.top }}
          items={editMenuItems}
        />
      ) : null}
    </>
  );
}

