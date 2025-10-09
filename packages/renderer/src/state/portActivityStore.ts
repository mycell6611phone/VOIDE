import { create } from "zustand";

const RESET_DELAY_MS = 1600;

export type PortActivityStatus = "idle" | "input-active" | "output-active";

type PortKey = string;

interface PortActivityEntry {
  status: Exclude<PortActivityStatus, "idle">;
  lastEventAt: number;
}

interface PortActivityStore {
  portStates: Record<PortKey, PortActivityEntry>;
  recordInputActivity: (nodeId: string, portId: string, eventAt?: number) => void;
  recordOutputActivity: (nodeId: string, portId: string, eventAt?: number) => void;
  clearPortActivity: (key: PortKey, eventAt: number) => void;
  reset: () => void;
}

const createPortKey = (nodeId: string, portId: string): PortKey => `${nodeId}:${portId}`;

const coerceTimestamp = (value?: number) =>
  typeof value === "number" && Number.isFinite(value) ? value : Date.now();

export const usePortActivityStore = create<PortActivityStore>((set, get) => {
  const scheduleReset = (key: PortKey, eventAt: number) => {
    globalThis.setTimeout(() => {
      const { clearPortActivity } = get();
      clearPortActivity(key, eventAt);
    }, RESET_DELAY_MS);
  };

  const writeActivity = (
    key: PortKey,
    status: Exclude<PortActivityStatus, "idle">,
    eventAt?: number,
  ) => {
    const eventAtMs = coerceTimestamp(eventAt);
    set((state) => ({
      portStates: {
        ...state.portStates,
        [key]: { status, lastEventAt: eventAtMs }
      }
    }));
    scheduleReset(key, eventAtMs);
  };

  return {
    portStates: {},
    recordInputActivity: (nodeId, portId, eventAt) =>
      writeActivity(createPortKey(nodeId, portId), "input-active", eventAt),
    recordOutputActivity: (nodeId, portId, eventAt) =>
      writeActivity(createPortKey(nodeId, portId), "output-active", eventAt),
    clearPortActivity: (key, eventAt) => {
      set((state) => {
        const existing = state.portStates[key];
        if (!existing || existing.lastEventAt !== eventAt) {
          return state;
        }
        const next = { ...state.portStates };
        delete next[key];
        return { portStates: next };
      });
    },
    reset: () => set({ portStates: {} })
  };
});

export const PORT_ACTIVITY_RESET_DELAY_MS = RESET_DELAY_MS;

export const portActivityKey = createPortKey;

export const recordInputPortActivity = (nodeId: string, portId: string, eventAt?: number) => {
  usePortActivityStore.getState().recordInputActivity(nodeId, portId, eventAt);
};

export const recordOutputPortActivity = (nodeId: string, portId: string, eventAt?: number) => {
  usePortActivityStore.getState().recordOutputActivity(nodeId, portId, eventAt);
};

export const resetPortActivityStore = () => {
  usePortActivityStore.getState().reset();
};

export const selectPortStatus = (
  state: Pick<PortActivityStore, "portStates">,
  key: PortKey
): PortActivityStatus => state.portStates[key]?.status ?? "idle";

