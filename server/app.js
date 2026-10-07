import cors from "cors";
import express from "express";
import { auth } from "express-oauth2-jwt-bearer";
import helmet from "helmet";
import mongoose from "mongoose";
import { ZodError } from "zod";
import { assignmentsRouter } from "./routes/assignments.js";
import { classesRouter } from "./routes/classes.js";

export function createApp(config) {
  const app = express();
  const authenticate = auth({
    audience: config.auth0Audience,
    issuerBaseURL: `https://${config.auth0Domain}/`,
    tokenSigningAlg: "RS256",
  });

  app.disable("x-powered-by");
  app.use(helmet());
  app.use(cors({
    origin(origin, callback) {
      if (!origin || config.clientOrigins.includes(origin)) return callback(null, true);
      return callback(new Error("Origin is not allowed by CORS."));
    },
  }));
  app.use(express.json({ limit: "20kb" }));

  app.get("/api/health", (_request, response) => {
    const connected = mongoose.connection.readyState === 1;
    response.status(connected ? 200 : 503).json({
      status: connected ? "ok" : "unavailable",
      database: connected ? "connected" : "disconnected",
    });
  });

  app.use("/api/assignments", authenticate, assignmentsRouter);
  app.use("/api/classes", authenticate, classesRouter);

  app.use((error, _request, response, _next) => {
    if (error instanceof ZodError) {
      return response.status(400).json({
        error: "Invalid request.",
        details: error.issues.map((issue) => ({ field: issue.path.join("."), message: issue.message })),
      });
    }
    if (error?.code === 11000) {
      return response.status(409).json({ error: "That class already exists." });
    }
    if (error?.statusCode === 401 || error?.statusCode === 403) {
      return response.status(error.statusCode).json({ error: "A valid Auth0 access token is required." });
    }
    if (error?.message === "Origin is not allowed by CORS.") {
      return response.status(403).json({ error: error.message });
    }
    if (error?.type === "entity.parse.failed") {
      return response.status(400).json({ error: "Request body must be valid JSON." });
    }
    if (error?.type === "entity.too.large") {
      return response.status(413).json({ error: "Request body is too large." });
    }
    console.error("Unhandled API error.", error);
    return response.status(500).json({ error: "An unexpected server error occurred." });
  });

  return app;
}
