import { Router } from "express";
import mongoose from "mongoose";
import { Activity } from "../models/Activity.js";
import { createActivitySchema } from "../validation.js";

export const activitiesRouter = Router();

function serialize(activity) {
  return {
    id: activity._id.toString(),
    name: activity.name,
    category: activity.category,
    createdAt: activity.createdAt.toISOString(),
  };
}

activitiesRouter.get("/", async (request, response) => {
  const activities = await Activity.find({ ownerId: request.auth.payload.sub })
    .sort({ createdAt: -1, _id: -1 })
    .lean();
  return response.json(activities.map(serialize));
});

activitiesRouter.post("/", async (request, response) => {
  const input = createActivitySchema.parse(request.body);
  const activity = await Activity.create({
    ...input,
    ownerId: request.auth.payload.sub,
  });
  return response.status(201).json(serialize(activity));
});

activitiesRouter.delete("/:id", async (request, response) => {
  if (!mongoose.isValidObjectId(request.params.id)) {
    return response.status(404).json({ error: "Activity not found." });
  }
  const activity = await Activity.findOneAndDelete({
    _id: request.params.id,
    ownerId: request.auth.payload.sub,
  });
  if (!activity) return response.status(404).json({ error: "Activity not found." });
  return response.status(204).end();
});
