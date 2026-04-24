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

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    res.status(response.status).json(body);
    return;
  }

  // Promote to admin
  await userCol().updateOne({ email }, { $set: { planTier: "admin" } });

  logger.info({ email }, "admin account created via setup wizard");
  res.json({ ok: true });
});
