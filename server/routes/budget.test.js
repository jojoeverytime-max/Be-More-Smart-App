import test from "node:test";
import assert from "node:assert/strict";
import express from "express";
import mongoose from "mongoose";
import { Budget } from "../models/Budget.js";
import { budgetRouter } from "./budget.js";

const ownerId = "student-123";

async function withBudgetRoute(run) {
  const app = express();
  app.use(express.json());
  app.use((request, _response, next) => {
    request.auth = { payload: { sub: ownerId } };
    next();
  });
  app.use(budgetRouter);
  const server = app.listen(0, "127.0.0.1");

  try {
    await new Promise((resolve, reject) => {
      server.once("listening", resolve);
      server.once("error", reject);
    });
    await run(`http://127.0.0.1:${server.address().port}`);
  } finally {
    server.closeAllConnections();
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }
}

test("budget loads only for the authenticated owner and defaults to an empty budget", async () => {
  const originalFindOne = Budget.findOne;
  let filter;
  Budget.findOne = (query) => {
    filter = query;
    return { lean: async () => null };
  };

  try {
    await withBudgetRoute(async (baseUrl) => {
      const response = await fetch(baseUrl);
      assert.equal(response.status, 200);
      assert.deepEqual(filter, { ownerId });
      assert.deepEqual(await response.json(), { currentBalance: 0, expenses: [], incomes: [] });
    });
  } finally {
    Budget.findOne = originalFindOne;
  }
});

test("setting the current budget balance saves cents under the authenticated owner", async () => {
  const originalFindOneAndUpdate = Budget.findOneAndUpdate;
  let updateFilter;
  let update;
  Budget.findOneAndUpdate = async (filter, changes) => {
    updateFilter = filter;
    update = changes;
    return { currentBalanceCents: 12550, expenses: [] };
  };

  try {
    await withBudgetRoute(async (baseUrl) => {
      const response = await fetch(baseUrl, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentBalance: 125.5 }),
      });
      assert.equal(response.status, 200);
      assert.deepEqual(updateFilter, { ownerId });
      assert.deepEqual(update, { $set: { currentBalanceCents: 12550 }, $setOnInsert: { ownerId } });
      assert.deepEqual(await response.json(), { currentBalance: 125.5, expenses: [], incomes: [] });
    });
  } finally {
    Budget.findOneAndUpdate = originalFindOneAndUpdate;
  }
});

test("adding an expense validates it and subtracts its cents from the owner's balance", async () => {
  const originalUpdateOne = Budget.updateOne;
  const originalFindOneAndUpdate = Budget.findOneAndUpdate;
  const expenseId = new mongoose.Types.ObjectId();
  let ensureFilter;
  let updateFilter;
  let update;
  Budget.updateOne = async (filter) => { ensureFilter = filter; };
  Budget.findOneAndUpdate = async (filter, changes) => {
    updateFilter = filter;
    update = changes;
    return {
      currentBalanceCents: 8750,
      expenses: [{ _id: expenseId, description: "Lunch", amountCents: 1250, date: "2026-10-15" }],
    };
  };

  try {
    await withBudgetRoute(async (baseUrl) => {
      const response = await fetch(`${baseUrl}/expenses`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description: " Lunch ", amount: 12.5, date: "2026-10-15" }),
      });
      assert.equal(response.status, 201);
      assert.deepEqual(ensureFilter, { ownerId });
      assert.deepEqual(updateFilter, { ownerId });
      assert.deepEqual(update, {
        $inc: { currentBalanceCents: -1250 },
        $push: { expenses: { description: "Lunch", amountCents: 1250, date: "2026-10-15" } },
      });
      const result = await response.json();
      assert.equal(result.budget.currentBalance, 87.5);
      assert.deepEqual(result.expense, {
        id: expenseId.toString(),
        description: "Lunch",
        amount: 12.5,
        date: "2026-10-15",
      });
    });
  } finally {
    Budget.updateOne = originalUpdateOne;
    Budget.findOneAndUpdate = originalFindOneAndUpdate;
  }
});

test("adding income validates it and adds its cents to the owner's balance", async () => {
  const originalUpdateOne = Budget.updateOne;
  const originalFindOneAndUpdate = Budget.findOneAndUpdate;
  const incomeId = new mongoose.Types.ObjectId();
  let updateFilter;
  let update;
  Budget.updateOne = async () => {};
  Budget.findOneAndUpdate = async (filter, changes) => {
    updateFilter = filter;
    update = changes;
    return {
      currentBalanceCents: 11250,
      expenses: [],
      incomes: [{ _id: incomeId, description: "Allowance", amountCents: 1250, date: "2026-10-15" }],
    };
  };

  try {
    await withBudgetRoute(async (baseUrl) => {
      const response = await fetch(`${baseUrl}/income`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description: " Allowance ", amount: 12.5, date: "2026-10-15" }),
      });
      assert.equal(response.status, 201);
      assert.deepEqual(updateFilter, { ownerId });
      assert.deepEqual(update, {
        $inc: { currentBalanceCents: 1250 },
        $push: { incomes: { description: "Allowance", amountCents: 1250, date: "2026-10-15" } },
      });
      const result = await response.json();
      assert.equal(result.budget.currentBalance, 112.5);
      assert.deepEqual(result.income, {
        id: incomeId.toString(),
        description: "Allowance",
        amount: 12.5,
        date: "2026-10-15",
      });
    });
  } finally {
    Budget.updateOne = originalUpdateOne;
    Budget.findOneAndUpdate = originalFindOneAndUpdate;
  }
});

test("removing income deducts it back and scopes deletion to the owner", async () => {
  const originalFindOne = Budget.findOne;
  const originalFindOneAndUpdate = Budget.findOneAndUpdate;
  const incomeId = new mongoose.Types.ObjectId().toString();
  let lookupFilter;
  let updateFilter;
  let update;
  Budget.findOne = (filter, projection) => {
    lookupFilter = filter;
    assert.deepEqual(projection, { incomes: { $elemMatch: { _id: incomeId } } });
    return { lean: async () => ({ incomes: [{ _id: incomeId, amountCents: 1250 }] }) };
  };
  Budget.findOneAndUpdate = async (filter, changes) => {
    updateFilter = filter;
    update = changes;
    return { currentBalanceCents: 8750, expenses: [], incomes: [] };
  };

  try {
    await withBudgetRoute(async (baseUrl) => {
      const response = await fetch(`${baseUrl}/income/${incomeId}`, { method: "DELETE" });
      assert.equal(response.status, 200);
      assert.deepEqual(lookupFilter, { ownerId, "incomes._id": incomeId });
      assert.deepEqual(updateFilter, lookupFilter);
      assert.deepEqual(update, {
        $inc: { currentBalanceCents: -1250 },
        $pull: { incomes: { _id: incomeId } },
      });
      assert.deepEqual(await response.json(), { currentBalance: 87.5, expenses: [], incomes: [] });
    });
  } finally {
    Budget.findOne = originalFindOne;
    Budget.findOneAndUpdate = originalFindOneAndUpdate;
  }
});

test("removing an expense refunds it and scopes both lookup and deletion to the owner", async () => {
  const originalFindOne = Budget.findOne;
  const originalFindOneAndUpdate = Budget.findOneAndUpdate;
  const expenseId = new mongoose.Types.ObjectId().toString();
  let lookupFilter;
  let updateFilter;
  let update;
  Budget.findOne = (filter, projection) => {
    lookupFilter = filter;
    assert.deepEqual(projection, { expenses: { $elemMatch: { _id: expenseId } } });
    return { lean: async () => ({ expenses: [{ _id: expenseId, amountCents: 1250 }] }) };
  };
  Budget.findOneAndUpdate = async (filter, changes) => {
    updateFilter = filter;
    update = changes;
    return { currentBalanceCents: 10000, expenses: [] };
  };

  try {
    await withBudgetRoute(async (baseUrl) => {
      const response = await fetch(`${baseUrl}/expenses/${expenseId}`, { method: "DELETE" });
      assert.equal(response.status, 200);
      assert.deepEqual(lookupFilter, { ownerId, "expenses._id": expenseId });
      assert.deepEqual(updateFilter, lookupFilter);
      assert.deepEqual(update, {
        $inc: { currentBalanceCents: 1250 },
        $pull: { expenses: { _id: expenseId } },
      });
      assert.deepEqual(await response.json(), { currentBalance: 100, expenses: [], incomes: [] });
    });
  } finally {
    Budget.findOne = originalFindOne;
    Budget.findOneAndUpdate = originalFindOneAndUpdate;
  }
});
