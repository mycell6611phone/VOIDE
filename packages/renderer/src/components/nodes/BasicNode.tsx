import React, { useCallback, useMemo, useState } from "react";
import { Handle, Position, type NodeProps } from "reactflow";
import type { NodeDef } from "@voide/shared";
import ContextWindow from "../ContextWindow";
import ModuleOptionsContent, {
  type ModuleCategory,
  type ParamsUpdater
} from "../ModuleOptionsContent";
import { useCanvasBoundary } from "../CanvasBoundaryContext";
import {
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

  const handleContextMenu = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      if (!moduleCategory) {
        return;
      }
      event.preventDefault();
      event.stopPropagation();

      setMenuState((previous) => {
        const rect = canvasRef?.current?.getBoundingClientRect();
        if (!rect) {
          return { ...previous, open: true, minimized: false };
        }

        const pointerGeometry: WindowGeometry = {
          position: {
            x: event.clientX - rect.left + 12,
            y: event.clientY - rect.top + 12
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
    [canvasRef, moduleCategory]
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

  const shouldRenderMenu = Boolean(moduleCategory);

  return (
    <>
      <div
        style={containerStyle}
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
    </>
  );
}

