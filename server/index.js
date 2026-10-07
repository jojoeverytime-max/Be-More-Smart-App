import mongoose from "mongoose";
import { createApp } from "./app.js";
import { getServerConfig } from "./config.js";

async function start() {
  const config = getServerConfig();
  await mongoose.connect(config.mongoUri);
  const app = createApp(config);
  const server = app.listen(config.port, () => {
    console.info(`Studyday API listening on http://localhost:${config.port}`);
  });
  const shutdown = async () => {
    server.close();
    await mongoose.disconnect();
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

start().catch((error) => {
  console.error("Failed to start Studyday API.", error);
  process.exitCode = 1;
});
