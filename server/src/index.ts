import express from "express";
import { toNodeHandler } from "better-auth/node";
import { config } from "./config.js";
import { logger } from "./logger.js";
import { connectDb, disconnectDb } from "./db.js";
import { auth } from "./auth.js";
import { corsMiddleware } from "./middleware/cors.js";
import { requestId } from "./middleware/request-id.js";
import { errorHandler } from "./middleware/error.js";
import { healthRouter } from "./routes/health.js";
import { meRouter } from "./routes/me.js";
import { projectsRouter } from "./routes/projects.js";
import { filesRouter } from "./routes/files.js";
import { statsRouter } from "./routes/stats.js";

async function main(): Promise<void> {
  await connectDb();

  const app = express();
  app.set("trust proxy", 1);

  app.use(requestId);
  app.use(corsMiddleware);

  // Better Auth's handler must come BEFORE express.json() — it parses request bodies itself.
  app.all("/api/auth/*", toNodeHandler(auth));

  // Projects can include large PDF text blobs; files router uses multer (no JSON limit needed there)
  app.use("/api/projects", express.json({ limit: "20mb" }));
  app.use(express.json({ limit: "64kb" }));

  app.use("/api/health", healthRouter);
  app.use("/api/me", meRouter);
  app.use("/api/me/stats", statsRouter);
  app.use("/api/projects", projectsRouter);
  app.use("/api/files", filesRouter);

  app.use(errorHandler);

  const server = app.listen(config.PORT, () => {
    logger.info({ port: config.PORT, env: config.NODE_ENV }, "server listening");
  });

  const shutdown = async (signal: string) => {
    logger.info({ signal }, "shutting down");
    server.close(async () => {
      await disconnectDb();
      process.exit(0);
    });
    // Fallback if close hangs
    setTimeout(() => process.exit(1), 10_000).unref();
  };

  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));
}

main().catch((err) => {
  console.error("Fatal startup error:", err);
  process.exit(1);
});
