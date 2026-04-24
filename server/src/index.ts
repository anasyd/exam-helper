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
import { setupRouter } from "./routes/setup.js";
import { adminRouter } from "./routes/admin.js";
import { demoRouter } from "./routes/demo.js";
// stripe is dynamically imported only when STRIPE_SECRET_KEY is set — avoids crash on startup

async function autoCreateAdmin(): Promise<void> {
  const { config } = await import("./config.js");
  const { userCol } = await import("./db.js");
  const { auth } = await import("./auth.js");
  if (!config.ADMIN_EMAIL || !config.ADMIN_PASSWORD) return;
  const existing = await userCol().findOne({ planTier: "admin" });
  if (existing) return;
  const response = await auth.api.signUpEmail({
    body: { email: config.ADMIN_EMAIL, password: config.ADMIN_PASSWORD, name: "Admin" },
    asResponse: true,
  });
  if (response.ok) {
    const body = await response.json().catch(() => ({})) as { user?: { id?: string } };
    const userId = body.user?.id;
    if (userId) {
      const { byId } = await import("./db.js");
      await userCol().updateOne(byId(userId), { $set: { planTier: "admin" } });
    } else {
      await userCol().updateOne({ email: config.ADMIN_EMAIL.toLowerCase() }, { $set: { planTier: "admin" } });
    }
    logger.info({ email: config.ADMIN_EMAIL }, "auto-created admin account");
  } else {
    logger.warn({ email: config.ADMIN_EMAIL, status: response.status }, "auto-create admin failed");
  }
}

async function main(): Promise<void> {
  await connectDb();

  await autoCreateAdmin();

  const app = express();
  app.set("trust proxy", 1);

  app.use(requestId);
  app.use(corsMiddleware);

  // Better Auth's handler must come BEFORE express.json() — it parses request bodies itself.
  app.all("/api/auth/*", toNodeHandler(auth));

  // Stripe: dynamic import so the module (and `new Stripe(key)`) never loads when key is absent
  if (config.STRIPE_SECRET_KEY) {
    const { stripeRouter, webhookHandler } = await import("./routes/stripe.js");
    app.post("/api/stripe/webhook", express.raw({ type: "application/json" }), webhookHandler);
    app.use("/api/stripe", stripeRouter);
  }

  // Projects can include large PDF text blobs; files router uses multer (no JSON limit needed there)
  app.use("/api/projects", express.json({ limit: "20mb" }));
  app.use(express.json({ limit: "64kb" }));

  app.use("/api/setup", setupRouter);
  app.use("/api/health", healthRouter);
  app.use("/api/me", meRouter);
  app.use("/api/me/stats", statsRouter);
  app.use("/api/projects", projectsRouter);
  app.use("/api/files", filesRouter);
  app.use("/api/admin", adminRouter);
  app.use("/api/demo", demoRouter);

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
