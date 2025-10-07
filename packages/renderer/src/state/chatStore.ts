import { create } from "zustand";

import {
  clampGeometry,
  type WindowGeometry,
  type WindowSize
} from "../components/contextWindowUtils";
import {
  fetchChatHistory,
  sendChatMessage,
  type ChatApiMessage
} from "../lib/chatApi";

export type ChatRole = "user" | "assistant" | "system";

export interface ChatAttachment {
  id: string;
  name: string;
  size: number;
  type: string;
  url?: string;
  file?: File;
}

export interface ChatMessage {
  id: string;
  role: ChatRole;
  content: string;
  createdAt: number;
  attachments: ChatAttachment[];
  streaming?: boolean;
  senderId?: string;
  direction?: "incoming" | "outgoing";
}

export interface DraftAttachment extends ChatAttachment {
  file: File;
}

export interface ChatThreadState {
  nodeId: string;
  nodeLabel: string;
  messages: ChatMessage[];
  draft: string;
  draftAttachments: DraftAttachment[];
  geometry: WindowGeometry;
  scrollTop: number;
  stickToBottom: boolean;
  open: boolean;
  minimized: boolean;
  isSending: boolean;
  loadingHistory: boolean;
  hasLoadedHistory: boolean;
  notice: string | null;
}

interface OpenChatOptions {
  nodeId: string;
  nodeLabel: string;
  geometry?: WindowGeometry;
}

interface ChatStore {
  readonly threads: Record<string, ChatThreadState>;
  readonly activeNodeId: string | null;
  readonly flowAcceptsInput: boolean;
  openChat: (options: OpenChatOptions) => void;
  closeChat: (nodeId?: string) => void;
  minimizeChat: (nodeId: string) => void;
  setDraft: (nodeId: string, draft: string) => void;
  addDraftAttachments: (nodeId: string, files: File[]) => void;
  removeDraftAttachment: (nodeId: string, attachmentId: string) => void;
  clearDraft: (nodeId: string) => void;
  setScrollState: (nodeId: string, scrollTop: number, stickToBottom: boolean) => void;
  updateGeometry: (nodeId: string, geometry: WindowGeometry) => void;
  sendDraft: (nodeId: string) => Promise<boolean>;
  sendActiveDraft: () => Promise<boolean>;
  loadHistory: (nodeId: string) => Promise<void>;
  getThread: (nodeId: string) => ChatThreadState | undefined;
  hasOpenChat: () => boolean;
  setFlowAcceptsInput: (value: boolean) => void;
}

export const MAX_CHAT_WINDOW_WIDTH = 500;

const DEFAULT_WINDOW_SIZE: WindowSize = { width: 420, height: 540 };

const DEFAULT_GEOMETRY: WindowGeometry = {
  position: { x: 0, y: 0 },
  size: { ...DEFAULT_WINDOW_SIZE }
};

const FLOW_INACTIVE_NOTICE = "Flow is paused. Start the run to accept new input.";

const createId = () => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `chat-${Date.now().toString(36)}-${Math.random().toString(16).slice(2)}`;
};

const cloneGeometry = (geometry: WindowGeometry | undefined): WindowGeometry => ({
  position: {
    x: geometry?.position.x ?? DEFAULT_GEOMETRY.position.x,
    y: geometry?.position.y ?? DEFAULT_GEOMETRY.position.y
  },
  size: {
    width: Math.min(geometry?.size.width ?? DEFAULT_WINDOW_SIZE.width, MAX_CHAT_WINDOW_WIDTH),
    height: geometry?.size.height ?? DEFAULT_WINDOW_SIZE.height
  }
});

const mapApiMessage = (message: ChatApiMessage): ChatMessage => ({
  id: message.id || createId(),
  role: message.direction === "outgoing" ? "user" : "assistant",
  content: message.content ?? "",
  createdAt: Number.isFinite(message.timestamp) ? message.timestamp : Date.now(),
  attachments: [],
  senderId: message.sender_id,
  direction: message.direction,
});

const createAttachmentFromFile = (file: File): DraftAttachment => ({
  id: createId(),
  name: file.name || "attachment",
  size: file.size,
  type: file.type || "application/octet-stream",
  file
});

const toMessageAttachment = (attachment: DraftAttachment): ChatAttachment => ({
  id: attachment.id,
  name: attachment.name,
  size: attachment.size,
  type: attachment.type,
  url:
    attachment.url ??
    (typeof URL !== "undefined"
      ? URL.createObjectURL(attachment.file)
      : undefined)
});

const ensureThreadState = (
  threads: Record<string, ChatThreadState>,
  nodeId: string,
  nodeLabel: string,
  geometry?: WindowGeometry
): ChatThreadState => {
  const existing = threads[nodeId];
  if (existing) {
    return {
      ...existing,
      nodeLabel: existing.nodeLabel || nodeLabel,
      geometry: geometry ? cloneGeometry(geometry) : existing.geometry
    };
  }

  return {
    nodeId,
    nodeLabel,
    messages: [],
    draft: "",
    draftAttachments: [],
    geometry: cloneGeometry(geometry),
    scrollTop: 0,
    stickToBottom: true,
    open: false,
    minimized: false,
    isSending: false,
    loadingHistory: false,
    hasLoadedHistory: false,
    notice: null
  };
};

export const useChatStore = create<ChatStore>((set, get) => ({
  threads: {},
  activeNodeId: null,
  flowAcceptsInput: true,
  openChat: ({ nodeId, nodeLabel, geometry }) => {
    set((state) => {
      const base = ensureThreadState(state.threads, nodeId, nodeLabel, geometry);
      const threads = {
        ...state.threads,
        [nodeId]: {
          ...base,
          open: true,
          minimized: false,
          notice: null,
        },
      };

      return {
        threads,
        activeNodeId: nodeId
      };
    });
    void get().loadHistory(nodeId);
  },
  closeChat: (nodeId) => {
    set((state) => {
      const targetId = nodeId ?? state.activeNodeId;
      if (!targetId) {
        return state;
      }

      const thread = state.threads[targetId];
      if (!thread) {
        return state;
      }

      const updated: ChatThreadState = {
        ...thread,
        open: false,
        minimized: false,
        draft: "",
        draftAttachments: [],
        isSending: false,
      };
      return {
        threads: { ...state.threads, [targetId]: updated },
        activeNodeId: state.activeNodeId === targetId ? null : state.activeNodeId
      };
    });
  },
  minimizeChat: (nodeId) => {
    set((state) => {
      const thread = state.threads[nodeId];
      if (!thread) {
        return state;
      }

      const updated: ChatThreadState = {
        ...thread,
        open: false,
        minimized: true,
      };

      return {
        threads: { ...state.threads, [nodeId]: updated },
        activeNodeId: state.activeNodeId === nodeId ? null : state.activeNodeId,
      };
    });
  },
  setDraft: (nodeId, draft) => {
    set((state) => {
      const thread = state.threads[nodeId];
      if (!thread) {
        return state;
      }

      return {
        threads: {
          ...state.threads,
          [nodeId]: { ...thread, draft }
        }
      };
    });
  },
  addDraftAttachments: (nodeId, files) => {
    if (!files || files.length === 0) {
      return;
    }
    set((state) => {
      const thread = state.threads[nodeId];
      if (!thread) {
        return state;
      }

      const additions = files.map(createAttachmentFromFile);
      return {
        threads: {
          ...state.threads,
          [nodeId]: {
            ...thread,
            draftAttachments: [...thread.draftAttachments, ...additions]
          }
        }
      };
    });
  },
  removeDraftAttachment: (nodeId, attachmentId) => {
    set((state) => {
      const thread = state.threads[nodeId];
      if (!thread) {
        return state;
      }

      return {
        threads: {
          ...state.threads,
          [nodeId]: {
            ...thread,
            draftAttachments: thread.draftAttachments.filter(
              (item) => item.id !== attachmentId
            )
          }
        }
      };
    });
  },
  clearDraft: (nodeId) => {
    set((state) => {
      const thread = state.threads[nodeId];
      if (!thread) {
        return state;
      }
      return {
        threads: {
          ...state.threads,
          [nodeId]: { ...thread, draft: "", draftAttachments: [] }
        }
      };
    });
  },
  setScrollState: (nodeId, scrollTop, stickToBottom) => {
    set((state) => {
      const thread = state.threads[nodeId];
      if (!thread) {
        return state;
      }
      if (
        thread.scrollTop === scrollTop &&
        thread.stickToBottom === stickToBottom
      ) {
        return state;
      }
      return {
        threads: {
          ...state.threads,
          [nodeId]: { ...thread, scrollTop, stickToBottom }
        }
      };
    });
  },
  updateGeometry: (nodeId, geometry) => {
    set((state) => {
      const thread = state.threads[nodeId];
      if (!thread) {
        return state;
      }

      const rect = state.threads[nodeId].geometry;
      const sanitized: WindowGeometry = {
        position: { ...geometry.position },
        size: {
          width: Math.min(geometry.size.width, MAX_CHAT_WINDOW_WIDTH),
          height: geometry.size.height,
        },
      };

      const nextGeometry = clampGeometry(sanitized, {
        width: Number.MAX_SAFE_INTEGER,
        height: Number.MAX_SAFE_INTEGER
      });

      if (
        rect.position.x === nextGeometry.position.x &&
        rect.position.y === nextGeometry.position.y &&
        rect.size.width === nextGeometry.size.width &&
        rect.size.height === nextGeometry.size.height
      ) {
        return state;
      }

      return {
        threads: {
          ...state.threads,
          [nodeId]: { ...thread, geometry: nextGeometry }
        }
      };
    });
  },
  sendDraft: async (nodeId) => {
    const state = get();
    const thread = state.threads[nodeId];
    if (!thread) {
      return false;
    }

    const draftText = thread.draft ?? "";
    const hasContent = draftText.trim().length > 0;
    const hasAttachments = thread.draftAttachments.length > 0;

    if (!hasContent && !hasAttachments) {
      return false;
    }

    const timestamp = Date.now();
    const attachments = thread.draftAttachments.map(toMessageAttachment);
    const userMessage: ChatMessage = {
      id: createId(),
      role: "user",
      content: draftText,
      createdAt: timestamp,
      attachments,
      senderId: "user",
      direction: "outgoing",
    };

    set({ flowAcceptsInput: false });

    set((prev) => {
      const current = prev.threads[nodeId];
      if (!current) {
        return prev;
      }

      const nextThread: ChatThreadState = {
        ...current,
        messages: [...current.messages, userMessage],
        draft: "",
        draftAttachments: [],
        stickToBottom: true,
        isSending: true,
        notice: null,
      };

      return {
        threads: {
          ...prev.threads,
          [nodeId]: nextThread,
        },
      };
    });

    try {
      const messages = await sendChatMessage(nodeId, draftText);
      set((prev) => {
        const current = prev.threads[nodeId];
        if (!current) {
          return prev;
        }

        const converted = messages.map(mapApiMessage);
        const sorted = converted.sort((a, b) => a.createdAt - b.createdAt);

        return {
          threads: {
            ...prev.threads,
            [nodeId]: {
              ...current,
              messages: sorted,
              isSending: false,
              stickToBottom: true,
            },
          },
          flowAcceptsInput: true,
        };
      });
      return true;
    } catch (error) {
      set((prev) => {
        const current = prev.threads[nodeId];
        if (!current) {
          return prev;
        }

        return {
          threads: {
            ...prev.threads,
            [nodeId]: {
              ...current,
              messages: current.messages.filter((message) => message.id !== userMessage.id),
              draft: draftText,
              draftAttachments: thread.draftAttachments,
              isSending: false,
              notice: `Failed to send message: ${error instanceof Error ? error.message : String(error)}`,
            },
          },
          flowAcceptsInput: true,
        };
      });
      return false;
    }
  },
  sendActiveDraft: async () => {
    const state = get();
    if (!state.activeNodeId) {
      return false;
    }
    return state.sendDraft(state.activeNodeId);
  },
  loadHistory: async (nodeId) => {
    const state = get();
    const thread = state.threads[nodeId];
    if (!thread) {
      return;
    }

    if (thread.loadingHistory) {
      return;
    }

    set((prev) => {
      const current = prev.threads[nodeId];
      if (!current) {
        return prev;
      }

      if (current.hasLoadedHistory && current.messages.length > 0) {
        return prev;
      }

      return {
        threads: {
          ...prev.threads,
          [nodeId]: { ...current, loadingHistory: true, notice: null },
        },
      };
    });

    try {
      const history = await fetchChatHistory(nodeId);
      set((prev) => {
        const current = prev.threads[nodeId];
        if (!current) {
          return prev;
        }

        const converted = history.map(mapApiMessage);
        const sorted = converted.sort((a, b) => a.createdAt - b.createdAt);

        return {
          threads: {
            ...prev.threads,
            [nodeId]: {
              ...current,
              messages: sorted,
              loadingHistory: false,
              hasLoadedHistory: true,
              stickToBottom: true,
            },
          },
        };
      });
    } catch (error) {
      set((prev) => {
        const current = prev.threads[nodeId];
        if (!current) {
          return prev;
        }

        return {
          threads: {
            ...prev.threads,
            [nodeId]: {
              ...current,
              loadingHistory: false,
              notice: `Failed to load chat history: ${
                error instanceof Error ? error.message : String(error)
              }`,
            },
          },
        };
      });
    }
  },
  getThread: (nodeId) => get().threads[nodeId],
  hasOpenChat: () => {
    const state = get();
    return Object.values(state.threads).some((thread) => thread.open);
  },
  setFlowAcceptsInput: (value) => {
    set((state) => {
      if (state.flowAcceptsInput === value) {
        return state;
      }
      return { flowAcceptsInput: value };
    });
  }
}));

export const DEFAULT_CHAT_WINDOW_SIZE = DEFAULT_WINDOW_SIZE;
export const DEFAULT_CHAT_WINDOW_GEOMETRY = DEFAULT_GEOMETRY;
export const CHAT_FLOW_INACTIVE_NOTICE = FLOW_INACTIVE_NOTICE;
