import dns from "node:dns";
import mongoose from "mongoose";
import { createApp } from "./app.js";
import { getServerConfig } from "./config.js";

async function start() {
  const config = getServerConfig();
  if (config.mongoDnsServers.length) dns.setServers(config.mongoDnsServers);
  const app = createApp(config);
  const server = app.listen(config.port, () => {
    console.info(`Be More Smart on Study Day API listening on http://localhost:${config.port}`);
  });

  const shutdown = async () => {
    server.close();
    await mongoose.disconnect().catch(() => {});
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);

  try {
    await mongoose.connect(config.mongoUri);
    console.info("MongoDB connected.");
  } catch (error) {
    console.warn("MongoDB unavailable; continuing without database connectivity.", error.message);
  }
}

start().catch((error) => {
  console.error("Failed to start Be More Smart on Study Day API.", error);
  process.exitCode = 1;
});
