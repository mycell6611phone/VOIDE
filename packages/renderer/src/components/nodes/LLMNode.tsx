import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState
} from "react";
import { Handle, Position, type NodeProps } from "reactflow";
import type { NodeDef } from "@voide/shared";
import ContextWindow from "../ContextWindow";
import EditMenu, {
  EDIT_MENU_DATA_ATTRIBUTE,
  EDIT_MENU_HEIGHT,
  EDIT_MENU_ITEMS,
  EDIT_MENU_WIDTH,
  type EditMenuItemLabel
} from "../EditMenu";
import {
  CanvasViewport,
  ContextWindowRect,
  CONTEXT_WINDOW_MIN_HEIGHT,
  CONTEXT_WINDOW_MIN_WIDTH,
  CONTEXT_WINDOW_PADDING,
  constrainRectToBounds,
  type WindowGeometry
} from "../contextWindowUtils";
import { deriveLLMDisplayName, useFlowStore } from "../../state/flowStore";
import models from "./models.json";
import {
  readNodeOrientation,
  toggleNodeOrientationParams
} from "./orientation";

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

const fieldLabelStyle: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 600,
  color: "#b91c1c",
  textTransform: "uppercase",
  letterSpacing: 0.4
};

const inputStyle: React.CSSProperties = {
  borderRadius: 8,
  border: "1px solid rgba(244, 63, 94, 0.35)",
  background: "#ffffff",
  color: "#7f1d1d",
  fontWeight: 500,
  fontSize: 13,
  padding: "8px 10px",
  boxShadow: "0 1px 2px rgba(244, 63, 94, 0.12)",
  outline: "none"
};

const helperTextStyle: React.CSSProperties = {
  fontSize: 11,
  color: "#be123c"
};

const fieldGroupStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 4
};

const checkboxWrapperStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  fontSize: 12,
  fontWeight: 500,
  color: "#7f1d1d",
  cursor: "pointer"
};

const checkboxInputStyle: React.CSSProperties = {
  width: 16,
  height: 16,
  accentColor: "#dc2626",
  cursor: "pointer"
};

const gridRowStyle: React.CSSProperties = {
  display: "grid",
  gap: 12,
  gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))"
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

const srOnlyStyle: React.CSSProperties = {
  position: "absolute",
  width: 1,
  height: 1,
  padding: 0,
  margin: -1,
  overflow: "hidden",
  clip: "rect(0, 0, 0, 0)",
  whiteSpace: "nowrap",
  border: 0
};

const DEFAULT_WINDOW_WIDTH = 360;
const DEFAULT_WINDOW_HEIGHT = 380;
const APPROX_THRESHOLD = 0.5;
const MENU_WIDTH = EDIT_MENU_WIDTH;
const MENU_HEIGHT = EDIT_MENU_HEIGHT;

const editMenuBaseStyle: React.CSSProperties = {
  position: "fixed",
  minWidth: MENU_WIDTH,
  background: "#fef2f2",
  border: "1px solid rgba(220, 38, 38, 0.25)",
  borderRadius: 12,
  boxShadow: "0 18px 36px rgba(220, 38, 38, 0.22)",
  padding: 6,
  display: "flex",
  flexDirection: "column",
  gap: 2,
  zIndex: 170,
  pointerEvents: "auto"
};

const editMenuItemStyle: React.CSSProperties = {
  padding: "8px 12px",
  borderRadius: 8,
  border: "none",
  background: "transparent",
  color: "#7f1d1d",
  fontWeight: 600,
  fontSize: 13,
  textAlign: "left" as const,
  cursor: "pointer",
  transition: "background 120ms ease, transform 120ms ease"
};
const disabledEditMenuItemStyle: React.CSSProperties = {
  ...editMenuItemStyle,
  color: "rgba(127, 29, 29, 0.4)",
  cursor: "not-allowed"
};
const MIN_INPUT_TOKENS = 256;
const MIN_RESPONSE_TOKENS = 16;

const computeOffset = (index: number, total: number) =>
  `${((index + 1) / (total + 1)) * 100}%`;

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

type RelativeAnchor = {
  left: number;
  top: number;
  right: number;
  bottom: number;
};

type BackendOption = "llama.cpp" | "gpt4all" | "ollama";

type EditMenuState = {
  left: number;
  top: number;
  clientX: number;
  clientY: number;
  nodeId: string;
};

const EDIT_MENU_SELECTOR = `[${EDIT_MENU_DATA_ATTRIBUTE}]`;

const BACKEND_OPTIONS: BackendOption[] = ["llama.cpp", "gpt4all", "ollama"];

type ModelProfile = {
  context: number;
  backend: BackendOption;
  temperature: number;
  topP: number;
  topK: number;
  minP: number;
};

type ModelEntry = {
  order?: string;
  name?: string;
  filename?: string;
  type?: string;
  parameters?: string;
  ramrequired?: string;
};

type ModelOption = {
  id: string;
  label: string;
  model: ModelEntry;
  profile: ModelProfile;
};

const DEFAULT_PROFILE: ModelProfile = {
  context: 4096,
  backend: "llama.cpp",
  temperature: 0.7,
  topP: 0.95,
  topK: 40,
  minP: 0.1
};

const MODEL_TYPE_PROFILES: Record<string, ModelProfile> = {
  qwen2: {
    context: 32768,
    backend: "llama.cpp",
    temperature: 0.4,
    topP: 0.9,
    topK: 40,
    minP: 0.05
  },
  llama3: {
    context: 8192,
    backend: "llama.cpp",
    temperature: 0.7,
    topP: 0.95,
    topK: 45,
    minP: 0.1
  },
  deepseek: {
    context: 8192,
    backend: "llama.cpp",
    temperature: 0.3,
    topP: 0.92,
    topK: 40,
    minP: 0.06
  },
  mistral: {
    context: 8192,
    backend: "llama.cpp",
    temperature: 0.65,
    topP: 0.92,
    topK: 40,
    minP: 0.08
  },
  falcon: {
    context: 4096,
    backend: "gpt4all",
    temperature: 0.6,
    topP: 0.9,
    topK: 40,
    minP: 0.08
  },
  llama2: {
    context: 4096,
    backend: "llama.cpp",
    temperature: 0.7,
    topP: 0.94,
    topK: 40,
    minP: 0.1
  },
  llama: {
    context: 4096,
    backend: "llama.cpp",
    temperature: 0.7,
    topP: 0.94,
    topK: 40,
    minP: 0.1
  },
  mpt: {
    context: 8192,
    backend: "gpt4all",
    temperature: 0.65,
    topP: 0.9,
    topK: 38,
    minP: 0.08
  },
  "phi-3": {
    context: 8192,
    backend: "ollama",
    temperature: 0.55,
    topP: 0.9,
    topK: 32,
    minP: 0.06
  },
  openllama: {
    context: 4096,
    backend: "llama.cpp",
    temperature: 0.65,
    topP: 0.92,
    topK: 40,
    minP: 0.08
  },
  replit: {
    context: 4096,
    backend: "gpt4all",
    temperature: 0.75,
    topP: 0.9,
    topK: 40,
    minP: 0.1
  },
  starcoder: {
    context: 8192,
    backend: "ollama",
    temperature: 0.4,
    topP: 0.95,
    topK: 60,
    minP: 0.05
  },
  bert: {
    context: 512,
    backend: "gpt4all",
    temperature: 0.5,
    topP: 0.9,
    topK: 20,
    minP: 0.05
  }
};

const RAW_MODELS = models as ModelEntry[];

const MODEL_OPTIONS: ModelOption[] = RAW_MODELS.map((model, index) => {
  const baseId = model.filename ?? model.order ?? `model-${index}`;
  const sanitized = (baseId ?? `model-${index}`).replace(/\s+/g, "-").toLowerCase();
  const id = sanitized.startsWith("model:") ? sanitized : `model:${sanitized}`;
  const label = model.name ?? baseId ?? id;
  const typeKey = (model.type ?? "").toLowerCase();
  const profileSource = MODEL_TYPE_PROFILES[typeKey] ?? DEFAULT_PROFILE;
  const profile: ModelProfile = { ...profileSource };
  return { id, label, model, profile };
});

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

const rectToGeometry = (rect: ContextWindowRect): WindowGeometry => ({
  position: { x: rect.left, y: rect.top },
  size: { width: rect.width, height: rect.height }
});

const geometryToRect = (geometry: WindowGeometry): ContextWindowRect => ({
  left: geometry.position.x,
  top: geometry.position.y,
  width: geometry.size.width,
  height: geometry.size.height
});

const geometriesApproximatelyEqual = (
  a: WindowGeometry | null,
  b: WindowGeometry | null
) =>
  rectsApproximatelyEqual(
    a ? geometryToRect(a) : null,
    b ? geometryToRect(b) : null
  );

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

  return constrainRectToBounds({ left, top, width, height }, canvasRect);
};

export default function LLMNode({ data }: NodeProps<NodeDef>) {
  const inputs = data.in ?? [];
  const outputs = data.out ?? [];
  const orientation = useMemo(
    () => readNodeOrientation(data.params),
    [data.params]
  );
  const inputHandlePosition =
    orientation === "reversed" ? Position.Right : Position.Left;
  const outputHandlePosition =
    orientation === "reversed" ? Position.Left : Position.Right;
  const nodeRef = useRef<HTMLDivElement | null>(null);
  const [canvasRect, setCanvasRect] = useState<CanvasViewport | null>(null);
  const [windowGeometry, setWindowGeometry] = useState<WindowGeometry | null>(null);
  const [isWindowOpen, setIsWindowOpen] = useState(false);
  const [isDocked, setIsDocked] = useState(false);
  const [editMenu, setEditMenu] = useState<EditMenuState | null>(null);
  const [isMinimized, setIsMinimized] = useState(false);
  const anchorSnapshot = useRef<RelativeAnchor | null>(null);

  const {
    updateNodeParams,
    copyNode,
    cutNode,
    deleteNode,
    pasteClipboard,
    clipboard: clipboardItem
  } = useFlowStore((state) => ({
    updateNodeParams: state.updateNodeParams,
    copyNode: state.copyNode,
    cutNode: state.cutNode,
    deleteNode: state.deleteNode,
    pasteClipboard: state.pasteClipboard,
    clipboard: state.clipboard
  }));

  const params = (data.params ?? {}) as Record<string, unknown>;
  const canPasteNode = clipboardItem?.kind === "node";
  const canToggleOrientation = inputs.length > 0 || outputs.length > 0;

  const editMenuItems = useMemo(
    () =>
      EDIT_MENU_ITEMS.map((label) => ({
        label,
        disabled:
          label === "Paste"
            ? !canPasteNode
            : label === "Reverse Inputs"
              ? !canToggleOrientation
              : false
      })),
    [canPasteNode, canToggleOrientation]
  );

  const updateParams = useCallback(
    (updates: Record<string, unknown>) => {
      if (!updateNodeParams) return;
      updateNodeParams(data.id, (previous) => ({
        ...(previous ?? {}),
        ...updates
      }));
    },
    [data.id, updateNodeParams]
  );

  const selectedModelIdParam = useMemo(() => {
    const candidates = [
      typeof params.modelId === "string" ? params.modelId : "",
      typeof params.model_id === "string" ? params.model_id : ""
    ];
    for (const candidate of candidates) {
      const trimmed = candidate.trim();
      if (trimmed) {
        return trimmed;
      }
    }
    return "";
  }, [params.modelId, params.model_id]);

  const selectedModel = useMemo(() => {
    if (!selectedModelIdParam) {
      return null;
    }
    const match = MODEL_OPTIONS.find((option) => option.id === selectedModelIdParam);
    return match ?? null;
  }, [selectedModelIdParam]);

  const resolvedModelId = selectedModelIdParam;
  const contextLimit = selectedModel?.profile.context ?? DEFAULT_PROFILE.context;

  const nodeTitle = useMemo(() => {
    const enrichedParams: Record<string, unknown> = {
      ...params
    };
    if (selectedModelIdParam) {
      enrichedParams.modelId = selectedModelIdParam;
      enrichedParams["model_id"] = selectedModelIdParam;
    }
    const derived = deriveLLMDisplayName(enrichedParams, MODEL_OPTIONS);
    if (derived) {
      return derived;
    }
    if (selectedModelIdParam) {
      const fallback = selectedModelIdParam.replace(/^model:/i, "").trim();
      if (fallback) {
        return fallback;
      }
    }
    return "LLM";
  }, [params, selectedModelIdParam]);

  useEffect(() => {
    if (typeof params.modelId === "string" || typeof params.model_id === "string") return;
    if (!selectedModel) return;
    const profile = selectedModel.profile;
    const maxResponse = Math.min(profile.context, 1024);
    updateParams({
      modelId: selectedModel.id,
      model_id: selectedModel.id,
      adapter: profile.backend,
      maxInputTokens: profile.context,
      maxResponseTokens: maxResponse,
      maxTokens: maxResponse,
      temperature: profile.temperature,
      topP: profile.topP,
      topK: profile.topK,
      minP: profile.minP
    });
  }, [params.modelId, params.model_id, selectedModel, updateParams]);

  const adapterValue =
    typeof params.adapter === "string"
      ? params.adapter
      : selectedModel?.profile.backend ?? DEFAULT_PROFILE.backend;

  const includeRawInput =
    typeof params.includeRawInput === "boolean" ? params.includeRawInput : false;

  const storedMaxInput =
    typeof params.maxInputTokens === "number"
      ? params.maxInputTokens
      : contextLimit;

  const safeMaxInputTokens = clamp(
    Math.round(storedMaxInput),
    MIN_INPUT_TOKENS,
    Math.max(MIN_INPUT_TOKENS, contextLimit)
  );

  const storedMaxTokens =
    typeof params.maxResponseTokens === "number"
      ? params.maxResponseTokens
      : typeof params.maxTokens === "number"
      ? params.maxTokens
      : Math.min(contextLimit, 1024);

  const safeMaxResponseTokens = clamp(
    Math.round(storedMaxTokens),
    MIN_RESPONSE_TOKENS,
    safeMaxInputTokens
  );

  const temperatureValue =
    typeof params.temperature === "number"
      ? params.temperature
      : selectedModel?.profile.temperature ?? DEFAULT_PROFILE.temperature;

  const topPValue =
    typeof params.topP === "number"
      ? params.topP
      : selectedModel?.profile.topP ?? DEFAULT_PROFILE.topP;

  const topKValue =
    typeof params.topK === "number"
      ? params.topK
      : selectedModel?.profile.topK ?? DEFAULT_PROFILE.topK;

  const minPValue =
    typeof params.minP === "number"
      ? params.minP
      : selectedModel?.profile.minP ?? DEFAULT_PROFILE.minP;

  const syncCanvasRect = useCallback((viewport: CanvasViewport) => {
    setCanvasRect((previous) =>
      viewportsApproximatelyEqual(previous, viewport) ? previous : viewport
    );
  }, []);

  const gatherGeometry = useCallback(() => {
    const element = nodeRef.current;
    if (!element) return null;
    const canvasElement = element.closest(".react-flow") as HTMLElement | null;
    if (!canvasElement) return null;
    return {
      canvasMetrics: toCanvasViewport(canvasElement.getBoundingClientRect()),
      anchorBounds: element.getBoundingClientRect()
    };
  }, []);

  const handleModelChange = useCallback(
    (event: React.ChangeEvent<HTMLSelectElement>) => {
      const nextId = event.target.value.trim();
      if (!nextId) {
        const defaultMax = Math.min(DEFAULT_PROFILE.context, 1024);
        updateParams({
          modelId: "",
          model_id: "",
          adapter: DEFAULT_PROFILE.backend,
          maxInputTokens: DEFAULT_PROFILE.context,
          maxResponseTokens: defaultMax,
          maxTokens: defaultMax,
          temperature: DEFAULT_PROFILE.temperature,
          topP: DEFAULT_PROFILE.topP,
          topK: DEFAULT_PROFILE.topK,
          minP: DEFAULT_PROFILE.minP
        });
        return;
      }
      const nextModel = MODEL_OPTIONS.find((option) => option.id === nextId);
      if (!nextModel) {
        updateParams({ modelId: nextId, model_id: nextId });
        return;
      }
      const maxResponse = Math.min(nextModel.profile.context, 1024);
      updateParams({
        modelId: nextModel.id,
        model_id: nextModel.id,
        adapter: nextModel.profile.backend,
        maxInputTokens: nextModel.profile.context,
        maxResponseTokens: maxResponse,
        maxTokens: maxResponse,
        temperature: nextModel.profile.temperature,
        topP: nextModel.profile.topP,
        topK: nextModel.profile.topK,
        minP: nextModel.profile.minP
      });
    },
    [updateParams]
  );

  const handleBackendChange = useCallback(
    (event: React.ChangeEvent<HTMLSelectElement>) => {
      updateParams({ adapter: event.target.value });
    },
    [updateParams]
  );

  const commitMaxInputTokens = useCallback(
    (value: number) => {
      const clampedValue = clamp(
        value,
        MIN_INPUT_TOKENS,
        Math.max(MIN_INPUT_TOKENS, contextLimit)
      );
      const adjustedResponse = Math.min(safeMaxResponseTokens, clampedValue);
      updateParams({
        maxInputTokens: clampedValue,
        maxResponseTokens: adjustedResponse,
        maxTokens: adjustedResponse
      });
    },
    [contextLimit, safeMaxResponseTokens, updateParams]
  );

  const commitMaxResponseTokens = useCallback(
    (value: number) => {
      const clampedValue = clamp(value, MIN_RESPONSE_TOKENS, safeMaxInputTokens);
      updateParams({
        maxResponseTokens: clampedValue,
        maxTokens: clampedValue
      });
    },
    [safeMaxInputTokens, updateParams]
  );

  const handleTemperatureChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const raw = Number(event.target.value);
      if (Number.isNaN(raw)) return;
      updateParams({ temperature: clamp(raw, 0, 2) });
    },
    [updateParams]
  );

  const handleTopPChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const raw = Number(event.target.value);
      if (Number.isNaN(raw)) return;
      updateParams({ topP: clamp(raw, 0, 1) });
    },
    [updateParams]
  );

  const handleTopKChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const raw = Number(event.target.value);
      if (Number.isNaN(raw)) return;
      updateParams({ topK: clamp(Math.round(raw), 0, 320) });
    },
    [updateParams]
  );

  const handleMinPChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const raw = Number(event.target.value);
      if (Number.isNaN(raw)) return;
      updateParams({ minP: clamp(raw, 0, 1) });
    },
    [updateParams]
  );

  const openWindow = useCallback(() => {
    const geometry = gatherGeometry();
    if (!geometry) return;

    const { canvasMetrics, anchorBounds } = geometry;
    syncCanvasRect(canvasMetrics);
    anchorSnapshot.current = toRelativeAnchor(anchorBounds, canvasMetrics);

    setWindowGeometry((previous) => {
      const previousRect = previous ? geometryToRect(previous) : null;
      const baseline =
        previousRect ?? computeInitialWindowRect(anchorBounds, canvasMetrics);
      const constrained = constrainRectToBounds(baseline, canvasMetrics);
      if (previousRect && rectsApproximatelyEqual(previousRect, constrained)) {
        return previous;
      }
      return rectToGeometry(constrained);
    });

    setIsWindowOpen(true);
    setIsDocked(false);
    setEditMenu(null);
    setIsMinimized(false);
  }, [gatherGeometry, syncCanvasRect]);

  const handleContextMenu = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      event.preventDefault();
      event.stopPropagation();
      const geometry = gatherGeometry();
      if (!geometry) return;

      const { canvasMetrics, anchorBounds } = geometry;
      syncCanvasRect(canvasMetrics);
      anchorSnapshot.current = toRelativeAnchor(anchorBounds, canvasMetrics);

      setWindowGeometry((previous) => {
        const previousRect = previous ? geometryToRect(previous) : null;
        const baseline =
          previousRect ?? computeInitialWindowRect(anchorBounds, canvasMetrics);
        const constrained = constrainRectToBounds(baseline, canvasMetrics);
        if (previousRect && rectsApproximatelyEqual(previousRect, constrained)) {
          return previous;
        }
        return rectToGeometry(constrained);
      });
      setIsWindowOpen(false);
      setIsMinimized(false);

      const maxX = Math.max(
        CONTEXT_WINDOW_PADDING,
        canvasMetrics.width - MENU_WIDTH - CONTEXT_WINDOW_PADDING
      );
      const maxY = Math.max(
        CONTEXT_WINDOW_PADDING,
        canvasMetrics.height - MENU_HEIGHT - CONTEXT_WINDOW_PADDING
      );
      const clickX = clamp(
        event.clientX - canvasMetrics.left,
        CONTEXT_WINDOW_PADDING,
        maxX
      );
      const clickY = clamp(
        event.clientY - canvasMetrics.top,
        CONTEXT_WINDOW_PADDING,
        maxY
      );

      const nodeLeft = anchorBounds.left - canvasMetrics.left;
      const nodeRight = nodeLeft + anchorBounds.width;
      const nodeTop = anchorBounds.top - canvasMetrics.top;
      const nodeCenterY = nodeTop + anchorBounds.height / 2;
      const spaceRight =
        canvasMetrics.width - nodeRight - CONTEXT_WINDOW_PADDING;
      const spaceLeft = nodeLeft - CONTEXT_WINDOW_PADDING;
      const sideOffset = 12;

      let menuX =
        spaceRight >= spaceLeft
          ? nodeRight + sideOffset
          : nodeLeft - MENU_WIDTH - sideOffset;
      menuX = clamp(menuX, CONTEXT_WINDOW_PADDING, maxX);

      let menuY = nodeCenterY - MENU_HEIGHT / 2;
      menuY = clamp(menuY, CONTEXT_WINDOW_PADDING, maxY);

      setEditMenu({
        left: canvasMetrics.left + menuX,
        top: canvasMetrics.top + menuY,
        clientX: event.clientX,
        clientY: event.clientY,
        nodeId: data.id
      });
    },
    [data.id, gatherGeometry, syncCanvasRect]
  );

  const handleDockIconOpen = useCallback(() => {
    openWindow();
  }, [openWindow]);

  const handleEditMenuSelect = useCallback(
    (label: EditMenuItemLabel) => {
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
        case "Paste":
          if (canPasteNode) {
            pasteClipboard("node");
          }
          break;
        case "Reverse Inputs":
          updateNodeParams?.(data.id, (previous) =>
            toggleNodeOrientationParams(previous)
          );
          break;
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
      pasteClipboard,
      updateNodeParams
    ]
  );

  const handleNodeClick = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      if (event.button !== 0) {
        return;
      }

      const target = event.target as HTMLElement | null;
      if (target?.closest(".react-flow__handle")) return;
      event.stopPropagation();
      openWindow();
    },
    [openWindow]
  );

  const handleClose = useCallback(() => {
    setIsWindowOpen(false);
    setIsDocked(true);
    setIsMinimized(false);
  }, []);

  const handleToggleMinimize = useCallback(() => {
    setIsWindowOpen(true);
    setIsDocked(false);
    setIsMinimized((previous) => !previous);
  }, []);

  const handleGeometryUpdate = useCallback((next: WindowGeometry) => {
    setWindowGeometry((previous) =>
      geometriesApproximatelyEqual(previous, next) ? previous : next
    );
  }, []);

  useEffect(() => {
    if (!(isWindowOpen || isDocked)) return;

    const updateMetrics = () => {
      const geometry = gatherGeometry();
      if (!geometry) return;
      const { canvasMetrics, anchorBounds } = geometry;
      syncCanvasRect(canvasMetrics);
      anchorSnapshot.current = toRelativeAnchor(anchorBounds, canvasMetrics);
      setWindowGeometry((previous) => {
        if (!previous) return previous;
        const previousRect = geometryToRect(previous);
        const constrained = constrainRectToBounds(previousRect, canvasMetrics);
        return rectsApproximatelyEqual(previousRect, constrained)
          ? previous
          : rectToGeometry(constrained);
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
    if (!isWindowOpen) return;

    const element = nodeRef.current;
    if (!element) return;

    const handleAnchorShift = () => {
      const geometry = gatherGeometry();
      if (!geometry) return;
      const { canvasMetrics, anchorBounds } = geometry;
      syncCanvasRect(canvasMetrics);
      const nextAnchor = toRelativeAnchor(anchorBounds, canvasMetrics);
      const previousAnchor = anchorSnapshot.current;
      anchorSnapshot.current = nextAnchor;

      if (!previousAnchor) return;

      const deltaX = nextAnchor.left - previousAnchor.left;
      const deltaY = nextAnchor.top - previousAnchor.top;

      if (Math.abs(deltaX) < 0.2 && Math.abs(deltaY) < 0.2) return;

      setWindowGeometry((previous) => {
        if (!previous) return previous;
        const previousRect = geometryToRect(previous);
        const moved = {
          ...previousRect,
          left: previousRect.left + deltaX,
          top: previousRect.top + deltaY
        };
        const constrained = constrainRectToBounds(moved, canvasMetrics);
        return rectsApproximatelyEqual(previousRect, constrained)
          ? previous
          : rectToGeometry(constrained);
      });
    };

    const observer = new MutationObserver(handleAnchorShift);
    observer.observe(element, {
      attributes: true,
      attributeFilter: ["style", "class"]
    });

    return () => observer.disconnect();
  }, [gatherGeometry, isWindowOpen, syncCanvasRect]);

  useEffect(() => {
    if (!editMenu) return;
    const handleDismiss = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;

      if (target?.closest?.("[data-node-edit-menu]")) return;

      setEditMenu(null);
    };
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setEditMenu(null);
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

  const iconVisible = isDocked && !!windowGeometry;

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
      <div
        ref={nodeRef}
        style={containerStyle}
        data-voide-io-orientation={orientation}
        onContextMenu={handleContextMenu}
        onClick={handleNodeClick}
      >
        {inputs.map((port, index) => (
          <Handle
            key={port.port}
            type="target"
            position={inputHandlePosition}
            id={`${data.id}:${port.port}`}
            style={{
              ...handleStyle,
              top: computeOffset(index, inputs.length)
            }}
          />
        ))}

        <span>{nodeTitle}</span>

        {outputs.map((port, index) => (
          <Handle
            key={port.port}
            type="source"
            position={outputHandlePosition}
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

      {editMenu ? (
        <div
          data-node-edit-menu
          style={{ ...editMenuBaseStyle, left: editMenu.left, top: editMenu.top }}
        >
          {editMenuItems.map(({ label, disabled }) => (
            <button
              key={label}
              type="button"
              disabled={disabled}
              style={
                disabled ? disabledEditMenuItemStyle : editMenuItemStyle
              }
              onMouseDown={(event) => event.stopPropagation()}
              onClick={(event) => {
                event.stopPropagation();
                if (disabled) {
                  return;
                }
                handleEditMenuSelect(label);
              }}
              onMouseEnter={(event) => {
                if (disabled) {
                  return;
                }
                (event.currentTarget as HTMLButtonElement).style.background =
                  "rgba(248, 113, 113, 0.18)";
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

      {canvasRect && windowGeometry && (
        <ContextWindow
          title={`${nodeTitle} Options`}
          open={isWindowOpen}
          position={windowGeometry.position}
          size={windowGeometry.size}
          minimized={isMinimized}
          onRequestClose={handleClose}
          onToggleMinimize={handleToggleMinimize}
          onUpdate={handleGeometryUpdate}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <span style={srOnlyStyle}>Quick Actions</span>
            <div>
              <div style={sectionTitleStyle}>Model Selection</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div style={fieldGroupStyle}>
                  <label style={fieldLabelStyle} htmlFor={`${data.id}-model`}>
                    LLM Model
                  </label>
                  <select
                    id={`${data.id}-model`}
                    value={resolvedModelId}
                    onChange={handleModelChange}
                    style={inputStyle}
                  >
                    <option value="">Select a model</option>
                    {MODEL_OPTIONS.map((option) => (
                      <option key={option.id} value={option.id}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div style={fieldGroupStyle}>
                  <label style={fieldLabelStyle} htmlFor={`${data.id}-backend`}>
                    Backend
                  </label>
                  <select
                    id={`${data.id}-backend`}
                    value={adapterValue}
                    onChange={handleBackendChange}
                    style={inputStyle}
                  >
                    {BACKEND_OPTIONS.map((backend) => (
                      <option key={backend} value={backend}>
                        {backend}
                      </option>
                    ))}
                  </select>
                  <label
                    style={checkboxWrapperStyle}
                    htmlFor={`${data.id}-include-raw-input`}
                  >
                    <input
                      id={`${data.id}-include-raw-input`}
                      type="checkbox"
                      checked={includeRawInput}
                      onChange={(event) =>
                        updateParams({ includeRawInput: event.target.checked })
                      }
                      style={checkboxInputStyle}
                    />
                    Forward input with response
                  </label>
                  <span style={helperTextStyle}>
                    Runtime adapter used to communicate with this module.
                  </span>
                  <span style={helperTextStyle}>
                    When enabled, downstream nodes receive the full prompt
                    alongside the model output.
                  </span>
                </div>
              </div>
            </div>

            <div>
              <div style={sectionTitleStyle}>Token Limits</div>
              <div style={gridRowStyle}>
                <div style={fieldGroupStyle}>
                  <label style={fieldLabelStyle} htmlFor={`${data.id}-input-tokens`}>
                    Max Input Tokens
                  </label>
                  <input
                    id={`${data.id}-input-tokens`}
                    type="number"
                    min={MIN_INPUT_TOKENS}
                    max={Math.max(MIN_INPUT_TOKENS, contextLimit)}
                    step={128}
                    value={safeMaxInputTokens}
                    onChange={(event) => {
                      const raw = Number(event.target.value);
                      if (Number.isNaN(raw)) return;
                      commitMaxInputTokens(raw);
                    }}
                    style={inputStyle}
                  />
                  <span style={helperTextStyle}>
                    Up to {contextLimit.toLocaleString()} tokens based on the model.
                  </span>
                </div>
                <div style={fieldGroupStyle}>
                  <label style={fieldLabelStyle} htmlFor={`${data.id}-response-tokens`}>
                    Max Response Length
                  </label>
                  <input
                    id={`${data.id}-response-tokens`}
                    type="number"
                    min={MIN_RESPONSE_TOKENS}
                    max={safeMaxInputTokens}
                    step={32}
                    value={safeMaxResponseTokens}
                    onChange={(event) => {
                      const raw = Number(event.target.value);
                      if (Number.isNaN(raw)) return;
                      commitMaxResponseTokens(raw);
                    }}
                    style={inputStyle}
                  />
                  <span style={helperTextStyle}>
                    Cannot exceed max input tokens for this module.
                  </span>
                </div>
              </div>
            </div>

            <div>
              <div style={sectionTitleStyle}>Sampling Controls</div>
              <div style={gridRowStyle}>
                <div style={fieldGroupStyle}>
                  <label style={fieldLabelStyle} htmlFor={`${data.id}-temperature`}>
                    Temperature
                  </label>
                  <input
                    id={`${data.id}-temperature`}
                    type="number"
                    min={0}
                    max={2}
                    step={0.05}
                    value={Number(temperatureValue.toFixed(2))}
                    onChange={handleTemperatureChange}
                    style={inputStyle}
                  />
                </div>
                <div style={fieldGroupStyle}>
                  <label style={fieldLabelStyle} htmlFor={`${data.id}-top-p`}>
                    Top P
                  </label>
                  <input
                    id={`${data.id}-top-p`}
                    type="number"
                    min={0}
                    max={1}
                    step={0.01}
                    value={Number(topPValue.toFixed(2))}
                    onChange={handleTopPChange}
                    style={inputStyle}
                  />
                </div>
                <div style={fieldGroupStyle}>
                  <label style={fieldLabelStyle} htmlFor={`${data.id}-top-k`}>
                    Top K
                  </label>
                  <input
                    id={`${data.id}-top-k`}
                    type="number"
                    min={0}
                    max={320}
                    step={1}
                    value={Math.round(topKValue)}
                    onChange={handleTopKChange}
                    style={inputStyle}
                  />
                </div>
                <div style={fieldGroupStyle}>
                  <label style={fieldLabelStyle} htmlFor={`${data.id}-min-p`}>
                    Min P
                  </label>
                  <input
                    id={`${data.id}-min-p`}
                    type="number"
                    min={0}
                    max={1}
                    step={0.01}
                    value={Number(minPValue.toFixed(2))}
                    onChange={handleMinPChange}
                    style={inputStyle}
                  />
                </div>
              </div>
            </div>

            <div>
              <div style={sectionTitleStyle}>Model Summary</div>
              {selectedModel ? (
                <div style={{ display: "grid", gap: 10 }}>
                  <div style={summaryRowStyle}>
                    <span style={summaryLabelStyle}>Model</span>
                    <span style={summaryValueStyle}>{selectedModel.label}</span>
                  </div>
                  {selectedModel.model.parameters ? (
                    <div style={summaryRowStyle}>
                      <span style={summaryLabelStyle}>Parameters</span>
                      <span style={summaryValueStyle}>
                        {selectedModel.model.parameters}
                      </span>
                    </div>
                  ) : null}
                  {selectedModel.model.ramrequired ? (
                    <div style={summaryRowStyle}>
                      <span style={summaryLabelStyle}>Suggested RAM</span>
                      <span style={summaryValueStyle}>
                        {selectedModel.model.ramrequired} GB
                      </span>
                    </div>
                  ) : null}
                </div>
              ) : (
                <div style={summaryRowStyle}>
                  <span style={summaryLabelStyle}>No model selected</span>
                  <span style={summaryValueStyle}>
                    Choose a model to configure backend and sampling parameters.
                  </span>
                </div>
              )}
            </div>
          </div>
        </ContextWindow>
      )}
    </>
  );
}

