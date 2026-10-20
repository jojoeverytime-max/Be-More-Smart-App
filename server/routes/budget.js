import { Router } from "express";
import mongoose from "mongoose";
import { Budget } from "../models/Budget.js";
import { createExpenseSchema, createIncomeSchema, updateBudgetSchema } from "../validation.js";

export const budgetRouter = Router();

function serializeExpense(expense) {
  return {
    id: expense._id.toString(),
    description: expense.description,
    amount: expense.amountCents / 100,
    date: expense.date,
  };
}

function serializeBudget(budget) {
  return {
    currentBalance: budget.currentBalanceCents / 100,
    expenses: budget.expenses.map(serializeExpense),
    incomes: (budget.incomes ?? []).map(serializeExpense),
  };
}

budgetRouter.get("/", async (request, response) => {
  const budget = await Budget.findOne({ ownerId: request.auth.payload.sub }).lean();
  return response.json(budget
    ? serializeBudget(budget)
    : { currentBalance: 0, expenses: [], incomes: [] });
});

budgetRouter.put("/", async (request, response) => {
  const input = updateBudgetSchema.parse(request.body);
  const budget = await Budget.findOneAndUpdate(
    { ownerId: request.auth.payload.sub },
    { $set: input, $setOnInsert: { ownerId: request.auth.payload.sub } },
    { new: true, upsert: true, runValidators: true },
  );
  return response.json(serializeBudget(budget));
});

budgetRouter.post("/expenses", async (request, response) => {
  const input = createExpenseSchema.parse(request.body);
  const ownerId = request.auth.payload.sub;
  await Budget.updateOne(
    { ownerId },
    { $setOnInsert: { ownerId } },
    { upsert: true, setDefaultsOnInsert: true },
  );
  const budget = await Budget.findOneAndUpdate(
    { ownerId },
    { $inc: { currentBalanceCents: -input.amountCents }, $push: { expenses: input } },
    { new: true, runValidators: true },
  );
  const expense = budget.expenses.at(-1);
  return response.status(201).json({
    budget: serializeBudget(budget),
    expense: serializeExpense(expense),
  });
});

budgetRouter.post("/income", async (request, response) => {
  const input = createIncomeSchema.parse(request.body);
  const ownerId = request.auth.payload.sub;
  await Budget.updateOne(
    { ownerId },
    { $setOnInsert: { ownerId } },
    { upsert: true, setDefaultsOnInsert: true },
  );
  const budget = await Budget.findOneAndUpdate(
    { ownerId },
    { $inc: { currentBalanceCents: input.amountCents }, $push: { incomes: input } },
    { new: true, runValidators: true },
  );
  const income = budget.incomes.at(-1);
  return response.status(201).json({
    budget: serializeBudget(budget),
    income: serializeExpense(income),
  });
});

budgetRouter.delete("/income/:id", async (request, response) => {
  if (!mongoose.isValidObjectId(request.params.id)) {
    return response.status(404).json({ error: "Income not found." });
  }
  const filter = { ownerId: request.auth.payload.sub, "incomes._id": request.params.id };
  const budget = await Budget.findOne(filter, { incomes: { $elemMatch: { _id: request.params.id } } }).lean();
  const income = budget?.incomes[0];
  if (!income) return response.status(404).json({ error: "Income not found." });

  const updatedBudget = await Budget.findOneAndUpdate(
    filter,
    { $inc: { currentBalanceCents: -income.amountCents }, $pull: { incomes: { _id: request.params.id } } },
    { new: true, runValidators: true },
  );
  if (!updatedBudget) return response.status(404).json({ error: "Income not found." });
  return response.json(serializeBudget(updatedBudget));
});

budgetRouter.delete("/expenses/:id", async (request, response) => {
  if (!mongoose.isValidObjectId(request.params.id)) {
    return response.status(404).json({ error: "Expense not found." });
  }
  const filter = { ownerId: request.auth.payload.sub, "expenses._id": request.params.id };
  const budget = await Budget.findOne(filter, { expenses: { $elemMatch: { _id: request.params.id } } }).lean();
  const expense = budget?.expenses[0];
  if (!expense) return response.status(404).json({ error: "Expense not found." });

  const updatedBudget = await Budget.findOneAndUpdate(
    filter,
    { $inc: { currentBalanceCents: expense.amountCents }, $pull: { expenses: { _id: request.params.id } } },
    { new: true, runValidators: true },
  );
  if (!updatedBudget) return response.status(404).json({ error: "Expense not found." });
  return response.json(serializeBudget(updatedBudget));
});
