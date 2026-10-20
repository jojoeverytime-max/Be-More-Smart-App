import test from "node:test";
import assert from "node:assert/strict";
import express from "express";
import mongoose from "mongoose";
import { Assignment } from "../models/Assignment.js";
import { assignmentsRouter } from "./assignments.js";

const ownerId = "student-123";

function makeAssignment(overrides = {}) {
  return {
    _id: new mongoose.Types.ObjectId(),
    ownerId,
    title: "Read chapter 4",
    className: "Biology",
    dueDate: "2026-10-20",
    priority: "medium",
    completed: true,
    completedAt: new Date("2026-10-15T12:00:00.000Z"),
    rewardPoints: 10,
    createdAt: new Date("2026-10-01T12:00:00.000Z"),
    ...overrides,
  };
}

async function withAssignmentsRoute(run) {
  const app = express();
  app.use(express.json());
  app.use((request, _response, next) => {
    request.auth = { payload: { sub: ownerId } };
    next();
  });
  app.use(assignmentsRouter);
  const server = app.listen(0, "127.0.0.1");

  try {
    await new Promise((resolve, reject) => {
      server.once("listening", resolve);
      server.once("error", reject);
    });
    const { port } = server.address();
    await run(`http://127.0.0.1:${port}`);
  } finally {
    server.closeAllConnections();
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }
}

test("first assignment completion awards 10 reward points", async () => {
  const originalFindOneAndUpdate = Assignment.findOneAndUpdate;
  const completedAssignment = makeAssignment();
  let updateFilter;
  let updateDocument;
  Assignment.findOneAndUpdate = async (filter, update) => {
    updateFilter = filter;
    updateDocument = update;
    return completedAssignment;
  };

  try {
    await withAssignmentsRoute(async (baseUrl) => {
      const response = await fetch(`${baseUrl}/${completedAssignment._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ completed: true }),
      });

      assert.equal(response.status, 200);
      assert.equal((await response.json()).rewardPoints, 10);
      assert.deepEqual(updateFilter, {
        _id: completedAssignment._id.toString(),
        ownerId,
        completed: { $ne: true },
      });
      assert.equal(updateDocument.$set.completed, true);
      assert.equal(updateDocument.$set.rewardPoints, 10);
      assert.ok(updateDocument.$set.completedAt instanceof Date);
    });
  } finally {
    Assignment.findOneAndUpdate = originalFindOneAndUpdate;
  }
});

test("assignment creation stores and returns the selected outside activity", async () => {
  const originalCreate = Assignment.create;
  const createdAssignment = makeAssignment({
    completed: false,
    completedAt: null,
    rewardPoints: 0,
    activityName: "Debate club",
  });
  let createInput;
  Assignment.create = async (input) => {
    createInput = input;
    return createdAssignment;
  };

  try {
    await withAssignmentsRoute(async (baseUrl) => {
      const response = await fetch(`${baseUrl}/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: "Practice presentation",
          className: "English",
          activityName: "  Debate club ",
          dueDate: "2026-10-20",
        }),
      });

      assert.equal(response.status, 201);
      assert.equal(createInput.activityName, "Debate club");
      assert.equal(createInput.ownerId, ownerId);
      assert.equal((await response.json()).activityName, "Debate club");
    });
  } finally {
    Assignment.create = originalCreate;
  }
});

test("recompleting an assignment does not award points twice", async () => {
  const originalFindOneAndUpdate = Assignment.findOneAndUpdate;
  const completedAssignment = makeAssignment();
  const filters = [];
  let repeatUpdate;
  Assignment.findOneAndUpdate = async (filter, update) => {
    filters.push(filter);
    if (filters.length === 2) repeatUpdate = update;
    return filters.length === 1 ? null : completedAssignment;
  };

  try {
    await withAssignmentsRoute(async (baseUrl) => {
      const response = await fetch(`${baseUrl}/${completedAssignment._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ completed: true }),
      });

      assert.equal(response.status, 200);
      assert.equal((await response.json()).rewardPoints, 10);
      assert.equal(filters.length, 2);
      assert.deepEqual(filters[1], { _id: completedAssignment._id.toString(), ownerId });
      assert.equal("rewardPoints" in repeatUpdate.$set, false);
    });
  } finally {
    Assignment.findOneAndUpdate = originalFindOneAndUpdate;
  }
});

test("marking an assignment incomplete keeps its earned points", async () => {
  const originalFindOneAndUpdate = Assignment.findOneAndUpdate;
  const incompleteAssignment = makeAssignment({ completed: false, completedAt: null });
  let updateDocument;
  Assignment.findOneAndUpdate = async (_filter, update) => {
    updateDocument = update;
    return incompleteAssignment;
  };

  try {
    await withAssignmentsRoute(async (baseUrl) => {
      const response = await fetch(`${baseUrl}/${incompleteAssignment._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ completed: false }),
      });

      assert.equal(response.status, 200);
      assert.equal((await response.json()).rewardPoints, 10);
      assert.equal(updateDocument.$set.completed, false);
      assert.equal(updateDocument.$set.completedAt, null);
      assert.equal("rewardPoints" in updateDocument.$set, false);
    });
  } finally {
    Assignment.findOneAndUpdate = originalFindOneAndUpdate;
  }
});
