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
import { buildUnsubscribeUrl } from "./email-prefs.js";

const LS_API_BASE = "https://api.lemonsqueezy.com/v1";
async function lsCancelSubscription(subscriptionId: string): Promise<void> {
  const res = await fetch(`${LS_API_BASE}/subscriptions/${subscriptionId}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${config.LS_API_KEY}`,
      Accept: "application/vnd.api+json",
    },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`LS cancel failed ${res.status}: ${body}`);
  }
}

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
    .find({}, { projection: { email: 1, name: 1, planTier: 1, createdAt: 1, emailVerified: 1, emailUnsubscribed: 1 } })
    .sort({ createdAt: -1 })
    .toArray();
  res.json(users.map(u => ({
    id: u._id.toString(),
    email: u.email,
    name: u.name,
    planTier: u.planTier,
    createdAt: u.createdAt,
    emailVerified: u.emailVerified,
    emailUnsubscribed: !!(u as any).emailUnsubscribed,
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
  const { planTier, planExpiresAt, clearBilling } = req.body ?? {};
  const update: Record<string, unknown> = { updatedAt: new Date() };
  if (planTier !== undefined) update.planTier = planTier;
  if (planExpiresAt !== undefined) update.planExpiresAt = planExpiresAt;
  if (clearBilling) {
    update.planTier = "free";
    update.planExpiresAt = null;
    update.lsSubscriptionId = null;
    update.lsCustomerPortalUrl = null;
    update.lsCancelledAt = null;
    update.stripeCustomerId = null;
    update.stripeSubscriptionId = null;
  }

  // If downgrading to free, cancel any active LS subscription so they stop being charged
  if (planTier === "free" && config.LS_API_KEY) {
    const target = await userCol().findOne(byId(req.params.id));
    const subscriptionId = (target as Record<string, unknown>)?.lsSubscriptionId as string | undefined;
    if (subscriptionId) {
      try {
        await lsCancelSubscription(subscriptionId);
        update.lsCancelledAt = null;
        logger.info({ userId: req.params.id, subscriptionId }, "admin downgrade: cancelled LS subscription");
      } catch (err) {
        logger.error({ err, userId: req.params.id, subscriptionId }, "admin downgrade: failed to cancel LS subscription");
        res.status(500).json({ error: "Failed to cancel subscription in Lemon Squeezy" });
        return;
      }
    }
  }

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
  const { subject, message, ctaLabel, ctaUrl } = req.body ?? {};
  if (!subject?.trim() || !message?.trim()) {
    res.status(400).json({ error: "subject and message are required" });
    return;
  }
  if (!config.RESEND_API_KEY || !config.RESEND_FROM_EMAIL) {
    res.status(503).json({ error: "Email is not configured on this instance" });
    return;
  }

  const users = await userCol()
    .find({ emailUnsubscribed: { $ne: true } }, { projection: { email: 1, name: 1 } })
    .toArray();

  let sent = 0;
  for (const user of users) {
    const userId = user._id.toHexString();
    try {
      const personalizedMessage = message.trim()
        .replace(/\{\{name\}\}/gi, (user.name as string | null) ?? "there")
        .replace(/\{\{email\}\}/gi, user.email as string);
      await sendEmail({
        to: user.email as string,
        subject: subject.trim(),
        html: broadcastEmail({
          name: user.name as string,
          message: personalizedMessage,
          unsubscribeUrl: buildUnsubscribeUrl(userId),
          ctaLabel: ctaLabel?.trim() || undefined,
          ctaUrl: ctaUrl?.trim() || undefined,
        }),
      });
      sent++;
    } catch (err) {
      logger.error({ err, userId: user._id }, "broadcast failed for user");
    }
  }

  logger.info({ sent, total: users.length, subject }, "broadcast email sent");
  res.json({ ok: true, sent, total: users.length });
});

// GET /api/admin/email/recipients — count of subscribed users
adminRouter.get("/email/recipients", async (_req, res) => {
  const total = await userCol().countDocuments({});
  const subscribed = await userCol().countDocuments({ emailUnsubscribed: { $ne: true } });
  const unsubscribed = total - subscribed;
  res.json({ count: subscribed, total, unsubscribed });
});

// GET /api/admin/analytics — aggregate metrics for admin dashboard
adminRouter.get("/analytics", async (_req, res) => {
  const now = Date.now();
  const [
    totalUsers,
    tierAgg,
    newUsers7d,
    newUsers30d,
    emailAgg,
    totalProjects,
    jobAgg,
  ] = await Promise.all([
    userCol().countDocuments({}),
    userCol().aggregate<{ _id: string | null; count: number }>([
      { $group: { _id: "$planTier", count: { $sum: 1 } } },
    ]).toArray(),
    userCol().countDocuments({ createdAt: { $gte: new Date(now - 7 * 86_400_000) } }),
    userCol().countDocuments({ createdAt: { $gte: new Date(now - 30 * 86_400_000) } }),
    userCol().aggregate<{ _id: boolean | null; count: number }>([
      { $group: { _id: "$emailUnsubscribed", count: { $sum: 1 } } },
    ]).toArray(),
    db().collection("projects").countDocuments({}),
    db().collection("jobs").aggregate<{ _id: string | null; count: number }>([
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]).toArray(),
  ]);

  const byTier: Record<string, number> = {};
  for (const row of tierAgg) byTier[row._id ?? "free"] = row.count;

  const emailSubscribed = emailAgg.find((r) => !r._id)?.count ?? 0;
  const emailUnsubscribed = emailAgg.find((r) => r._id === true)?.count ?? 0;

  const jobsByStatus: Record<string, number> = {};
  for (const row of jobAgg) jobsByStatus[row._id ?? "unknown"] = row.count;

  res.json({
    users: {
      total: totalUsers,
      newLast7d: newUsers7d,
      newLast30d: newUsers30d,
      byTier,
    },
    email: { subscribed: emailSubscribed, unsubscribed: emailUnsubscribed },
    projects: { total: totalProjects },
    jobs: jobsByStatus,
    uptimeSeconds: process.uptime(),
  });
});
