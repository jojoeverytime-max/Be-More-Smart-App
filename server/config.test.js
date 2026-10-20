import test from "node:test";
import assert from "node:assert/strict";
import { getServerConfig } from "./config.js";

test("Render's public URL is allowed alongside configured client origins", () => {
  const environment = [
    "AUTH0_DOMAIN",
    "AUTH0_AUDIENCE",
    "MONGODB_URI",
    "CLIENT_ORIGIN",
    "RENDER_EXTERNAL_URL",
  ];
  const previousValues = new Map(environment.map((name) => [name, process.env[name]]));

  try {
    process.env.AUTH0_DOMAIN = "example.auth0.com";
    process.env.AUTH0_AUDIENCE = "https://api.studyday.local";
    process.env.MONGODB_URI = "mongodb://127.0.0.1:27017/studyday";
    process.env.CLIENT_ORIGIN = "https://custom.example.com, https://school.example.com";
    process.env.RENDER_EXTERNAL_URL = "https://be-more-smart.onrender.com";

    assert.deepEqual(getServerConfig().clientOrigins, [
      "https://custom.example.com",
      "https://school.example.com",
      "https://be-more-smart.onrender.com",
    ]);
  } finally {
    for (const [name, value] of previousValues) {
      if (value === undefined) delete process.env[name];
      else process.env[name] = value;
    }
  }
});
