import { create } from "zustand";

import {
  clampGeometry,
  type WindowGeometry,
  type WindowSize
} from "../components/contextWindowUtils";

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
  streamingMessageId: string | null;
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
  setDraft: (nodeId: string, draft: string) => void;
  addDraftAttachments: (nodeId: string, files: File[]) => void;
  removeDraftAttachment: (nodeId: string, attachmentId: string) => void;
  clearDraft: (nodeId: string) => void;
  setScrollState: (nodeId: string, scrollTop: number, stickToBottom: boolean) => void;
  updateGeometry: (nodeId: string, geometry: WindowGeometry) => void;
  sendDraft: (nodeId: string) => boolean;
  sendActiveDraft: () => boolean;
  appendAssistantResponse: (
    nodeId: string,
    content: string,
    attachments?: ChatAttachment[]
  ) => void;
  completeStreaming: (nodeId: string, messageId: string, content: string) => void;
  getThread: (nodeId: string) => ChatThreadState | undefined;
  hasOpenChat: () => boolean;
  setFlowAcceptsInput: (value: boolean) => void;
}

const DEFAULT_WINDOW_SIZE: WindowSize = { width: 420, height: 520 };

const DEFAULT_GEOMETRY: WindowGeometry = {
  position: { x: 0, y: 0 },
  size: { ...DEFAULT_WINDOW_SIZE }
};

const FLOW_INACTIVE_NOTICE = "Flow is paused. Start the run to accept new input.";

const pendingResponseTimers = new Map<string, number>();

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
    width: geometry?.size.width ?? DEFAULT_WINDOW_SIZE.width,
    height: geometry?.size.height ?? DEFAULT_WINDOW_SIZE.height
  }
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
    streamingMessageId: null,
    notice: null
  };
};

const buildAssistantReply = (prompt: string, attachments: ChatAttachment[]): string => {
  if (prompt.trim().length === 0 && attachments.length > 0) {
    return "I've received the files you attached. I'll review them and respond soon.";
  }

  if (prompt.trim().length === 0) {
    return "I'm ready whenever you are. Send a prompt from the canvas Play control.";
  }

  const shortened = prompt.trim().slice(0, 280);
  return `I see: "${shortened}${prompt.trim().length > 280 ? "…" : ""}"\nI'll run that through the flow and let you know what I find.`;
};

export const useChatStore = create<ChatStore>((set, get) => ({
  threads: {},
  activeNodeId: null,
  flowAcceptsInput: true,
  openChat: ({ nodeId, nodeLabel, geometry }) => {
    set((state) => {
      const base = ensureThreadState(state.threads, nodeId, nodeLabel, geometry);
      const threads = { ...state.threads, [nodeId]: { ...base, open: true } };

      return {
        threads,
        activeNodeId: nodeId
      };
    });
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

      const updated: ChatThreadState = { ...thread, open: false };
      return {
        threads: { ...state.threads, [targetId]: updated },
        activeNodeId: state.activeNodeId === targetId ? null : state.activeNodeId
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
      const nextGeometry = clampGeometry(geometry, {
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
  sendDraft: (nodeId) => {
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
      attachments
    };

    const assistantPlaceholder: ChatMessage = {
      id: createId(),
      role: "assistant",
      content: "",
      createdAt: Date.now(),
      attachments: [],
      streaming: true
    };

    set({ flowAcceptsInput: false });

    set((prev) => {
      const current = prev.threads[nodeId];
      if (!current) {
        return prev;
      }

      const nextThread: ChatThreadState = {
        ...current,
        messages: [...current.messages, userMessage, assistantPlaceholder],
        draft: "",
        draftAttachments: [],
        stickToBottom: true,
        streamingMessageId: assistantPlaceholder.id,
        notice: null
      };

      return {
        threads: {
          ...prev.threads,
          [nodeId]: nextThread
        }
      };
    });

    const timerKey = `${nodeId}:${assistantPlaceholder.id}`;
    if (pendingResponseTimers.has(timerKey)) {
      const existingTimer = pendingResponseTimers.get(timerKey);
      if (typeof existingTimer === "number") {
        window.clearTimeout(existingTimer);
      }
    }

    const timer = window.setTimeout(() => {
      const content = buildAssistantReply(draftText, attachments);
      get().completeStreaming(nodeId, assistantPlaceholder.id, content);
    }, 1200);

    pendingResponseTimers.set(timerKey, timer);

    return true;
  },
  sendActiveDraft: () => {
    const state = get();
    if (!state.activeNodeId) {
      return false;
    }
    return state.sendDraft(state.activeNodeId);
  },
  appendAssistantResponse: (nodeId, content, attachments = []) => {
    set((state) => {
      const thread = state.threads[nodeId];
      if (!thread) {
        return state;
      }

      const withoutStreaming = thread.messages.filter(
        (message) => message.id !== thread.streamingMessageId
      );

      const assistantMessage: ChatMessage = {
        id: createId(),
        role: "assistant",
        content,
        createdAt: Date.now(),
        attachments
      };

      return {
        threads: {
          ...state.threads,
          [nodeId]: {
            ...thread,
            messages: [...withoutStreaming, assistantMessage],
            streamingMessageId: null
          }
        }
      };
    });
    set({ flowAcceptsInput: true });
  },
  completeStreaming: (nodeId, messageId, content) => {
    set((state) => {
      const thread = state.threads[nodeId];
      if (!thread) {
        return state;
      }

      const messages = thread.messages.map((message) =>
        message.id === messageId
          ? { ...message, content, streaming: false, createdAt: Date.now() }
          : message
      );

      const timerKey = `${nodeId}:${messageId}`;
      const existing = pendingResponseTimers.get(timerKey);
      if (typeof existing === "number") {
        window.clearTimeout(existing);
        pendingResponseTimers.delete(timerKey);
      }

      return {
        threads: {
          ...state.threads,
          [nodeId]: {
            ...thread,
            messages,
            streamingMessageId:
              thread.streamingMessageId === messageId ? null : thread.streamingMessageId
          }
        }
      };
    });

    set({ flowAcceptsInput: true });
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
