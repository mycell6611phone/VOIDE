import test from "node:test";
import assert from "node:assert/strict";
import { register } from "node:module";

register("ts-node/esm", import.meta.url);

const {
  CHAT_SERVER_PORT,
  startChatServer,
  stopChatServer,
} = await import("../src/services/chatServer.ts");
const { chatSessions } = await import("../src/services/chatSession.ts");

const BASE_URL = `http://127.0.0.1:${CHAT_SERVER_PORT}`;

test("chat server stores and returns messages", async (t) => {
  await startChatServer();
  chatSessions.resetAll();

  t.after(async () => {
    chatSessions.resetAll();
    await stopChatServer();
  });

  const historyResponse = await fetch(`${BASE_URL}/api/chat/history?module_id=test-node`);
  assert.equal(historyResponse.status, 200);
  const historyData = await historyResponse.json();
  assert.deepEqual(historyData.messages, []);

  const sendResponse = await fetch(`${BASE_URL}/api/chat/send`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ moduleId: "test-node", senderId: "tester", content: "Hello" }),
  });

  assert.equal(sendResponse.status, 200);
  const sendData = await sendResponse.json();
  assert.ok(Array.isArray(sendData.messages));
  assert.equal(sendData.messages.length, 2);
  assert.equal(sendData.messages[0].direction, "outgoing");
  assert.equal(sendData.messages[0].content, "Hello");
  assert.equal(sendData.messages[1].direction, "incoming");
  assert.ok(sendData.messages[1].content.includes("Got it"));

  const historyResponseAfter = await fetch(`${BASE_URL}/api/chat/history?module_id=test-node`);
  assert.equal(historyResponseAfter.status, 200);
  const historyAfterData = await historyResponseAfter.json();
  assert.equal(historyAfterData.messages.length, 2);
  assert.equal(historyAfterData.messages[0].direction, "outgoing");
  assert.equal(historyAfterData.messages[1].direction, "incoming");
});

