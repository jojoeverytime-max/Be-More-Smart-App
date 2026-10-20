import { z } from "zod";

const dateOnly = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine((value) => {
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}, "Expected a valid calendar date in YYYY-MM-DD format.");

const title = z.string().trim().min(1).max(100);
const className = z.string().trim().min(1).max(40);
const assignmentClassName = z.string().trim().max(40);
const priority = z.enum(["low", "medium", "high"]);
const currencyAmount = z.number().finite().min(0).max(1_000_000)
  .refine((value) => Math.abs(value * 100 - Math.round(value * 100)) < 1e-7, "Amount may have at most two decimal places.");

export const createAssignmentSchema = z.object({
  title,
  className: assignmentClassName.optional().default(""),
  activityName: z.string().trim().max(80).optional().default(""),
  dueDate: dateOnly,
  priority: priority.default("medium"),
}).strict();

export const updateAssignmentSchema = z.object({
  title: title.optional(),
  className: assignmentClassName.optional(),
  activityName: z.string().trim().max(80).optional(),
  dueDate: dateOnly.optional(),
  priority: priority.optional(),
  completed: z.boolean().optional(),
}).strict().refine((value) => Object.keys(value).length > 0, "Provide at least one field to update.");

export const createClassSchema = z.object({
  name: className,
}).strict();

export const createMessageSchema = z.object({
  displayName: z.string().trim().min(1).max(60),
  text: z.string().trim().min(1).max(2000),
}).strict();

export const updateCareerProfileSchema = z.object({
  currentCareer: z.string().trim().min(1).max(80),
}).strict();

export const createActivitySchema = z.object({
  name: z.string().trim().min(1).max(80),
  category: z.enum(["Sports", "Arts", "Clubs", "Volunteering", "Other"]),
}).strict();

export const updateBudgetSchema = z.object({
  currentBalance: currencyAmount,
}).strict().transform(({ currentBalance }) => ({
  currentBalanceCents: Math.round(currentBalance * 100),
}));

export const createExpenseSchema = z.object({
  description: z.string().trim().min(1).max(100),
  amount: currencyAmount.refine((value) => value > 0, "Expense amount must be greater than zero."),
  date: dateOnly,
}).strict().transform(({ description, amount, date }) => ({
  description,
  amountCents: Math.round(amount * 100),
  date,
}));

export const createIncomeSchema = z.object({
  description: z.string().trim().min(1).max(100),
  amount: currencyAmount.refine((value) => value > 0, "Income amount must be greater than zero."),
  date: dateOnly,
}).strict().transform(({ description, amount, date }) => ({
  description,
  amountCents: Math.round(amount * 100),
  date,
}));

export const defaultClasses = ["Biology", "English", "History", "Mathematics"];
