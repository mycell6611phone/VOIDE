import { create } from "zustand";
import type { NodeDef, PayloadT, PortDef } from "@voide/shared";
import type { ModuleTestRes } from "@voide/ipc";
import { voide } from "../voide";

type DropZoneRect = {
  left: number;
  top: number;
  right: number;
  bottom: number;
  width: number;
  height: number;
};

type ModuleTestSuccess = Extract<ModuleTestRes, { ok: true }>;
type ModuleTestFailure = Extract<ModuleTestRes, { ok: false }>;
export type ModuleTesterProgressEntry = ModuleTestSuccess["progress"] extends Array<infer Entry>
  ? Entry
  : never;
export type ModuleTesterLogEntry = ModuleTestSuccess["logs"] extends Array<infer Entry>
  ? Entry
  : never;

export type ModuleTesterOutput = ModuleTestSuccess["outputs"][number];

export type ModuleTesterInput = {
  port: string;
  label: string;
  availableTypes: string[];
  selectedType: string;
  value: string;
  error?: string;
};

export type ModuleTesterSession = {
  node: NodeDef;
  inputs: ModuleTesterInput[];
  outputs: ModuleTesterOutput[];
  progress: ModuleTesterProgressEntry[];
  logs: ModuleTesterLogEntry[];
  running: boolean;
  error?: string;
};

type ModuleTesterState = {
  dropZoneRect: DropZoneRect | null;
  canvasZoom: number;
  isDragging: boolean;
  isHovering: boolean;
  session: ModuleTesterSession | null;
  setDropZoneRect: (rect: DOMRectReadOnly | null) => void;
  setCanvasZoom: (zoom: number) => void;
  setDragging: (dragging: boolean) => void;
  setDropZoneHover: (hover: boolean) => void;
  isPointInsideDropZone: (x: number, y: number) => boolean;
  startSession: (node: NodeDef) => void;
  closeSession: () => void;
  updateInputValue: (port: string, value: string) => void;
  updateInputType: (port: string, type: string) => void;
  runTest: () => Promise<void>;
};

const cloneNode = (node: NodeDef): NodeDef => {
  try {
    return typeof structuredClone === "function"
      ? structuredClone(node)
      : (JSON.parse(JSON.stringify(node)) as NodeDef);
  } catch {
    return JSON.parse(JSON.stringify(node)) as NodeDef;
  }
};

const normalizeTypes = (ports: PortDef[]): string[][] =>
  ports.map((port) =>
    Array.isArray(port.types) && port.types.length > 0
      ? port.types
      : ["text"],
  );

const pickDefaultType = (types: string[]): string => {
  if (types.length === 0) {
    return "text";
  }
  if (types.includes("text")) {
    return "text";
  }
  return types[0];
};

const toInputState = (node: NodeDef): ModuleTesterInput[] => {
  const ports = Array.isArray(node.in) ? node.in : [];
  const typeMatrix = normalizeTypes(ports);
  return ports.map((port, index) => {
    const availableTypes = typeMatrix[index];
    return {
      port: port.port,
      label: port.port,
      availableTypes,
      selectedType: pickDefaultType(availableTypes),
      value: "",
    };
  });
};

const createSession = (node: NodeDef): ModuleTesterSession => ({
  node: cloneNode(node),
  inputs: toInputState(node),
  outputs: [],
  progress: [],
  logs: [],
  running: false,
});

const coerceRect = (rect: DOMRectReadOnly | null): DropZoneRect | null => {
  if (!rect) {
    return null;
  }
  return {
    left: rect.left,
    top: rect.top,
    right: rect.right,
    bottom: rect.bottom,
    width: rect.width,
    height: rect.height,
  };
};

const parseVector = (raw: string): number[] => {
  const trimmed = raw.trim();
  if (!trimmed) {
    return [];
  }
  try {
    const parsed = JSON.parse(trimmed);
    if (Array.isArray(parsed)) {
      return parsed.map((value) => Number(value)).filter((value) => Number.isFinite(value));
    }
  } catch {
    // fall back to comma-separated parsing
  }
  return trimmed
    .split(/[,\s]+/)
    .map((value) => Number(value))
    .filter((value) => Number.isFinite(value));
};

const buildPayload = (
  type: string,
  value: string,
): { payload: PayloadT | null; error?: string } => {
  const trimmedType = typeof type === "string" ? type.toLowerCase() : "text";
  const trimmedValue = value ?? "";
  switch (trimmedType) {
    case "json": {
      try {
        const parsed = trimmedValue.trim() ? JSON.parse(trimmedValue) : null;
        return { payload: { kind: "json", value: parsed } };
      } catch (error) {
        return { payload: null, error: "Provide valid JSON for this input." };
      }
    }
    case "messages": {
      try {
        const parsed = trimmedValue.trim() ? JSON.parse(trimmedValue) : [];
        if (!Array.isArray(parsed)) {
          throw new Error("Messages input must be an array.");
        }
        const messages = parsed.map((entry) => ({
          role: typeof entry?.role === "string" ? entry.role : "user",
          content: typeof entry?.content === "string" ? entry.content : String(entry?.content ?? ""),
        }));
        return { payload: { kind: "messages", messages } };
      } catch (error) {
        return { payload: null, error: "Provide a JSON array of { role, content } objects." };
      }
    }
    case "vector": {
      const values = parseVector(trimmedValue);
      if (values.length === 0) {
        return { payload: null, error: "Provide at least one numeric value." };
      }
      return { payload: { kind: "vector", values } };
    }
    case "metrics": {
      try {
        const parsed = trimmedValue.trim() ? JSON.parse(trimmedValue) : {};
        if (typeof parsed !== "object" || Array.isArray(parsed) || parsed === null) {
          throw new Error("Metrics payload must be an object.");
        }
        return { payload: { kind: "metrics", data: parsed as Record<string, number> } };
      } catch (error) {
        return { payload: null, error: "Provide a JSON object for metrics inputs." };
      }
    }
    case "code": {
      const firstLine = trimmedValue.split("\n", 1)[0] ?? "";
      const colonIndex = firstLine.indexOf(":");
      let language = "text";
      let body = trimmedValue;
      if (colonIndex > -1 && colonIndex < firstLine.length - 1) {
        language = firstLine.slice(0, colonIndex).trim() || "text";
        body = trimmedValue.slice(colonIndex + 1).trimStart();
      }
      return { payload: { kind: "code", language, text: body } };
    }
    case "file": {
      try {
        const parsed = trimmedValue.trim() ? JSON.parse(trimmedValue) : null;
        if (!parsed || typeof parsed !== "object") {
          throw new Error();
        }
        const path = typeof (parsed as any).path === "string" ? (parsed as any).path : "";
        const mime = typeof (parsed as any).mime === "string" ? (parsed as any).mime : "application/octet-stream";
        if (!path) {
          throw new Error();
        }
        return { payload: { kind: "file", path, mime } };
      } catch (error) {
        return { payload: null, error: "Provide JSON with { path, mime } for file inputs." };
      }
    }
    case "text":
    default:
      return { payload: { kind: "text", text: trimmedValue, rawInput: trimmedValue } };
  }
};

const normalizeInputs = (inputs: ModuleTesterInput[]): ModuleTesterInput[] =>
  inputs.map((input) => ({
    ...input,
    availableTypes: input.availableTypes.length > 0 ? input.availableTypes : ["text"],
    selectedType: input.availableTypes.length > 0 ? input.selectedType : "text",
  }));

export const useModuleTesterStore = create<ModuleTesterState>((set, get) => ({
  dropZoneRect: null,
  canvasZoom: 1,
  isDragging: false,
  isHovering: false,
  session: null,
  setDropZoneRect: (rect) => {
    set({ dropZoneRect: coerceRect(rect) });
  },
  setCanvasZoom: (zoom) => {
    if (!Number.isFinite(zoom)) {
      return;
    }
    set({ canvasZoom: zoom });
  },
  setDragging: (dragging) => {
    set((state) => ({
      isDragging: dragging,
      isHovering: dragging ? state.isHovering : false,
    }));
  },
  setDropZoneHover: (hover) => {
    set({ isHovering: hover });
  },
  isPointInsideDropZone: (x, y) => {
    const rect = get().dropZoneRect;
    if (!rect) {
      return false;
    }
    return x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom;
  },
  startSession: (node) => {
    set({ session: createSession(node) });
  },
  closeSession: () => {
    set({ session: null, isHovering: false, isDragging: false });
  },
  updateInputValue: (port, value) => {
    set((state) => {
      if (!state.session) {
        return state;
      }
      const nextInputs = state.session.inputs.map((input) =>
        input.port === port
          ? { ...input, value, error: undefined }
          : input,
      );
      return {
        ...state,
        session: {
          ...state.session,
          inputs: normalizeInputs(nextInputs),
        },
      };
    });
  },
  updateInputType: (port, type) => {
    set((state) => {
      if (!state.session) {
        return state;
      }
      const nextInputs = state.session.inputs.map((input) =>
        input.port === port
          ? { ...input, selectedType: type, error: undefined }
          : input,
      );
      return {
        ...state,
        session: {
          ...state.session,
          inputs: normalizeInputs(nextInputs),
        },
      };
    });
  },
  runTest: async () => {
    const { session } = get();
    if (!session || session.running) {
      return;
    }

    const payloads: Array<{ port: string; payload: PayloadT }> = [];
    let hasError = false;

    const nextInputs = session.inputs.map((input) => {
      const { payload, error } = buildPayload(input.selectedType, input.value);
      if (!payload || error) {
        hasError = true;
        return { ...input, error: error ?? "Unable to build payload." };
      }
      payloads.push({ port: input.port, payload });
      return { ...input, error: undefined };
    });

    if (hasError) {
      set((state) =>
        state.session
          ? {
              ...state,
              session: {
                ...state.session,
                inputs: normalizeInputs(nextInputs),
              },
            }
          : state,
      );
      return;
    }

    set((state) =>
      state.session
        ? {
            ...state,
            session: {
              ...state.session,
              inputs: normalizeInputs(nextInputs),
              running: true,
              error: undefined,
              outputs: [],
              progress: [],
              logs: [],
            },
          }
        : state,
    );

    try {
      const response = await voide.testModule(session.node, payloads);
      const applySuccess = (result: ModuleTestSuccess) => {
        set((state) =>
          state.session
            ? {
                ...state,
                session: {
                  ...state.session,
                  running: false,
                  error: undefined,
                  outputs: result.outputs ?? [],
                  progress: result.progress ?? [],
                  logs: result.logs ?? [],
                },
              }
            : state,
        );
      };
      const applyFailure = (result: ModuleTestFailure) => {
        set((state) =>
          state.session
            ? {
                ...state,
                session: {
                  ...state.session,
                  running: false,
                  error: result.error,
                  outputs: [],
                  progress: result.progress ?? [],
                  logs: result.logs ?? [],
                },
              }
            : state,
        );
      };

      if (response.ok) {
        applySuccess(response);
      } else {
        applyFailure(response);
      }
    } catch (error) {
      set((state) =>
        state.session
          ? {
              ...state,
              session: {
                ...state.session,
                running: false,
                error: error instanceof Error ? error.message : String(error),
              },
            }
          : state,
      );
    }
  },
}));

export const moduleTesterStore = useModuleTesterStore;
