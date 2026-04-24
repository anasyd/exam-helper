import { Router } from "express";
import type { Request, Response, NextFunction } from "express";
import { fromNodeHeaders } from "better-auth/node";
import { auth } from "../auth.js";
import { userCol, db, byId, ObjectId } from "../db.js";
import { logger } from "../logger.js";
import { hashPassword } from "better-auth/crypto";
import type { Tier } from "../tiers.js";
import { config } from "../config.js";
import { sendEmail } from "../email/resend.js";
import { broadcastEmail } from "../email/templates.js";

export const adminRouter = Router();

// Middleware: require authenticated admin
async function requireAdmin(req: Request, res: Response, next: NextFunction): Promise<void> {
  const session = await auth.api.getSession({ headers: fromNodeHeaders(req.headers) });
  if (!session?.user) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const dbUser = await userCol().findOne(byId(session.user.id));
  if (dbUser?.planTier !== "admin") {
    res.status(403).json({ error: "Forbidden" });
    return;
  }
  next();
}

adminRouter.use(requireAdmin);

// GET /api/admin/users — list all users
adminRouter.get("/users", async (_req, res) => {
  const users = await userCol()
    .find({}, { projection: { email: 1, name: 1, planTier: 1, createdAt: 1, emailVerified: 1 } })
    .sort({ createdAt: -1 })
    .toArray();
  res.json(users.map(u => ({
    id: u._id.toString(),
    email: u.email,
    name: u.name,
    planTier: u.planTier,
    createdAt: u.createdAt,
    emailVerified: u.emailVerified,
  })));
});

// POST /api/admin/users — create a new user (bypasses registration mode)
adminRouter.post("/users", async (req, res) => {
  const { email, password, name, planTier = "free" } = req.body ?? {};
  if (!email || !password || !name) {
    res.status(400).json({ error: "email, password, and name are required" });
    return;
  }
  if (password.length < 8) {
    res.status(400).json({ error: "Password must be at least 8 characters" });
    return;
  }

  const existing = await userCol().findOne({ email });
  if (existing) {
    res.status(409).json({ error: "Email already in use" });
    return;
  }

  const userOid = new ObjectId();
  const userId = userOid.toHexString();
  const hashedPassword = await hashPassword(password);
  const now = new Date();

  await userCol().insertOne({
    _id: userOid,
    email,
    name,
    emailVerified: true,
    planTier: planTier as Tier,
    createdAt: now,
    updatedAt: now,
  } as any);

  await db().collection("account").insertOne({
    _id: new ObjectId(),
    userId,
    accountId: email,
    providerId: "credential",
    password: hashedPassword,
    createdAt: now,
    updatedAt: now,
  });

  logger.info({ email, planTier }, "admin created user");
  res.json({ ok: true, userId });
});

// PATCH /api/admin/users/:id — update a user's plan tier
adminRouter.patch("/users/:id", async (req, res) => {
  const { planTier, planExpiresAt } = req.body ?? {};
  const update: Record<string, unknown> = { updatedAt: new Date() };
  if (planTier !== undefined) update.planTier = planTier;
  if (planExpiresAt !== undefined) update.planExpiresAt = planExpiresAt;

  const result = await userCol().updateOne(byId(req.params.id), { $set: update });
  if (result.matchedCount === 0) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  res.json({ ok: true });
});

// DELETE /api/admin/users/:id — remove a user
adminRouter.delete("/users/:id", async (req, res) => {
  const result = await userCol().deleteOne(byId(req.params.id));
  if (result.deletedCount === 0) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  logger.info({ userId: req.params.id }, "admin deleted user");
  res.json({ ok: true });
});

// POST /api/admin/email/broadcast — send email to all verified users
adminRouter.post("/email/broadcast", async (req, res) => {
  const { subject, message } = req.body ?? {};
  if (!subject?.trim() || !message?.trim()) {
    res.status(400).json({ error: "subject and message are required" });
    return;
  }
  if (!config.RESEND_API_KEY || !config.RESEND_FROM_EMAIL) {
    res.status(503).json({ error: "Email is not configured on this instance" });
    return;
  }

  const users = await userCol()
    .find({ emailVerified: true }, { projection: { email: 1, name: 1 } })
    .toArray();

  let sent = 0;
  for (const user of users) {
    try {
      await sendEmail({
        to: user.email as string,
        subject: subject.trim(),
        html: broadcastEmail({ name: user.name as string, message: message.trim() }),
      });
      sent++;
    } catch (err) {
      logger.error({ err, userId: user._id }, "broadcast failed for user");
    }
  }

  logger.info({ sent, total: users.length, subject }, "broadcast email sent");
  res.json({ ok: true, sent, total: users.length });
});

// GET /api/admin/email/recipients — count of verified users (broadcast preview)
adminRouter.get("/email/recipients", async (_req, res) => {
  const count = await userCol().countDocuments({ emailVerified: true });
  res.json({ count });
});
