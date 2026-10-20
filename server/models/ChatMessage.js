import mongoose from "mongoose";

const chatMessageSchema = new mongoose.Schema({
  senderId: { type: String, required: true },
  displayName: { type: String, required: true, trim: true, maxlength: 60 },
  text: { type: String, required: true, trim: true, maxlength: 2000 },
}, { timestamps: true });

chatMessageSchema.index({ createdAt: -1, _id: -1 });

export const ChatMessage = mongoose.model("ChatMessage", chatMessageSchema);
