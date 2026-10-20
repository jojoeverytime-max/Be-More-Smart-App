import mongoose from "mongoose";

const activitySchema = new mongoose.Schema({
  ownerId: { type: String, required: true },
  name: { type: String, required: true, trim: true, maxlength: 80 },
  category: { type: String, required: true, enum: ["Sports", "Arts", "Clubs", "Volunteering", "Other"] },
}, { timestamps: true });

activitySchema.index({ ownerId: 1, createdAt: -1 });

export const Activity = mongoose.model("Activity", activitySchema);
