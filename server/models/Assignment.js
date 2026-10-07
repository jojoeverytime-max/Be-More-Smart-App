import mongoose from "mongoose";

const assignmentSchema = new mongoose.Schema({
  ownerId: { type: String, required: true },
  title: { type: String, required: true, trim: true, maxlength: 100 },
  className: { type: String, required: true, trim: true, maxlength: 40 },
  dueDate: { type: String, required: true },
  priority: { type: String, enum: ["low", "medium", "high"], default: "medium" },
  completed: { type: Boolean, default: false },
  completedAt: { type: Date, default: null },
}, { timestamps: true });

assignmentSchema.index({ ownerId: 1, dueDate: 1 });

export const Assignment = mongoose.model("Assignment", assignmentSchema);
