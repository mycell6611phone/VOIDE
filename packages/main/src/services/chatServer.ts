import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { URL } from "node:url";
import { chatSessions } from "./chatSession.js";

export interface ChatServerInfo {
  port: number;
  host: string;
}

export const CHAT_SERVER_HOST = "127.0.0.1";
export const CHAT_SERVER_PORT = Number.parseInt(process.env.VOIDE_CHAT_PORT ?? "5176", 10);

const JSON_HEADERS = {
  "Content-Type": "application/json; charset=utf-8",
};

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

let server: ReturnType<typeof createServer> | null = null;

function writeJson(res: ServerResponse, status: number, payload: unknown) {
  res.writeHead(status, { ...JSON_HEADERS, ...CORS_HEADERS });
  res.end(JSON.stringify(payload));
}

async function readBody(req: IncomingMessage): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
  }
  return Buffer.concat(chunks).toString("utf8");
}

function handleOptions(res: ServerResponse) {
  res.writeHead(204, CORS_HEADERS);
  res.end();
}

async function handleHistoryRequest(url: URL, res: ServerResponse) {
  const moduleId = url.searchParams.get("module_id");
  if (!moduleId) {
    writeJson(res, 400, { error: "module_id is required" });
    return;
  }

  const messages = chatSessions.getHistory(moduleId);
  writeJson(res, 200, {
    messages: messages.map((message) => ({
      id: message.id,
      sender_id: message.senderId,
      timestamp: message.timestamp,
      content: message.content,
      direction: message.direction,
    })),
  });
}

async function handleSendRequest(req: IncomingMessage, res: ServerResponse) {
  try {
    const raw = await readBody(req);
    const parsed = JSON.parse(raw ?? "{}") as {
      moduleId?: string;
      senderId?: string;
      content?: string;
    };

    const moduleId = (parsed.moduleId ?? "").trim();
    const senderId = (parsed.senderId ?? "user").trim() || "user";
    const content = (parsed.content ?? "").trim();

    if (!moduleId) {
      writeJson(res, 400, { error: "moduleId is required" });
      return;
    }

    if (!content) {
      writeJson(res, 400, { error: "content is required" });
      return;
    }

    const messages = chatSessions.recordOutgoing(moduleId, senderId, content);
    writeJson(res, 200, {
      messages: messages.map((message) => ({
        id: message.id,
        sender_id: message.senderId,
        timestamp: message.timestamp,
        content: message.content,
        direction: message.direction,
      })),
    });
  } catch (error) {
    writeJson(res, 500, { error: error instanceof Error ? error.message : String(error) });
  }
}

export async function startChatServer(): Promise<ChatServerInfo> {
  if (server) {
    return { port: CHAT_SERVER_PORT, host: CHAT_SERVER_HOST };
  }

  server = createServer(async (req, res) => {
    if (!req.url) {
      writeJson(res, 404, { error: "Not found" });
      return;
    }

    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");

    const url = new URL(req.url, `http://${CHAT_SERVER_HOST}:${CHAT_SERVER_PORT}`);

    if (req.method === "OPTIONS") {
      handleOptions(res);
      return;
    }

    if (url.pathname === "/api/chat/history" && req.method === "GET") {
      await handleHistoryRequest(url, res);
      return;
    }

    if (url.pathname === "/api/chat/send" && req.method === "POST") {
      await handleSendRequest(req, res);
      return;
    }

    writeJson(res, 404, { error: "Not found" });
  });

  await new Promise<void>((resolve, reject) => {
    server?.once("error", (error) => {
      server?.close();
      server = null;
      reject(error);
    });
    server?.listen(CHAT_SERVER_PORT, CHAT_SERVER_HOST, resolve);
  });

  return { port: CHAT_SERVER_PORT, host: CHAT_SERVER_HOST };
}

export async function stopChatServer() {
  if (!server) {
    return;
  }

  await new Promise<void>((resolve) => {
    server?.close(() => resolve());
  });
  server = null;
}

