import { Router } from "express";
import { userCol } from "../db.js";
import { auth } from "../auth.js";
import { logger } from "../logger.js";

export const setupRouter = Router();

// GET /api/setup — returns { required: true } if no admin exists yet
setupRouter.get("/", async (_req, res) => {
  const admin = await userCol().findOne({ planTier: "admin" });
  res.json({ required: !admin });
});

// POST /api/setup — creates the first admin account (one-time only)
setupRouter.post("/", async (req, res) => {
  const admin = await userCol().findOne({ planTier: "admin" });
  if (admin) {
    res.status(409).json({ error: "Already set up" });
    return;
  }

  const { email, password, name } = req.body ?? {};
  if (!email || !password || !name) {
    res.status(400).json({ error: "email, password, and name are required" });
    return;
  }
  if (password.length < 8) {
    res.status(400).json({ error: "Password must be at least 8 characters" });
    return;
  }

  // Use Better Auth's sign-up (beforeSignUp allows it since no admin exists yet)
  const response = await auth.api.signUpEmail({
    body: { email, password, name },
    asResponse: true,
  });

  const body = await response.json().catch(() => ({})) as { user?: { id?: string } };

  if (!response.ok) {
    res.status(response.status).json(body);
    return;
  }

  // Promote to admin — use the user ID from the response so the query is
  // case-insensitive (Better Auth normalises email to lowercase on insert,
  // so matching by the raw email string can miss).
  const userId = body.user?.id;
  const result = userId
    ? await userCol().updateOne({ id: userId }, { $set: { planTier: "admin" } })
    : await userCol().updateOne({ email: (email as string).toLowerCase() }, { $set: { planTier: "admin" } });

  if (result.modifiedCount === 0) {
    logger.warn({ email, userId }, "setup: admin promotion matched 0 documents");
  }

  logger.info({ email, userId }, "admin account created via setup wizard");
  res.json({ ok: true });
});
