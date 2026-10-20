import test from "node:test";
import assert from "node:assert/strict";
import express from "express";
import { CareerProfile } from "../models/CareerProfile.js";
import { profileRouter } from "./profile.js";

const ownerId = "student-123";

async function withProfileRoute(run) {
  const app = express();
  app.use(express.json());
  app.use((request, _response, next) => {
    request.auth = { payload: { sub: ownerId } };
    next();
  });
  app.use(profileRouter);
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

test("career profile defaults to Student and loads by authenticated owner", async () => {
  const originalFindOne = CareerProfile.findOne;
  let lookupFilter;
  CareerProfile.findOne = (filter) => {
    lookupFilter = filter;
    return { lean: async () => null };
  };

  try {
    await withProfileRoute(async (baseUrl) => {
      const response = await fetch(baseUrl);
      assert.equal(response.status, 200);
      assert.deepEqual(await response.json(), { currentCareer: "Student" });
      assert.deepEqual(lookupFilter, { ownerId });
    });
  } finally {
    CareerProfile.findOne = originalFindOne;
  }
});

test("career profile updates are saved for the authenticated owner", async () => {
  const originalFindOneAndUpdate = CareerProfile.findOneAndUpdate;
  let updateFilter;
  let updateDocument;
  let updateOptions;
  CareerProfile.findOneAndUpdate = async (filter, update, options) => {
    updateFilter = filter;
    updateDocument = update;
    updateOptions = options;
    return { currentCareer: update.$set.currentCareer };
  };

  try {
    await withProfileRoute(async (baseUrl) => {
      const response = await fetch(baseUrl, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentCareer: "  Software Engineer  " }),
      });
      assert.equal(response.status, 200);
      assert.deepEqual(await response.json(), { currentCareer: "Software Engineer" });
      assert.deepEqual(updateFilter, { ownerId });
      assert.deepEqual(updateDocument, {
        $set: { currentCareer: "Software Engineer" },
        $setOnInsert: { ownerId },
      });
      assert.deepEqual(updateOptions, { new: true, upsert: true, runValidators: true });
    });
  } finally {
    CareerProfile.findOneAndUpdate = originalFindOneAndUpdate;
  }
});
