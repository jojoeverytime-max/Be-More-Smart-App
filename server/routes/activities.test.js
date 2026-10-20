import test from "node:test";
import assert from "node:assert/strict";
import express from "express";
import mongoose from "mongoose";
import { Activity } from "../models/Activity.js";
import { activitiesRouter } from "./activities.js";

const ownerId = "student-123";

async function withActivitiesRoute(run) {
  const app = express();
  app.use(express.json());
  app.use((request, _response, next) => {
    request.auth = { payload: { sub: ownerId } };
    next();
  });
  app.use(activitiesRouter);
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

test("activities are listed only for the authenticated owner", async () => {
  const originalFind = Activity.find;
  let queryFilter;
  Activity.find = (filter) => {
    queryFilter = filter;
    return {
      sort(sortOrder) {
        assert.deepEqual(sortOrder, { createdAt: -1, _id: -1 });
        return {
          lean: async () => [{
            _id: new mongoose.Types.ObjectId(),
            name: "Soccer team",
            category: "Sports",
            createdAt: new Date("2026-10-15T12:00:00.000Z"),
          }],
        };
      },
    };
  };

  try {
    await withActivitiesRoute(async (baseUrl) => {
      const response = await fetch(baseUrl);
      assert.equal(response.status, 200);
      assert.deepEqual(queryFilter, { ownerId });
      const activities = await response.json();
      assert.equal(activities.length, 1);
      assert.equal(activities[0].name, "Soccer team");
      assert.equal(activities[0].category, "Sports");
    });
  } finally {
    Activity.find = originalFind;
  }
});

test("creating an activity uses the authenticated owner and validated input", async () => {
  const originalCreate = Activity.create;
  let createInput;
  Activity.create = async (input) => {
    createInput = input;
    return {
      _id: new mongoose.Types.ObjectId(),
      ...input,
      createdAt: new Date("2026-10-15T12:00:00.000Z"),
    };
  };

  try {
    await withActivitiesRoute(async (baseUrl) => {
      const response = await fetch(baseUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "  Soccer team ", category: "Sports" }),
      });
      assert.equal(response.status, 201);
      assert.deepEqual(createInput, { name: "Soccer team", category: "Sports", ownerId });
      const activity = await response.json();
      assert.equal(activity.name, "Soccer team");
      assert.equal(activity.category, "Sports");
    });
  } finally {
    Activity.create = originalCreate;
  }
});

test("activity deletion is scoped to the authenticated owner", async () => {
  const originalFindOneAndDelete = Activity.findOneAndDelete;
  const activityId = new mongoose.Types.ObjectId().toString();
  let deletionFilter;
  Activity.findOneAndDelete = async (filter) => {
    deletionFilter = filter;
    return { _id: activityId };
  };

  try {
    await withActivitiesRoute(async (baseUrl) => {
      const response = await fetch(`${baseUrl}/${activityId}`, { method: "DELETE" });
      assert.equal(response.status, 204);
      assert.deepEqual(deletionFilter, { _id: activityId, ownerId });
    });
  } finally {
    Activity.findOneAndDelete = originalFindOneAndDelete;
  }
});
