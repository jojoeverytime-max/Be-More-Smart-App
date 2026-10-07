import { Router } from "express";
import mongoose from "mongoose";
import { Assignment } from "../models/Assignment.js";
import { createAssignmentSchema, updateAssignmentSchema } from "../validation.js";

export const assignmentsRouter = Router();

function serialize(assignment) {
  return {
    id: assignment._id.toString(),
    title: assignment.title,
    className: assignment.className,
    dueDate: assignment.dueDate,
    priority: assignment.priority,
    completed: assignment.completed,
    completedAt: assignment.completedAt?.toISOString() ?? null,
    createdAt: assignment.createdAt.toISOString(),
  };
}

assignmentsRouter.get("/", async (request, response) => {
  const assignments = await Assignment.find({ ownerId: request.auth.payload.sub })
    .sort({ dueDate: 1, createdAt: 1 })
    .lean();
  response.json(assignments.map(serialize));
});

assignmentsRouter.post("/", async (request, response) => {
  const input = createAssignmentSchema.parse(request.body);
  const assignment = await Assignment.create({
    ...input,
    ownerId: request.auth.payload.sub,
  });
  response.status(201).json(serialize(assignment));
});

assignmentsRouter.patch("/:id", async (request, response) => {
  if (!mongoose.isValidObjectId(request.params.id)) {
    return response.status(404).json({ error: "Assignment not found." });
  }
  const input = updateAssignmentSchema.parse(request.body);
  const update = { ...input };
  if (input.completed === true) update.completedAt = new Date();
  if (input.completed === false) update.completedAt = null;
  const assignment = await Assignment.findOneAndUpdate(
    { _id: request.params.id, ownerId: request.auth.payload.sub },
    { $set: update },
    { new: true, runValidators: true },
  );
  if (!assignment) return response.status(404).json({ error: "Assignment not found." });
  return response.json(serialize(assignment));
});

assignmentsRouter.delete("/:id", async (request, response) => {
  if (!mongoose.isValidObjectId(request.params.id)) {
    return response.status(404).json({ error: "Assignment not found." });
  }
  const assignment = await Assignment.findOneAndDelete({
    _id: request.params.id,
    ownerId: request.auth.payload.sub,
  });
  if (!assignment) return response.status(404).json({ error: "Assignment not found." });
  return response.status(204).end();
});
