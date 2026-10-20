import mongoose from "mongoose";

const classSchema = new mongoose.Schema({
  ownerId: { type: String, required: true },
  name: { type: String, required: true, trim: true, maxlength: 40 },
  normalizedName: { type: String, required: true },
  isRemoved: { type: Boolean, default: false },
}, { timestamps: true });

classSchema.index({ ownerId: 1, normalizedName: 1 }, { unique: true });

export const Class = mongoose.model("Class", classSchema);
