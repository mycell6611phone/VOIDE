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
  MAX_CHAT_WINDOW_WIDTH,
  type ChatAttachment,
  type ChatMessage,
  type ChatThreadState,
  useChatStore
} from "../state/chatStore";

const PANEL_RADIUS = 16;
const ACCENT_COLOR = "#6C63FF";
const ACCENT_HOVER = "#5A52D6";
const SECONDARY_COLOR = "#E0E0E0";
const SECONDARY_HOVER = "#CFCFCF";
const MAX_INPUT_HEIGHT = 120;
const TRANSITION_MS = 200;

const baseWindowStyle: React.CSSProperties = {
  position: "absolute",
  display: "flex",
  flexDirection: "column",
  backgroundColor: "#ffffff",
  borderRadius: PANEL_RADIUS,
  border: "1px solid rgba(15, 23, 42, 0.08)",
  boxShadow: "0 18px 40px rgba(15, 23, 42, 0.12)",
  overflow: "hidden",
  color: "#0f172a",
  zIndex: 40,
  transition: `opacity ${TRANSITION_MS}ms ease, transform ${TRANSITION_MS}ms ease`,
};

const standaloneContainerStyle: React.CSSProperties = {
  ...baseWindowStyle,
  position: "relative",
  margin: "0 auto",
  width: "min(500px, 100%)",
  height: "100%",
};

const conversationStyle: React.CSSProperties = {
  flex: 1,
  overflowY: "auto",
  padding: "20px",
  display: "flex",
  flexDirection: "column",
  gap: 12,
  background: "linear-gradient(180deg, rgba(248, 250, 252, 0.82), rgba(241, 245, 249, 0.9))",
};

const inputSectionStyle: React.CSSProperties = {
  padding: "16px 20px",
  background: "#ffffff",
  borderTop: "1px solid rgba(148, 163, 184, 0.24)",
  display: "flex",
  flexDirection: "column",
  gap: 12,
};

const inputRowStyle: React.CSSProperties = {
  display: "flex",
  gap: 12,
  alignItems: "flex-end",
};

const attachmentChipStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
  padding: "6px 10px",
  borderRadius: 999,
  border: "1px solid rgba(148, 163, 184, 0.4)",
  background: "#f1f5f9",
  color: "#475569",
  fontSize: 12,
  cursor: "pointer",
};

const draftAttachmentChipStyle: React.CSSProperties = {
  ...attachmentChipStyle,
  background: "rgba(108, 99, 255, 0.12)",
  border: "1px solid rgba(108, 99, 255, 0.4)",
  cursor: "default",
};

const accessoryButtonStyle: React.CSSProperties = {
  width: 38,
  height: 38,
  borderRadius: 999,
  border: "none",
  background: SECONDARY_COLOR,
  color: "#334155",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: 18,
  cursor: "pointer",
  transition: `background-color ${TRANSITION_MS}ms ease, transform ${TRANSITION_MS}ms ease`,
};

const textareaStyle: React.CSSProperties = {
  flex: 1,
  minHeight: 40,
  maxHeight: MAX_INPUT_HEIGHT,
  borderRadius: 16,
  border: "1px solid rgba(148, 163, 184, 0.4)",
  background: "#f8fafc",
  color: "#0f172a",
  padding: "12px 16px",
  fontSize: 14,
  lineHeight: "20px",
  resize: "none",
  outline: "none",
  overflow: "hidden",
  boxShadow: "inset 0 1px 2px rgba(15, 23, 42, 0.08)",
};

const textareaFocusStyle: React.CSSProperties = {
  border: `1px solid ${ACCENT_COLOR}`,
  boxShadow: "0 0 0 3px rgba(108, 99, 255, 0.25)",
  background: "#ffffff",
};

const headerStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  padding: "16px 20px",
  borderBottom: "1px solid rgba(148, 163, 184, 0.24)",
  background: "#ffffff",
};

const controlsStyle: React.CSSProperties = {
  display: "flex",
  gap: 8,
  alignItems: "center",
};

const messageMetaStyle: React.CSSProperties = {
  fontSize: 11,
  color: "rgba(15, 23, 42, 0.55)",
  marginTop: 6,
};

const noticeStyle: React.CSSProperties = {
  padding: "12px 20px",
  background: "rgba(254, 215, 170, 0.35)",
  color: "#92400e",
  fontSize: 12,
  borderBottom: "1px solid rgba(251, 191, 36, 0.4)",
};

const loadingStyle: React.CSSProperties = {
  fontSize: 13,
  color: "#475569",
  padding: "24px 12px",
  textAlign: "center",
};

const bubbleBaseStyle: React.CSSProperties = {
  maxWidth: "calc(100% - 48px)",
  borderRadius: 18,
  padding: "12px 16px",
  boxShadow: "0 10px 24px rgba(15, 23, 42, 0.12)",
  fontSize: 14,
  lineHeight: 1.6,
  whiteSpace: "pre-wrap",
  wordBreak: "break-word",
};

const outgoingBubbleStyle: React.CSSProperties = {
  ...bubbleBaseStyle,
  background: ACCENT_COLOR,
  color: "#ffffff",
  borderTopRightRadius: 6,
};

const incomingBubbleStyle: React.CSSProperties = {
  ...bubbleBaseStyle,
  background: "#E0E0E0",
  color: "#1f2937",
  borderTopLeftRadius: 6,
};

const systemBubbleStyle: React.CSSProperties = {
  ...bubbleBaseStyle,
  background: "#f1f5f9",
  color: "#1f2937",
  border: "1px dashed rgba(148, 163, 184, 0.6)",
};

const sendButtonStyle: React.CSSProperties = {
  padding: "10px 18px",
  borderRadius: 999,
  border: "none",
  background: ACCENT_COLOR,
  color: "#ffffff",
  fontSize: 14,
  fontWeight: 600,
  cursor: "pointer",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 6,
  transition: `background-color ${TRANSITION_MS}ms ease, transform ${TRANSITION_MS}ms ease`,
};

const emptyStateStyle: React.CSSProperties = {
  margin: "auto",
  textAlign: "center",
  color: "#64748b",
  fontSize: 13,
  lineHeight: 1.6,
  padding: "24px 12px",
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

interface ChatWindowSurfaceProps {
  thread: ChatThreadState;
  flowAcceptsInput: boolean;
  mode: "floating" | "standalone";
  onRequestClose?: () => void;
  onRequestMinimize?: () => void;
  onRequestExpand?: () => void;
  onSend: () => void | Promise<void>;
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
  onRequestMinimize,
  onRequestExpand,
  onSend,
  onScrollStateChange,
  onDraftChange,
  onDraftAttachmentsAdd,
  onDraftAttachmentRemove
}: ChatWindowSurfaceProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [dragging, setDragging] = useState(false);
  const [visible, setVisible] = useState(false);
  const closingRef = useRef(false);
  const [shouldRestoreFocus, setShouldRestoreFocusState] = useState(false);
  const shouldRestoreFocusRef = useRef(shouldRestoreFocus);
  const [isTextareaFocused, setIsTextareaFocused] = useState(false);

  const setPersistentFocus = useCallback((value: boolean) => {
    shouldRestoreFocusRef.current = value;
    setShouldRestoreFocusState(value);
  }, []);

  useEffect(() => {
    shouldRestoreFocusRef.current = shouldRestoreFocus;
  }, [shouldRestoreFocus]);

  const focusTextarea = useCallback(() => {
    const textarea = textareaRef.current;
    if (!textarea || typeof document === "undefined") {
      return;
    }
    if (document.activeElement === textarea) {
      return;
    }
    textarea.focus({ preventScroll: true });
    const length = textarea.value.length;
    try {
      textarea.setSelectionRange(length, length);
    } catch {
      // ignore selection errors on unfocusable states
    }
  }, []);

  const computedTextareaStyle = useMemo(
    () => ({
      ...textareaStyle,
      ...(isTextareaFocused ? textareaFocusStyle : {}),
    }),
    [isTextareaFocused]
  );

  const formatter = useTimestampFormatter();

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const handlePointerDown = (event: PointerEvent) => {
      const container = containerRef.current;
      if (!container) {
        return;
      }
      if (container.contains(event.target as Node)) {
        return;
      }
      setPersistentFocus(false);
      setIsTextareaFocused(false);
    };

    window.addEventListener("pointerdown", handlePointerDown);
    return () => {
      window.removeEventListener("pointerdown", handlePointerDown);
    };
  }, [setPersistentFocus]);

  useEffect(() => {
    if (mode === "floating" && !thread.open) {
      setPersistentFocus(false);
      setIsTextareaFocused(false);
    }
  }, [mode, setPersistentFocus, thread.open]);

  const adjustTextareaHeight = useCallback(() => {
    const textarea = textareaRef.current;
    if (!textarea) {
      return;
    }
    textarea.style.height = "auto";
    const maxHeight = MAX_INPUT_HEIGHT;
    const nextHeight = Math.min(textarea.scrollHeight, maxHeight);
    textarea.style.height = `${nextHeight}px`;
    textarea.style.overflowY = textarea.scrollHeight > maxHeight ? "auto" : "hidden";
  }, []);

  useEffect(() => {
    closingRef.current = false;
    setVisible(false);
    const frame = window.requestAnimationFrame(() => setVisible(true));
    return () => {
      window.cancelAnimationFrame(frame);
    };
  }, [thread.nodeId]);

  useEffect(() => {
    adjustTextareaHeight();
  }, [thread.draft, adjustTextareaHeight]);

  useEffect(() => {
    if (!shouldRestoreFocus) {
      return;
    }
    if (mode === "floating" && (!thread.open || thread.minimized)) {
      return;
    }
    focusTextarea();
  }, [
    focusTextarea,
    mode,
    shouldRestoreFocus,
    thread.draftAttachments.length,
    thread.isSending,
    thread.messages.length,
    thread.minimized,
    thread.nodeId,
    thread.open,
    visible,
  ]);

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
    if (!container || !thread.stickToBottom) {
      return;
    }
    container.scrollTop = container.scrollHeight;
  }, [thread.messages.length, thread.stickToBottom]);

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

  const handleAccessoryMouseDown = useCallback(
    (event: React.MouseEvent<HTMLElement>) => {
      event.preventDefault();
      setPersistentFocus(true);
      focusTextarea();
    },
    [focusTextarea, setPersistentFocus]
  );

  const handleFileButton = useCallback(() => {
    setPersistentFocus(true);
    focusTextarea();
    fileInputRef.current?.click();
  }, [focusTextarea, setPersistentFocus]);

  const handleFileChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(event.target.files ?? []);
      if (files.length > 0) {
        onDraftAttachmentsAdd(files);
      }
      event.target.value = "";
      setPersistentFocus(true);
      focusTextarea();
    },
    [focusTextarea, onDraftAttachmentsAdd, setPersistentFocus]
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
      setPersistentFocus(true);
      focusTextarea();
    },
    [focusTextarea, onDraftAttachmentsAdd, setPersistentFocus]
  );

  const animateAndCall = useCallback(
    (callback?: () => void) => {
      if (!callback) {
        return;
      }
      if (closingRef.current) {
        callback();
        return;
      }
      closingRef.current = true;
      setVisible(false);
      window.setTimeout(() => {
        closingRef.current = false;
        callback();
      }, TRANSITION_MS);
    },
    []
  );

  const handleCloseClick = useCallback(() => {
    animateAndCall(onRequestClose);
  }, [animateAndCall, onRequestClose]);

  const handleMinimizeClick = useCallback(() => {
    animateAndCall(onRequestMinimize);
  }, [animateAndCall, onRequestMinimize]);

  const handleExpandClick = useCallback(() => {
    onRequestExpand?.();
  }, [onRequestExpand]);

  const handleSendClick = useCallback(() => {
    const hasDraft = thread.draft.trim().length > 0 || thread.draftAttachments.length > 0;
    if (thread.isSending || !hasDraft) {
      return;
    }
    setPersistentFocus(true);
    Promise.resolve(onSend()).finally(() => {
      focusTextarea();
    });
  }, [focusTextarea, onSend, setPersistentFocus, thread.draft, thread.draftAttachments.length, thread.isSending]);

  const handleSecondaryEnter = useCallback((event: React.MouseEvent<HTMLButtonElement>) => {
    event.currentTarget.style.backgroundColor = SECONDARY_HOVER;
  }, []);

  const handleSecondaryLeave = useCallback((event: React.MouseEvent<HTMLButtonElement>) => {
    event.currentTarget.style.backgroundColor = SECONDARY_COLOR;
  }, []);

  const handlePrimaryEnter = useCallback((event: React.MouseEvent<HTMLButtonElement>) => {
    event.currentTarget.style.backgroundColor = ACCENT_HOVER;
  }, []);

  const handlePrimaryLeave = useCallback((event: React.MouseEvent<HTMLButtonElement>) => {
    event.currentTarget.style.backgroundColor = ACCENT_COLOR;
  }, []);

  const handleTextareaFocus = useCallback(() => {
    setPersistentFocus(true);
    setIsTextareaFocused(true);
  }, [setPersistentFocus]);

  const handleTextareaBlur = useCallback(() => {
    setIsTextareaFocused(false);
    if (!shouldRestoreFocusRef.current) {
      return;
    }
    if (typeof window === "undefined") {
      focusTextarea();
      return;
    }
    window.requestAnimationFrame(() => {
      focusTextarea();
    });
  }, [focusTextarea]);

  const handleTextareaKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (
        event.key === "Enter" &&
        !event.shiftKey &&
        !event.altKey &&
        !event.metaKey &&
        !event.ctrlKey &&
        !event.isComposing
      ) {
        event.preventDefault();
        handleSendClick();
        return;
      }

      if (event.key === "Tab") {
        setPersistentFocus(false);
        return;
      }

      if (event.key === "Escape") {
        setPersistentFocus(false);
        if (typeof window === "undefined") {
          event.currentTarget.blur();
          return;
        }
        window.requestAnimationFrame(() => {
          event.currentTarget.blur();
        });
      }
    },
    [handleSendClick, setPersistentFocus]
  );

  const handleAttachmentRemoveClick = useCallback(
    (attachmentId: string) => {
      onDraftAttachmentRemove(attachmentId);
      setPersistentFocus(true);
      focusTextarea();
    },
    [focusTextarea, onDraftAttachmentRemove, setPersistentFocus]
  );

  const renderMessage = useCallback(
    (message: ChatMessage) => {
      const timestamp = formatter.format(new Date(message.createdAt));
      const direction =
        message.direction ??
        (message.role === "user"
          ? "outgoing"
          : message.role === "assistant"
            ? "incoming"
            : "system");
      const alignSelf = direction === "outgoing" ? "flex-end" : "flex-start";
      const bubbleStyle =
        direction === "outgoing"
          ? outgoingBubbleStyle
          : message.role === "system"
            ? systemBubbleStyle
            : incomingBubbleStyle;
      const senderLabel = message.senderId ?? (direction === "outgoing" ? "You" : thread.nodeLabel);

      const openAttachment = (attachment: ChatAttachment) => {
        if (!attachment.url && !attachment.file) {
          return;
        }
        const url = attachment.url ?? URL.createObjectURL(attachment.file as File);
        window.open(url, "_blank", "noopener,noreferrer");
      };

      return (
        <article
          key={message.id}
          style={{ display: "flex", flexDirection: "column", alignItems: alignSelf as "flex-start" | "flex-end" }}
        >
          <div style={{ ...bubbleStyle, alignSelf }}>
            {message.content}
            {message.attachments.length > 0 ? (
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 8,
                  marginTop: 8,
                  justifyContent: direction === "outgoing" ? "flex-end" : "flex-start",
                }}
              >
                {message.attachments.map((attachment) => (
                  <button
                    key={attachment.id}
                    type="button"
                    style={{ ...attachmentChipStyle, alignSelf }}
                    onClick={() => openAttachment(attachment)}
                  >
                    <span aria-hidden>📎</span>
                    <span>{attachment.name}</span>
                  </button>
                ))}
              </div>
            ) : null}
          </div>
          <span
            style={{
              ...messageMetaStyle,
              textAlign: alignSelf === "flex-end" ? "right" : "left",
              alignSelf,
            }}
          >
            {senderLabel} · {timestamp}
          </span>
        </article>
      );
    },
    [formatter, thread.nodeLabel]
  );

  const dragBorderStyle = dragging
    ? { border: "1px dashed rgba(108, 99, 255, 0.45)", background: "rgba(108, 99, 255, 0.08)" }
    : null;

  const containerStyle =
    mode === "floating"
      ? {
          ...baseWindowStyle,
          width: Math.min(thread.geometry.size.width, 500),
          height: thread.geometry.size.height,
          left: thread.geometry.position.x,
          top: thread.geometry.position.y,
        }
      : {
          ...standaloneContainerStyle,
          width: "min(500px, 100%)",
          height: "100%",
        };

  return (
    <div
      ref={containerRef}
      role="dialog"
      aria-label={`${thread.nodeLabel} chat`}
      style={{
        ...containerStyle,
        minWidth: 280,
        maxWidth: 500,
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(8px)",
        pointerEvents: "auto",
      }}
    >
      <header style={headerStyle}>
        <div style={{ fontSize: 15, fontWeight: 600, color: "#1f2937" }}>{thread.nodeLabel}</div>
        <div style={controlsStyle}>
          {onRequestMinimize ? (
            <button
              type="button"
              aria-label="Minimize chat"
              style={{ ...accessoryButtonStyle, background: SECONDARY_COLOR }}
              onClick={handleMinimizeClick}
              onMouseEnter={handleSecondaryEnter}
              onMouseLeave={handleSecondaryLeave}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
            </button>
          ) : null}
          {onRequestExpand ? (
            <button
              type="button"
              aria-label="Expand chat"
              style={{ ...accessoryButtonStyle, background: SECONDARY_COLOR }}
              onClick={handleExpandClick}
              onMouseEnter={handleSecondaryEnter}
              onMouseLeave={handleSecondaryLeave}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <rect x="5" y="5" width="14" height="14" rx="2" />
              </svg>
            </button>
          ) : null}
          {onRequestClose ? (
            <button
              type="button"
              aria-label="Close chat"
              style={{ ...accessoryButtonStyle, background: ACCENT_COLOR, color: "#ffffff" }}
              onClick={handleCloseClick}
              onMouseEnter={handlePrimaryEnter}
              onMouseLeave={handlePrimaryLeave}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <line x1="6" y1="6" x2="18" y2="18" />
                <line x1="6" y1="18" x2="18" y2="6" />
              </svg>
            </button>
          ) : null}
        </div>
      </header>

      {thread.notice ? <div style={noticeStyle}>{thread.notice}</div> : null}

      <div ref={scrollRef} style={conversationStyle} onScroll={handleScroll}>
        {thread.loadingHistory ? (
          <div style={loadingStyle}>Loading messages…</div>
        ) : thread.messages.length === 0 ? (
          <div style={emptyStateStyle}>
            Start a conversation from this interface node. Draft your prompt below and send it when you're ready.
          </div>
        ) : (
          thread.messages.map((message) => renderMessage(message))
        )}
      </div>

      <div
        style={{
          ...inputSectionStyle,
          ...(dragBorderStyle ?? {}),
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
            style={{ ...accessoryButtonStyle, background: SECONDARY_COLOR }}
            onClick={handleFileButton}
            onMouseDown={handleAccessoryMouseDown}
            onMouseEnter={handleSecondaryEnter}
            onMouseLeave={handleSecondaryLeave}
          >
            +
          </button>
          <textarea
            ref={textareaRef}
            placeholder="Type here…"
            style={computedTextareaStyle}
            value={thread.draft}
            onChange={(event) => onDraftChange(event.target.value)}
            onFocus={handleTextareaFocus}
            onBlur={handleTextareaBlur}
            onKeyDown={handleTextareaKeyDown}
            aria-multiline="true"
            spellCheck
          />
          <button
            type="button"
            aria-label="Send message"
            style={{
              ...sendButtonStyle,
              ...(thread.isSending || (thread.draft.trim().length === 0 && thread.draftAttachments.length === 0)
                ? { opacity: 0.6, cursor: "not-allowed" }
                : {}),
            }}
            disabled={thread.isSending || (thread.draft.trim().length === 0 && thread.draftAttachments.length === 0)}
            onClick={handleSendClick}
            onMouseDown={handleAccessoryMouseDown}
            onMouseEnter={handlePrimaryEnter}
            onMouseLeave={handlePrimaryLeave}
          >
            Send
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="5" y1="12" x2="19" y2="12" />
              <polyline points="12 5 19 12 12 19" />
            </svg>
          </button>
        </div>

        {thread.draftAttachments.length > 0 ? (
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 8,
              paddingLeft: 50,
            }}
          >
            {thread.draftAttachments.map((attachment) => (
              <span key={attachment.id} style={draftAttachmentChipStyle}>
                <span aria-hidden>📎</span>
                <span>{attachment.name}</span>
                <span style={{ opacity: 0.75 }}>{formatFileSize(attachment.size)}</span>
                <button
                  type="button"
                  onClick={() => handleAttachmentRemoveClick(attachment.id)}
                  onMouseDown={handleAccessoryMouseDown}
                  style={{
                    background: "transparent",
                    border: "none",
                    color: "#475569",
                    fontSize: 14,
                    cursor: "pointer",
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
              color: "#475569",
              display: "flex",
              gap: 8,
              alignItems: "center",
            }}
          >
            <span aria-hidden>⚠️</span>
            <span>{CHAT_FLOW_INACTIVE_NOTICE}</span>
          </div>
        ) : null}

        {thread.isSending ? (
          <div
            style={{
              paddingLeft: 50,
              fontSize: 12,
              color: "#64748b",
            }}
          >
            Sending…
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
  const minimizeChat = useChatStore((state) => state.minimizeChat);
  const setDraft = useChatStore((state) => state.setDraft);
  const addAttachments = useChatStore((state) => state.addDraftAttachments);
  const removeAttachment = useChatStore((state) => state.removeDraftAttachment);
  const setScrollState = useChatStore((state) => state.setScrollState);
  const updateGeometry = useChatStore((state) => state.updateGeometry);
  const sendDraft = useChatStore((state) => state.sendDraft);
  const getThread = useChatStore((state) => state.getThread);

  const thread = useMemo(
    () => (activeNodeId ? getThread(activeNodeId) ?? null : null),
    [activeNodeId, getThread]
  );

  const handleExpand = useCallback(() => {
    if (!overlayRef.current || !thread) {
      return;
    }

    const bounds = overlayRef.current.getBoundingClientRect();
    const width = Math.min(
      MAX_CHAT_WINDOW_WIDTH,
      Math.max(360, bounds.width - 48)
    );
    const height = Math.min(
      Math.max(thread.geometry.size.height, 520),
      Math.max(320, bounds.height - 48)
    );
    const geometry = {
      position: {
        x: Math.max((bounds.width - width) / 2, 16),
        y: Math.max((bounds.height - height) / 2, 16),
      },
      size: { width, height },
    };

    updateGeometry(thread.nodeId, geometry);
  }, [overlayRef, thread, updateGeometry]);

  if (!overlayRef.current || !thread || !thread.open) {
    return null;
  }

  return createPortal(
    <ChatWindowSurface
      thread={thread}
      flowAcceptsInput={flowAcceptsInput}
      mode="floating"
      onRequestClose={() => closeChat(thread.nodeId)}
      onRequestMinimize={() => minimizeChat(thread.nodeId)}
      onRequestExpand={handleExpand}
      onSend={() => void sendDraft(thread.nodeId)}
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
  const sendDraft = useChatStore((state) => state.sendDraft);
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
      onSend={() => void sendDraft(nodeId)}
      onScrollStateChange={(scrollTop, stick) => setScrollState(nodeId, scrollTop, stick)}
      onDraftChange={(value) => setDraft(nodeId, value)}
      onDraftAttachmentsAdd={(files) => addAttachments(nodeId, files)}
      onDraftAttachmentRemove={(attachmentId) => removeAttachment(nodeId, attachmentId)}
    />
  );
}
