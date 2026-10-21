import test from "node:test";
import assert from "node:assert/strict";
import { createApp } from "./app.js";

async function withServer(run) {
  const app = createApp({
    auth0Audience: "https://api.studyday.local",
    auth0Domain: "example.auth0.com",
    clientOrigins: ["http://localhost:5173"],
  });
  const server = app.listen(0, "127.0.0.1");
  await new Promise((resolve, reject) => {
    server.once("listening", resolve);
    server.once("error", reject);
  });
  const { port } = server.address();
  try {
    await run(`http://127.0.0.1:${port}`);
  } finally {
    server.closeAllConnections();
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }
}

test("health reports an unavailable database instead of claiming readiness", async () => {
  await withServer(async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/health`);
    assert.equal(response.status, 503);
    assert.deepEqual(await response.json(), { status: "unavailable", database: "disconnected" });
  });
});

test("Content Security Policy allows connections to the configured Auth0 domain", async () => {
  await withServer(async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/health`);
    const directives = response.headers.get("content-security-policy").split(";").map((directive) => directive.trim());
    assert.ok(directives.includes("connect-src 'self' https://example.auth0.com"));
  });
});

test("assignment routes reject requests without an Auth0 bearer token", async () => {
  await withServer(async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/assignments`);
    assert.equal(response.status, 401);
    assert.deepEqual(await response.json(), { error: "A valid Auth0 access token is required." });
  });
});

test("public chat route rejects requests without an Auth0 bearer token", async () => {
  await withServer(async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/messages`);
    assert.equal(response.status, 401);
    assert.deepEqual(await response.json(), { error: "A valid Auth0 access token is required." });

    const deleteResponse = await fetch(`${baseUrl}/api/messages/507f1f77bcf86cd799439011`, { method: "DELETE" });
    assert.equal(deleteResponse.status, 401);
    assert.deepEqual(await deleteResponse.json(), { error: "A valid Auth0 access token is required." });
  });
});

test("career profile route rejects requests without an Auth0 bearer token", async () => {
  await withServer(async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/profile`);
    assert.equal(response.status, 401);
    assert.deepEqual(await response.json(), { error: "A valid Auth0 access token is required." });

    const updateResponse = await fetch(`${baseUrl}/api/profile`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentCareer: "Software Engineer" }),
    });
    assert.equal(updateResponse.status, 401);
    assert.deepEqual(await updateResponse.json(), { error: "A valid Auth0 access token is required." });
  });
});

test("outside-school activity routes reject requests without an Auth0 bearer token", async () => {
  await withServer(async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/activities`);
    assert.equal(response.status, 401);
    assert.deepEqual(await response.json(), { error: "A valid Auth0 access token is required." });

    const createResponse = await fetch(`${baseUrl}/api/activities`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Soccer", category: "Sports" }),
    });
    assert.equal(createResponse.status, 401);
    assert.deepEqual(await createResponse.json(), { error: "A valid Auth0 access token is required." });
  });
});

test("personal budget routes reject requests without an Auth0 bearer token", async () => {
  await withServer(async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/budget`);
    assert.equal(response.status, 401);
    assert.deepEqual(await response.json(), { error: "A valid Auth0 access token is required." });

    const expenseResponse = await fetch(`${baseUrl}/api/budget/expenses`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ description: "Lunch", amount: 10, date: "2026-10-15" }),
    });
    assert.equal(expenseResponse.status, 401);
    assert.deepEqual(await expenseResponse.json(), { error: "A valid Auth0 access token is required." });

    const incomeResponse = await fetch(`${baseUrl}/api/budget/income`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ description: "Allowance", amount: 10, date: "2026-10-15" }),
    });
    assert.equal(incomeResponse.status, 401);
    assert.deepEqual(await incomeResponse.json(), { error: "A valid Auth0 access token is required." });
  });
});

test("API rejects untrusted browser origins", async () => {
  await withServer(async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/health`, {
      headers: { Origin: "https://untrusted.example" },
    });
    assert.equal(response.status, 403);
    assert.deepEqual(await response.json(), { error: "Origin is not allowed by CORS." });
  });
});

test("unknown API routes return JSON 404 responses", async () => {
  await withServer(async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/unknown`);
    assert.equal(response.status, 404);
    assert.deepEqual(await response.json(), { error: "API route not found." });
  });
});
