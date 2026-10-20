import { Router } from "express";
import { CareerProfile } from "../models/CareerProfile.js";
import { updateCareerProfileSchema } from "../validation.js";

export const profileRouter = Router();

profileRouter.get("/", async (request, response) => {
  const profile = await CareerProfile.findOne({ ownerId: request.auth.payload.sub }).lean();
  return response.json({ currentCareer: profile?.currentCareer ?? "Student" });
});

profileRouter.put("/", async (request, response) => {
  const input = updateCareerProfileSchema.parse(request.body);
  const ownerId = request.auth.payload.sub;
  const profile = await CareerProfile.findOneAndUpdate(
    { ownerId },
    { $set: input, $setOnInsert: { ownerId } },
    { new: true, upsert: true, runValidators: true },
  );
  return response.json({ currentCareer: profile.currentCareer });
});
