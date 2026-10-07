import { Router } from "express";
import { Class } from "../models/Class.js";
import { createClassSchema, defaultClasses } from "../validation.js";

export const classesRouter = Router();

classesRouter.get("/", async (request, response) => {
  const savedClasses = await Class.find({ ownerId: request.auth.payload.sub })
    .sort({ name: 1 })
    .lean();
  const names = new Set([...defaultClasses, ...savedClasses.map((item) => item.name)]);
  response.json([...names].sort((first, second) => first.localeCompare(second)));
});

classesRouter.post("/", async (request, response) => {
  const input = createClassSchema.parse(request.body);
  const ownerId = request.auth.payload.sub;
  const normalizedName = input.name.toLocaleLowerCase();
  const name = defaultClasses.find((item) => item.toLocaleLowerCase() === normalizedName) ?? input.name;
  const schoolClass = await Class.findOneAndUpdate(
    { ownerId, normalizedName },
    { $setOnInsert: { ownerId, name, normalizedName } },
    { new: true, upsert: true, runValidators: true },
  );
  response.status(201).json({ name: schoolClass.name });
});
