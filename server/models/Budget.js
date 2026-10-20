import mongoose from "mongoose";

const expenseSchema = new mongoose.Schema({
  description: { type: String, required: true, trim: true, maxlength: 100 },
  amountCents: { type: Number, required: true, min: 1 },
  date: { type: String, required: true, match: /^\d{4}-\d{2}-\d{2}$/ },
}, { timestamps: true });

const incomeSchema = new mongoose.Schema({
  description: { type: String, required: true, trim: true, maxlength: 100 },
  amountCents: { type: Number, required: true, min: 1 },
  date: { type: String, required: true, match: /^\d{4}-\d{2}-\d{2}$/ },
}, { timestamps: true });

const budgetSchema = new mongoose.Schema({
  ownerId: { type: String, required: true, unique: true },
  currentBalanceCents: { type: Number, required: true, default: 0 },
  expenses: { type: [expenseSchema], default: [] },
  incomes: { type: [incomeSchema], default: [] },
}, { timestamps: true });

export const Budget = mongoose.model("Budget", budgetSchema);
