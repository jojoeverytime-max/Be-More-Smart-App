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

test("assignment routes reject requests without an Auth0 bearer token", async () => {
  await withServer(async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/assignments`);
    assert.equal(response.status, 401);
    assert.deepEqual(await response.json(), { error: "A valid Auth0 access token is required." });
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
