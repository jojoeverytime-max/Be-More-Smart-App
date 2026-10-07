import { z } from "zod";

const dateOnly = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine((value) => {
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}, "Expected a valid calendar date in YYYY-MM-DD format.");

const title = z.string().trim().min(1).max(100);
const className = z.string().trim().min(1).max(40);
const priority = z.enum(["low", "medium", "high"]);

export const createAssignmentSchema = z.object({
  title,
  className,
  dueDate: dateOnly,
  priority: priority.default("medium"),
}).strict();

export const updateAssignmentSchema = z.object({
  title: title.optional(),
  className: className.optional(),
  dueDate: dateOnly.optional(),
  priority: priority.optional(),
  completed: z.boolean().optional(),
}).strict().refine((value) => Object.keys(value).length > 0, "Provide at least one field to update.");

export const createClassSchema = z.object({
  name: className,
}).strict();

export const defaultClasses = ["Biology", "English", "History", "Mathematics"];
