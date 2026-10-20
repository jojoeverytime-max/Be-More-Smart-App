import { Router } from "express";
import { Class } from "../models/Class.js";
import { createClassSchema, defaultClasses } from "../validation.js";

export const classesRouter = Router();

classesRouter.get("/", async (request, response) => {
  const savedClasses = await Class.find({ ownerId: request.auth.payload.sub })
    .sort({ name: 1 })
    .lean();
  const removedNames = new Set(savedClasses.filter((item) => item.isRemoved).map((item) => item.normalizedName));
  const names = new Set([
    ...defaultClasses.filter((name) => !removedNames.has(name.toLocaleLowerCase())),
    ...savedClasses.filter((item) => !item.isRemoved).map((item) => item.name),
  ]);
  response.json([...names].sort((first, second) => first.localeCompare(second)));
});

classesRouter.post("/", async (request, response) => {
  const input = createClassSchema.parse(request.body);
  const ownerId = request.auth.payload.sub;
  const normalizedName = input.name.toLocaleLowerCase();
  const name = defaultClasses.find((item) => item.toLocaleLowerCase() === normalizedName) ?? input.name;
  const schoolClass = await Class.findOneAndUpdate(
    { ownerId, normalizedName },
    { $set: { isRemoved: false }, $setOnInsert: { ownerId, name, normalizedName } },
    { new: true, upsert: true, runValidators: true },
  );
  response.status(201).json({ name: schoolClass.name });
});

classesRouter.delete("/:name", async (request, response) => {
  const { name } = createClassSchema.parse({ name: request.params.name });
  const normalizedName = name.toLocaleLowerCase();
  const ownerId = request.auth.payload.sub;
  const defaultName = defaultClasses.find((item) => item.toLocaleLowerCase() === normalizedName);
  if (defaultName) {
    await Class.findOneAndUpdate(
      { ownerId, normalizedName },
      {
        $set: { isRemoved: true },
        $setOnInsert: { ownerId, name: defaultName, normalizedName },
      },
      { new: true, upsert: true, runValidators: true },
    );
    return response.status(204).end();
  }
  const schoolClass = await Class.findOneAndUpdate({
    ownerId,
    normalizedName,
  }, { $set: { isRemoved: true } }, { new: true, runValidators: true });
  if (!schoolClass) return response.status(404).json({ error: "Class not found." });
  return response.status(204).end();
});
