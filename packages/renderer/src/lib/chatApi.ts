const CHAT_API_PORT = Number.parseInt(import.meta.env?.VITE_CHAT_PORT ?? "5176", 10);
const CHAT_API_BASE = `http://127.0.0.1:${CHAT_API_PORT}`;

export type ChatDirection = "incoming" | "outgoing";

export interface ChatApiMessage {
  id: string;
  sender_id: string;
  timestamp: number;
  content: string;
  direction: ChatDirection;
}

interface ChatHistoryResponse {
  messages: ChatApiMessage[];
}

const toError = (error: unknown) =>
  error instanceof Error ? error : new Error(String(error));

async function parseJson<T>(response: Response): Promise<T> {
  try {
    return (await response.json()) as T;
  } catch (error) {
    throw toError(error);
  }
}

export async function fetchChatHistory(moduleId: string): Promise<ChatApiMessage[]> {
  const url = `${CHAT_API_BASE}/api/chat/history?module_id=${encodeURIComponent(moduleId)}`;

  let response: Response;
  try {
    response = await fetch(url, { method: "GET" });
  } catch (error) {
    throw new Error(`Unable to reach chat history endpoint: ${String(error)}`);
  }

  if (!response.ok) {
    const payload = await parseJson<{ error?: string }>(response).catch(() => ({ error: undefined }));
    throw new Error(payload.error ?? `Chat history request failed with ${response.status}`);
  }

  const body = await parseJson<ChatHistoryResponse>(response);
  return Array.isArray(body.messages) ? body.messages : [];
}

export async function sendChatMessage(
  moduleId: string,
  content: string,
  senderId = "user"
): Promise<ChatApiMessage[]> {
  const url = `${CHAT_API_BASE}/api/chat/send`;
  let response: Response;

  try {
    response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ moduleId, senderId, content }),
    });
  } catch (error) {
    throw new Error(`Unable to send chat message: ${String(error)}`);
  }

  if (!response.ok) {
    const payload = await parseJson<{ error?: string }>(response).catch(() => ({ error: undefined }));
    throw new Error(payload.error ?? `Chat send request failed with ${response.status}`);
  }

  const body = await parseJson<ChatHistoryResponse>(response);
  return Array.isArray(body.messages) ? body.messages : [];
}

