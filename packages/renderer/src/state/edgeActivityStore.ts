import { create } from "zustand";

export type EdgeTelemetryStatus = "idle" | "in-flight" | "success" | "error";

interface EdgeTelemetryEntry {
  status: Exclude<EdgeTelemetryStatus, "idle">;
  lastEventAt: number;
}

type EdgeId = string;

interface EdgeTelemetryStore {
  edgeStates: Record<EdgeId, EdgeTelemetryEntry>;
  beginTransfer: (edgeId: EdgeId, eventAt?: number) => number;
  resolveTransfer: (edgeId: EdgeId, eventAt: number, ok: boolean) => void;
  markError: (edgeId: EdgeId, eventAt?: number) => void;
  clearState: (edgeId: EdgeId, eventAt: number) => void;
  reset: () => void;
}

const TRANSFER_PROGRESS_MS = 240;
const SUCCESS_DECAY_MS = 1600;
const ERROR_DECAY_MS = 2200;

const schedule = (delay: number, callback: () => void) =>
  globalThis.setTimeout(callback, delay);

const coerceTimestamp = (value?: number) =>
  typeof value === "number" && Number.isFinite(value) ? value : Date.now();

export const useEdgeTelemetryStore = create<EdgeTelemetryStore>((set, get) => ({
  edgeStates: {},
  beginTransfer: (edgeId, eventAt) => {
    const eventAtMs = coerceTimestamp(eventAt);
    set((state) => ({
      edgeStates: {
        ...state.edgeStates,
        [edgeId]: {
          status: "in-flight",
          lastEventAt: eventAtMs,
        },
      },
    }));
    return eventAtMs;
  },
  resolveTransfer: (edgeId, eventAt, ok) => {
    const { edgeStates } = get();
    const current = edgeStates[edgeId];
    if (!current || current.lastEventAt !== eventAt) {
      return;
    }

    const settleStatus: EdgeTelemetryStatus = ok ? "success" : "error";
    const decay = ok ? SUCCESS_DECAY_MS : ERROR_DECAY_MS;

    set((state) => ({
      edgeStates: {
        ...state.edgeStates,
        [edgeId]: {
          status: settleStatus === "idle" ? "success" : settleStatus,
          lastEventAt: eventAt,
        },
      },
    }));

    schedule(decay, () => {
      get().clearState(edgeId, eventAt);
    });
  },
  markError: (edgeId, eventAt) => {
    const eventAtMs = coerceTimestamp(eventAt);
    set((state) => ({
      edgeStates: {
        ...state.edgeStates,
        [edgeId]: {
          status: "error",
          lastEventAt: eventAtMs,
        },
      },
    }));
    schedule(ERROR_DECAY_MS, () => {
      get().clearState(edgeId, eventAtMs);
    });
  },
  clearState: (edgeId, eventAt) => {
    set((state) => {
      const current = state.edgeStates[edgeId];
      if (!current || current.lastEventAt !== eventAt) {
        return state;
      }
      const next = { ...state.edgeStates };
      delete next[edgeId];
      return { edgeStates: next };
    });
  },
  reset: () => set({ edgeStates: {} }),
}));

export const EDGE_TRANSFER_PROGRESS_MS = TRANSFER_PROGRESS_MS;
export const EDGE_SUCCESS_DECAY_MS = SUCCESS_DECAY_MS;
export const EDGE_ERROR_DECAY_MS = ERROR_DECAY_MS;

export const getEdgeTelemetryStatus = (
  store: Pick<EdgeTelemetryStore, "edgeStates">,
  edgeId: EdgeId,
): EdgeTelemetryStatus => store.edgeStates[edgeId]?.status ?? "idle";

export const recordEdgeTransferSuccess = (edgeId: EdgeId, eventAt?: number) => {
  const startAt = useEdgeTelemetryStore.getState().beginTransfer(edgeId, eventAt);
  schedule(TRANSFER_PROGRESS_MS, () => {
    useEdgeTelemetryStore.getState().resolveTransfer(edgeId, startAt, true);
  });
};

export const recordEdgeTransferError = (edgeId: EdgeId, eventAt?: number) => {
  const startAt = useEdgeTelemetryStore.getState().beginTransfer(edgeId, eventAt);
  schedule(TRANSFER_PROGRESS_MS, () => {
    useEdgeTelemetryStore.getState().resolveTransfer(edgeId, startAt, false);
  });
};

export const markEdgeError = (edgeId: EdgeId, eventAt?: number) => {
  useEdgeTelemetryStore.getState().markError(edgeId, eventAt);
};

export const resetEdgeTelemetry = () => {
  useEdgeTelemetryStore.getState().reset();
};
