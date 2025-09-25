import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState
} from "react";
import { createPortal } from "react-dom";

import { useCanvasBoundary } from "./CanvasBoundaryContext";
import {
  CHAT_FLOW_INACTIVE_NOTICE,
  type ChatAttachment,
  type ChatMessage,
  type ChatThreadState,
  useChatStore
} from "../state/chatStore";

const WINDOW_BACKGROUND = "rgba(15, 23, 42, 0.96)";
const MESSAGE_WIDTH = 0.88;
const MAX_INPUT_LINES = 8;
const INPUT_LINE_HEIGHT = 20;
const INPUT_VERTICAL_PADDING = 24;

const baseWindowStyle: React.CSSProperties = {
  position: "absolute",
  display: "flex",
  flexDirection: "column",
  background: WINDOW_BACKGROUND,
  borderRadius: 20,
  border: "1px solid rgba(148, 163, 184, 0.28)",
  boxShadow: "0 32px 80px rgba(15, 23, 42, 0.6)",
  overflow: "hidden",
  color: "#f8fafc",
  zIndex: 40
};

const standaloneContainerStyle: React.CSSProperties = {
  ...baseWindowStyle,
  position: "relative",
  margin: "0 auto",
  width: "min(720px, 100%)",
  height: "100%"
};

const conversationStyle: React.CSSProperties = {
  flex: 1,
  overflowY: "auto",
  padding: "24px 24px 16px",
  display: "flex",
  flexDirection: "column",
  gap: 16,
  background: "linear-gradient(180deg, rgba(30, 41, 59, 0.95), rgba(15, 23, 42, 0.92))"
};

const inputSectionStyle: React.CSSProperties = {
  padding: "16px 20px 20px",
  background: "rgba(15, 23, 42, 0.94)",
  borderTop: "1px solid rgba(148, 163, 184, 0.18)",
  display: "flex",
  flexDirection: "column",
  gap: 12
};

const inputRowStyle: React.CSSProperties = {
  display: "flex",
  gap: 12,
  alignItems: "flex-end"
};

const attachmentChipStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
  padding: "6px 10px",
  borderRadius: 999,
  border: "1px solid rgba(148, 163, 184, 0.35)",
  background: "rgba(30, 41, 59, 0.75)",
  color: "#cbd5f5",
  fontSize: 12,
  cursor: "pointer"
};

const draftAttachmentChipStyle: React.CSSProperties = {
  ...attachmentChipStyle,
  background: "rgba(37, 99, 235, 0.15)",
  border: "1px solid rgba(96, 165, 250, 0.45)",
  cursor: "default"
};

const addButtonStyle: React.CSSProperties = {
  width: 38,
  height: 38,
  borderRadius: 12,
  border: "1px solid rgba(148, 163, 184, 0.35)",
  background: "rgba(30, 41, 59, 0.85)",
  color: "#e2e8f0",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: 22,
  cursor: "pointer",
  transition: "background 0.2s ease, transform 0.2s ease"
};

const textareaStyle: React.CSSProperties = {
  flex: 1,
  minHeight: 36,
  maxHeight: MAX_INPUT_LINES * INPUT_LINE_HEIGHT + INPUT_VERTICAL_PADDING,
  borderRadius: 16,
  border: "1px solid rgba(148, 163, 184, 0.35)",
  background: "rgba(15, 23, 42, 0.75)",
  color: "#f8fafc",
  padding: "12px 16px",
  fontSize: 14,
  lineHeight: `${INPUT_LINE_HEIGHT}px`,
  resize: "none",
  outline: "none",
  overflow: "hidden",
  boxShadow: "inset 0 1px 3px rgba(15, 23, 42, 0.4)"
};

const timestampStyle: React.CSSProperties = {
  fontSize: 11,
  letterSpacing: 0.4,
  textTransform: "uppercase",
  color: "rgba(148, 163, 184, 0.6)",
  marginBottom: 6,
  fontWeight: 500
};

const bubbleBaseStyle: React.CSSProperties = {
  maxWidth: `${MESSAGE_WIDTH * 100}%`,
  borderRadius: 20,
  padding: "14px 18px",
  boxShadow: "0 18px 48px rgba(15, 23, 42, 0.42)",
  display: "flex",
  flexDirection: "column",
  gap: 10,
  fontSize: 14,
  lineHeight: 1.6,
  whiteSpace: "pre-wrap",
  wordBreak: "break-word"
};

const userBubbleStyle: React.CSSProperties = {
  ...bubbleBaseStyle,
  alignSelf: "flex-end",
  background: "linear-gradient(135deg, rgba(59, 130, 246, 0.88), rgba(96, 165, 250, 0.82))",
  color: "#f8fafc",
  borderTopRightRadius: 8
};

const assistantBubbleStyle: React.CSSProperties = {
  ...bubbleBaseStyle,
  alignSelf: "flex-start",
  background: "rgba(15, 23, 42, 0.88)",
  border: "1px solid rgba(148, 163, 184, 0.22)",
  color: "#e2e8f0",
  borderTopLeftRadius: 8
};

const systemBubbleStyle: React.CSSProperties = {
  ...assistantBubbleStyle,
  background: "rgba(30, 41, 59, 0.85)",
  borderStyle: "dashed"
};

const closeButtonStyle: React.CSSProperties = {
  position: "absolute",
  top: 12,
  right: 12,
  width: 28,
  height: 28,
  borderRadius: 999,
  border: "1px solid rgba(148, 163, 184, 0.35)",
  background: "rgba(30, 41, 59, 0.85)",
  color: "#e2e8f0",
  fontSize: 15,
  lineHeight: "15px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  cursor: "pointer",
  transition: "background 0.2s ease, transform 0.2s ease",
  zIndex: 2
};

const threadBadgeStyle: React.CSSProperties = {
  position: "absolute",
  top: 16,
  left: 20,
  padding: "6px 10px",
  borderRadius: 999,
  background: "rgba(37, 99, 235, 0.18)",
  border: "1px solid rgba(96, 165, 250, 0.35)",
  color: "#bfdbfe",
  fontSize: 11,
  letterSpacing: 0.35,
  textTransform: "uppercase"
};

const emptyStateStyle: React.CSSProperties = {
  margin: "auto",
  textAlign: "center",
  color: "rgba(226, 232, 240, 0.65)",
  fontSize: 13,
  lineHeight: 1.6,
  padding: "24px 12px"
};

function formatFileSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) {
    return "0 B";
  }
  const units = ["B", "KB", "MB", "GB", "TB"];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / 1024 ** index;
  return `${value >= 100 ? value.toFixed(0) : value.toFixed(value >= 10 ? 1 : 2)} ${units[index]}`;
}

function useTimestampFormatter() {
  return useMemo(
    () =>
      new Intl.DateTimeFormat(undefined, {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit"
      }),
    []
  );
}

function TypingIndicator() {
  const [dots, setDots] = useState(1);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setDots((previous) => (previous % 3) + 1);
    }, 360);
    return () => window.clearInterval(interval);
  }, []);

  return (
    <span
      style={{
        display: "inline-flex",
        gap: 4,
        alignItems: "center",
        color: "rgba(148, 163, 184, 0.9)"
      }}
    >
      <span
        style={{
          width: 8,
          height: 8,
          borderRadius: "50%",
          background: "rgba(148, 163, 184, 0.9)",
          opacity: dots >= 1 ? 1 : 0.3,
          transition: "opacity 0.2s ease"
        }}
      />
      <span
        style={{
          width: 8,
          height: 8,
          borderRadius: "50%",
          background: "rgba(148, 163, 184, 0.75)",
          opacity: dots >= 2 ? 1 : 0.3,
          transition: "opacity 0.2s ease"
        }}
      />
      <span
        style={{
          width: 8,
          height: 8,
          borderRadius: "50%",
          background: "rgba(148, 163, 184, 0.6)",
          opacity: dots >= 3 ? 1 : 0.3,
          transition: "opacity 0.2s ease"
        }}
      />
    </span>
  );
}

interface ChatWindowSurfaceProps {
  thread: ChatThreadState;
  flowAcceptsInput: boolean;
  mode: "floating" | "standalone";
  onRequestClose?: () => void;
  onScrollStateChange: (scrollTop: number, stickToBottom: boolean) => void;
  onDraftChange: (draft: string) => void;
  onDraftAttachmentsAdd: (files: File[]) => void;
  onDraftAttachmentRemove: (attachmentId: string) => void;
}

function ChatWindowSurface({
  thread,
  flowAcceptsInput,
  mode,
  onRequestClose,
  onScrollStateChange,
  onDraftChange,
  onDraftAttachmentsAdd,
  onDraftAttachmentRemove
}: ChatWindowSurfaceProps) {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [dragging, setDragging] = useState(false);

  const formatter = useTimestampFormatter();

  const adjustTextareaHeight = useCallback(() => {
    const textarea = textareaRef.current;
    if (!textarea) {
      return;
    }
    textarea.style.height = "auto";
    const maxHeight = MAX_INPUT_LINES * INPUT_LINE_HEIGHT + INPUT_VERTICAL_PADDING;
    const nextHeight = Math.min(textarea.scrollHeight, maxHeight);
    textarea.style.height = `${nextHeight}px`;
    textarea.style.overflowY = textarea.scrollHeight > maxHeight ? "auto" : "hidden";
  }, []);

  useEffect(() => {
    adjustTextareaHeight();
  }, [thread.draft, adjustTextareaHeight]);

  useEffect(() => {
    const container = scrollRef.current;
    if (!container) {
      return;
    }

    const maxScrollTop = Math.max(0, container.scrollHeight - container.clientHeight);

    if (thread.stickToBottom) {
      container.scrollTop = maxScrollTop;
      return;
    }

    container.scrollTop = Math.min(thread.scrollTop, maxScrollTop);
  }, [thread.nodeId, thread.scrollTop, thread.stickToBottom, thread.messages.length]);

  useEffect(() => {
    const container = scrollRef.current;
    if (!container) {
      return;
    }
    if (!thread.stickToBottom) {
      return;
    }
    container.scrollTop = container.scrollHeight;
  }, [thread.messages.length, thread.stickToBottom, thread.streamingMessageId]);

  const handleScroll = useCallback(() => {
    const container = scrollRef.current;
    if (!container) {
      return;
    }
    const { scrollTop, scrollHeight, clientHeight } = container;
    const distanceFromBottom = scrollHeight - (scrollTop + clientHeight);
    const stick = distanceFromBottom < 28;
    onScrollStateChange(scrollTop, stick);
  }, [onScrollStateChange]);

  const handleFileButton = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(event.target.files ?? []);
      if (files.length > 0) {
        onDraftAttachmentsAdd(files);
      }
      event.target.value = "";
    },
    [onDraftAttachmentsAdd]
  );

  const handleDragOver = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = "copy";
    }
    setDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setDragging(false);
  }, []);

  const handleDrop = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      event.stopPropagation();
      const files = Array.from(event.dataTransfer?.files ?? []);
      if (files.length > 0) {
        onDraftAttachmentsAdd(files);
      }
      setDragging(false);
    },
    [onDraftAttachmentsAdd]
  );

  const renderMessage = useCallback(
    (message: ChatMessage) => {
      const timestamp = formatter.format(new Date(message.createdAt));
      const bubbleStyle =
        message.role === "user"
          ? userBubbleStyle
          : message.role === "assistant"
            ? assistantBubbleStyle
            : systemBubbleStyle;

      const openAttachment = (attachment: ChatAttachment) => {
        if (!attachment.url && !attachment.file) {
          return;
        }
        const url = attachment.url ?? URL.createObjectURL(attachment.file as File);
        window.open(url, "_blank", "noopener,noreferrer");
      };

      return (
        <article key={message.id} style={{ display: "flex", flexDirection: "column" }}>
          <span
            style={{
              ...timestampStyle,
              textAlign: message.role === "user" ? "right" : "left",
              marginLeft: message.role === "user" ? "auto" : 0,
              marginRight: message.role === "user" ? 0 : "auto"
            }}
          >
            {timestamp}
          </span>
          <div style={bubbleStyle}>
            {message.streaming ? <TypingIndicator /> : message.content}
            {message.attachments.length > 0 ? (
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 8,
                  marginTop: 4
                }}
              >
                {message.attachments.map((attachment) => (
                  <button
                    key={attachment.id}
                    type="button"
                    style={{
                      ...attachmentChipStyle,
                      alignSelf: message.role === "user" ? "flex-end" : "flex-start"
                    }}
                    onClick={() => openAttachment(attachment)}
                  >
                    <span aria-hidden>📎</span>
                    <span>{attachment.name}</span>
                    <span style={{ opacity: 0.75 }}>{formatFileSize(attachment.size)}</span>
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        </article>
      );
    },
    [formatter]
  );

  const dragBorderStyle = dragging
    ? { border: "1px solid rgba(96, 165, 250, 0.55)", background: "rgba(30, 64, 175, 0.15)" }
    : null;

  return (
    <div
      role="dialog"
      aria-label={`${thread.nodeLabel} chat`}
      style={{
        ...(mode === "floating" ? baseWindowStyle : standaloneContainerStyle),
        width: mode === "floating" ? thread.geometry.size.width : standaloneContainerStyle.width,
        height: mode === "floating" ? thread.geometry.size.height : standaloneContainerStyle.height,
        pointerEvents: "auto",
        ...(mode === "floating"
          ? {
              left: thread.geometry.position.x,
              top: thread.geometry.position.y
            }
          : {})
      }}
    >
      <span style={threadBadgeStyle}>{thread.nodeLabel}</span>
      {mode === "floating" && onRequestClose ? (
        <button
          type="button"
          aria-label="Close chat"
          style={closeButtonStyle}
          onClick={onRequestClose}
        >
          ×
        </button>
      ) : null}

      <div
        ref={scrollRef}
        style={conversationStyle}
        onScroll={handleScroll}
      >
        {thread.messages.length === 0 ? (
          <div style={emptyStateStyle}>
            Start a conversation from this interface node. Draft your prompt below and press the Play control on the canvas to
            send it.
          </div>
        ) : (
          thread.messages.map((message) => renderMessage(message))
        )}
      </div>

      <div
        style={{
          ...inputSectionStyle,
          ...(dragBorderStyle ?? {})
        }}
        onDragEnter={handleDragOver}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <div style={inputRowStyle}>
          <button
            type="button"
            aria-label="Attach files"
            style={addButtonStyle}
            onClick={handleFileButton}
          >
            +
          </button>
          <textarea
            ref={textareaRef}
            placeholder="Type here… press Play on the canvas to send"
            style={textareaStyle}
            value={thread.draft}
            onChange={(event) => onDraftChange(event.target.value)}
            aria-multiline="true"
          />
        </div>

        {thread.draftAttachments.length > 0 ? (
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 8,
              paddingLeft: 50
            }}
          >
            {thread.draftAttachments.map((attachment) => (
              <span key={attachment.id} style={draftAttachmentChipStyle}>
                <span aria-hidden>📎</span>
                <span>{attachment.name}</span>
                <span style={{ opacity: 0.75 }}>{formatFileSize(attachment.size)}</span>
                <button
                  type="button"
                  onClick={() => onDraftAttachmentRemove(attachment.id)}
                  style={{
                    background: "transparent",
                    border: "none",
                    color: "rgba(226, 232, 240, 0.75)",
                    fontSize: 14,
                    cursor: "pointer"
                  }}
                  aria-label={`Remove ${attachment.name}`}
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        ) : null}

        {!flowAcceptsInput ? (
          <div
            style={{
              paddingLeft: 50,
              fontSize: 12,
              color: "rgba(248, 250, 252, 0.7)",
              display: "flex",
              gap: 8,
              alignItems: "center"
            }}
          >
            <span aria-hidden>⚠️</span>
            <span>{CHAT_FLOW_INACTIVE_NOTICE}</span>
          </div>
        ) : null}

        <input
          ref={fileInputRef}
          type="file"
          multiple
          tabIndex={-1}
          style={{ display: "none" }}
          onChange={handleFileChange}
        />
      </div>
    </div>
  );
}

function FloatingChatWindow() {
  const { overlayRef } = useCanvasBoundary();
  const activeNodeId = useChatStore((state) => state.activeNodeId);
  const flowAcceptsInput = useChatStore((state) => state.flowAcceptsInput);
  const closeChat = useChatStore((state) => state.closeChat);
  const setDraft = useChatStore((state) => state.setDraft);
  const addAttachments = useChatStore((state) => state.addDraftAttachments);
  const removeAttachment = useChatStore((state) => state.removeDraftAttachment);
  const setScrollState = useChatStore((state) => state.setScrollState);
  const getThread = useChatStore((state) => state.getThread);

  const thread = useMemo(
    () => (activeNodeId ? getThread(activeNodeId) ?? null : null),
    [activeNodeId, getThread]
  );

  if (!overlayRef.current || !thread || !thread.open) {
    return null;
  }

  return createPortal(
    <ChatWindowSurface
      thread={thread}
      flowAcceptsInput={flowAcceptsInput}
      mode="floating"
      onRequestClose={() => closeChat(thread.nodeId)}
      onScrollStateChange={(scrollTop, stick) => setScrollState(thread.nodeId, scrollTop, stick)}
      onDraftChange={(value) => setDraft(thread.nodeId, value)}
      onDraftAttachmentsAdd={(files) => addAttachments(thread.nodeId, files)}
      onDraftAttachmentRemove={(attachmentId) => removeAttachment(thread.nodeId, attachmentId)}
    />,
    overlayRef.current
  );
}

export default FloatingChatWindow;

export function StandaloneChatView({ nodeId = "standalone", label = "Chat" }: { nodeId?: string; label?: string }) {
  const flowAcceptsInput = useChatStore((state) => state.flowAcceptsInput);
  const setDraft = useChatStore((state) => state.setDraft);
  const addAttachments = useChatStore((state) => state.addDraftAttachments);
  const removeAttachment = useChatStore((state) => state.removeDraftAttachment);
  const setScrollState = useChatStore((state) => state.setScrollState);
  const openChat = useChatStore((state) => state.openChat);
  useEffect(() => {
    openChat({ nodeId, nodeLabel: label });
  }, [label, nodeId, openChat]);

  const thread = useChatStore((state) => state.threads[nodeId]);

  if (!thread) {
    return null;
  }

  return (
    <ChatWindowSurface
      thread={{ ...thread, geometry: thread.geometry }}
      flowAcceptsInput={flowAcceptsInput}
      mode="standalone"
      onScrollStateChange={(scrollTop, stick) => setScrollState(nodeId, scrollTop, stick)}
      onDraftChange={(value) => setDraft(nodeId, value)}
      onDraftAttachmentsAdd={(files) => addAttachments(nodeId, files)}
      onDraftAttachmentRemove={(attachmentId) => removeAttachment(nodeId, attachmentId)}
    />
  );
}
