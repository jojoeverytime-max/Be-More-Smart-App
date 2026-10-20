import mongoose from "mongoose";

const careerProfileSchema = new mongoose.Schema({
  ownerId: { type: String, required: true, unique: true },
  currentCareer: { type: String, required: true, trim: true, maxlength: 80, default: "Student" },
}, { timestamps: true });

export const CareerProfile = mongoose.model("CareerProfile", careerProfileSchema);
