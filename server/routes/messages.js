import { Router } from "express";
import mongoose from "mongoose";
import { ChatMessage } from "../models/ChatMessage.js";
import { createMessageSchema } from "../validation.js";

export const messagesRouter = Router();

messagesRouter.get("/", async (_request, response) => {
  const messages = await ChatMessage.find({})
    .sort({ createdAt: -1, _id: -1 })
    .limit(100)
    .lean();
  return response.json(messages.reverse().map((message) => ({
    id: message._id.toString(),
    senderId: message.senderId,
    displayName: message.displayName,
    text: message.text,
    createdAt: message.createdAt.toISOString(),
  })));
});

messagesRouter.post("/", async (request, response) => {
  const input = createMessageSchema.parse(request.body);
  const message = await ChatMessage.create({
    senderId: request.auth.payload.sub,
    displayName: input.displayName,
    text: input.text,
  });
  return response.status(201).json({
    id: message._id.toString(),
    senderId: message.senderId,
    displayName: message.displayName,
    text: message.text,
    createdAt: message.createdAt.toISOString(),
  });
});

messagesRouter.delete("/:id", async (request, response) => {
  if (!mongoose.isValidObjectId(request.params.id)) {
    return response.status(404).json({ error: "Message not found." });
  }
  const message = await ChatMessage.findOneAndDelete({
    _id: request.params.id,
    senderId: request.auth.payload.sub,
  });
  if (!message) return response.status(404).json({ error: "Message not found." });
  return response.status(204).end();
});
