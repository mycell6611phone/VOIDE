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
  recordInputActivity: (nodeId: string, portId: string) => void;
  recordOutputActivity: (nodeId: string, portId: string) => void;
  clearPortActivity: (key: PortKey, eventAt: number) => void;
  reset: () => void;
}

const createPortKey = (nodeId: string, portId: string): PortKey => `${nodeId}:${portId}`;

export const usePortActivityStore = create<PortActivityStore>((set, get) => {
  const scheduleReset = (key: PortKey, eventAt: number) => {
    globalThis.setTimeout(() => {
      const { clearPortActivity } = get();
      clearPortActivity(key, eventAt);
    }, RESET_DELAY_MS);
  };

  const writeActivity = (key: PortKey, status: Exclude<PortActivityStatus, "idle">) => {
    const eventAt = Date.now();
    set((state) => ({
      portStates: {
        ...state.portStates,
        [key]: { status, lastEventAt: eventAt }
      }
    }));
    scheduleReset(key, eventAt);
  };

  return {
    portStates: {},
    recordInputActivity: (nodeId, portId) => writeActivity(createPortKey(nodeId, portId), "input-active"),
    recordOutputActivity: (nodeId, portId) => writeActivity(createPortKey(nodeId, portId), "output-active"),
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

export const recordInputPortActivity = (nodeId: string, portId: string) => {
  usePortActivityStore.getState().recordInputActivity(nodeId, portId);
};

export const recordOutputPortActivity = (nodeId: string, portId: string) => {
  usePortActivityStore.getState().recordOutputActivity(nodeId, portId);
};

export const resetPortActivityStore = () => {
  usePortActivityStore.getState().reset();
};

export const selectPortStatus = (
  state: Pick<PortActivityStore, "portStates">,
  key: PortKey
): PortActivityStatus => state.portStates[key]?.status ?? "idle";

