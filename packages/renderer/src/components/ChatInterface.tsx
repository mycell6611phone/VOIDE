import React, { useMemo } from "react";

interface Message {
  id: string;
  author: "user" | "assistant";
  content: string;
  timestamp: string;
}

const containerStyle: React.CSSProperties = {
  height: "100vh",
  display: "flex",
  flexDirection: "column",
  background: "#1f2937",
  color: "#f8fafc",
  fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
};

const headerStyle: React.CSSProperties = {
  padding: "16px 20px",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  borderBottom: "1px solid rgba(148, 163, 184, 0.3)",
  background: "linear-gradient(90deg, rgba(30, 64, 175, 0.65), rgba(29, 78, 216, 0.35))"
};

const headerTitleStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 4
};

const chatAreaStyle: React.CSSProperties = {
  flex: 1,
  overflowY: "auto",
  padding: "24px 20px",
  display: "flex",
  flexDirection: "column",
  gap: 16,
  background: "radial-gradient(circle at top, rgba(59, 130, 246, 0.25), transparent 45%)"
};

const messageBubbleBase: React.CSSProperties = {
  maxWidth: "80%",
  borderRadius: 18,
  padding: "12px 16px",
  lineHeight: 1.5,
  boxShadow: "0 10px 30px rgba(15, 23, 42, 0.25)"
};

const footerStyle: React.CSSProperties = {
  padding: "16px 20px",
  borderTop: "1px solid rgba(148, 163, 184, 0.25)",
  background: "rgba(15, 23, 42, 0.92)",
  display: "flex",
  gap: 12,
  alignItems: "center"
};

const inputStyle: React.CSSProperties = {
  flex: 1,
  padding: "12px 14px",
  borderRadius: 12,
  border: "1px solid rgba(148, 163, 184, 0.35)",
  background: "rgba(15, 23, 42, 0.65)",
  color: "#f8fafc",
  outline: "none",
  fontSize: 14
};

const buttonStyle: React.CSSProperties = {
  padding: "12px 18px",
  borderRadius: 12,
  border: "none",
  background: "linear-gradient(135deg, #38bdf8, #6366f1)",
  color: "#0f172a",
  fontWeight: 700,
  cursor: "pointer",
  boxShadow: "0 8px 20px rgba(59, 130, 246, 0.35)",
  transition: "transform 0.2s ease"
};

function formatMessageStyles(message: Message): React.CSSProperties {
  if (message.author === "user") {
    return {
      ...messageBubbleBase,
      alignSelf: "flex-end",
      background: "linear-gradient(135deg, rgba(59, 130, 246, 0.95), rgba(129, 140, 248, 0.85))",
      color: "#f8fafc"
    };
  }
  return {
    ...messageBubbleBase,
    alignSelf: "flex-start",
    background: "rgba(15, 23, 42, 0.85)",
    border: "1px solid rgba(148, 163, 184, 0.25)",
    color: "#e2e8f0"
  };
}

function renderTimestamp(message: Message) {
  return (
    <span
      style={{
        display: "block",
        marginTop: 6,
        fontSize: 11,
        color: "rgba(226, 232, 240, 0.6)",
        letterSpacing: 0.4,
        textTransform: "uppercase"
      }}
    >
      {message.timestamp}
    </span>
  );
}

export default function ChatInterface() {
  const seedMessages = useMemo<Message[]>(
    () => [
      {
        id: "welcome",
        author: "assistant",
        content: "Hello! I'm ready to help draft interfaces and wire modules across your flow.",
        timestamp: "Today • 09:30"
      },
      {
        id: "user-question",
        author: "user",
        content: "Walk me through the UI → Prompt → LLM → Memory path so I know what's wired.",
        timestamp: "Today • 09:31"
      },
      {
        id: "assistant-reply",
        author: "assistant",
        content: "Great! I'll capture the UI handoff, draft the prompt, run the LLM, and store the reply in memory.",
        timestamp: "Today • 09:31"
      }
    ],
    []
  );

  return (
    <div style={containerStyle}>
      <header style={headerStyle}>
        <div style={headerTitleStyle}>
          <strong style={{ fontSize: 18, letterSpacing: 0.4 }}>VOIDE Chat</strong>
          <span style={{ fontSize: 12, opacity: 0.75 }}>Interface session • Secure local sandbox</span>
        </div>
        <span style={{ fontSize: 12, opacity: 0.75 }}>beta</span>
      </header>

      <main style={chatAreaStyle}>
        {seedMessages.map((message) => (
          <article key={message.id} style={formatMessageStyles(message)}>
            <div>{message.content}</div>
            {renderTimestamp(message)}
          </article>
        ))}
      </main>

      <footer style={footerStyle}>
        <input
          style={inputStyle}
          type="text"
          placeholder="Type your message..."
          aria-label="Chat message input"
          disabled
        />
        <button type="button" style={buttonStyle} disabled>
          Send
        </button>
      </footer>
    </div>
  );
}
