import test from "node:test";
import assert from "node:assert/strict";
import express from "express";
import mongoose from "mongoose";
import { ChatMessage } from "../models/ChatMessage.js";
import { messagesRouter } from "./messages.js";

test("message deletion is scoped to the authenticated sender", async () => {
  const messageId = new mongoose.Types.ObjectId().toString();
  const originalFindOneAndDelete = ChatMessage.findOneAndDelete;
  let deletionFilter;
  ChatMessage.findOneAndDelete = async (filter) => {
    deletionFilter = filter;
    return { _id: messageId };
  };

  const app = express();
  app.use((request, _response, next) => {
    request.auth = { payload: { sub: "student-123" } };
    next();
  });
  app.use(messagesRouter);
  const server = app.listen(0, "127.0.0.1");

  try {
    await new Promise((resolve, reject) => {
      server.once("listening", resolve);
      server.once("error", reject);
    });
    const { port } = server.address();
    const response = await fetch(`http://127.0.0.1:${port}/${messageId}`, { method: "DELETE" });

    assert.equal(response.status, 204);
    assert.deepEqual(deletionFilter, { _id: messageId, senderId: "student-123" });
  } finally {
    ChatMessage.findOneAndDelete = originalFindOneAndDelete;
    server.closeAllConnections();
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }
});
