import { Router } from "express";
import { fromNodeHeaders } from "better-auth/node";
import { auth } from "../auth.js";
import { db, userCol, byId, filesBucket, contentCol, jobsCol } from "../db.js";
import { TIER_LIMITS, type Tier } from "../tiers.js";
import { config } from "../config.js";
import { sendEmail } from "../email/resend.js";
import { welcomeEmail } from "../email/templates.js";
import { logger } from "../logger.js";

export const meRouter = Router();

meRouter.get("/", async (req, res) => {
  const session = await auth.api.getSession({
    headers: fromNodeHeaders(req.headers),
  });
  if (!session?.user) {
    res.status(401).json({ user: null });
    return;
  }

  const { id, email, emailVerified, name, image, createdAt } = session.user;
  const dbUser = await userCol().findOne(byId(id));
  const tier = ((dbUser?.planTier as Tier) ?? "free");
  const limits = TIER_LIMITS[tier];

  const projectCount = await db().collection("projects").countDocuments({ userId: id });

  res.json({
    user: { id, email, emailVerified, name, image, createdAt },
    planTier: tier,
    planExpiresAt: dbUser?.planExpiresAt ?? null,
    planCancelledAt: (dbUser as any)?.lsCancelledAt ?? null,
    cardBrand: (dbUser as any)?.lsCardBrand ?? null,
    cardLast4: (dbUser as any)?.lsCardLast4 ?? null,
    usage: { projects: projectCount, limits },
  });
});

// POST /api/me/on-verified — send welcome email once after email verification
meRouter.post("/on-verified", async (req, res) => {
  const session = await auth.api.getSession({ headers: fromNodeHeaders(req.headers) });
  if (!session?.user) { res.status(401).json({}); return; }

  const dbUser = await userCol().findOne(byId(session.user.id));
  if (!dbUser || (dbUser as any).welcomeEmailSent) { res.json({ ok: true }); return; }

  if (config.RESEND_API_KEY && config.RESEND_FROM_EMAIL) {
    await sendEmail({
      to: session.user.email,
      subject: "Welcome to exam-helper!",
      html: welcomeEmail({ name: session.user.name, appUrl: `${config.FRONTEND_URL}/app` }),
    }).catch(() => {});
  }

  await userCol().updateOne(byId(session.user.id), { $set: { welcomeEmailSent: true } });
  res.json({ ok: true });
});

// GET /api/me/email-prefs — return email notification preferences
meRouter.get("/email-prefs", async (req, res) => {
  const session = await auth.api.getSession({ headers: fromNodeHeaders(req.headers) });
  if (!session?.user) { res.status(401).json({}); return; }
  const dbUser = await userCol().findOne(byId(session.user.id));
  res.json({
    productUpdates: !(dbUser as any)?.emailUnsubscribed,
  });
});

// PATCH /api/me/email-prefs — update email notification preferences
meRouter.patch("/email-prefs", async (req, res) => {
  const session = await auth.api.getSession({ headers: fromNodeHeaders(req.headers) });
  if (!session?.user) { res.status(401).json({}); return; }
  const { productUpdates } = req.body ?? {};
  if (typeof productUpdates === "boolean") {
    const update = productUpdates
      ? { $set: { emailUnsubscribed: false }, $unset: { emailUnsubscribedAt: "" } }
      : { $set: { emailUnsubscribed: true, emailUnsubscribedAt: new Date() } };
    await userCol().updateOne(byId(session.user.id), update as any);
  }
  res.json({ ok: true });
});

// DELETE /api/me — permanently delete the authenticated user's account and all data
meRouter.delete("/", async (req, res) => {
  const session = await auth.api.getSession({ headers: fromNodeHeaders(req.headers) });
  if (!session?.user) { res.status(401).json({}); return; }
  const userId = session.user.id;

  try {
    // Collect project IDs to delete content + files scoped to them
    const projects = await db().collection("projects").find({ userId }, { projection: { id: 1 } }).toArray();
    const projectIds = projects.map((p) => (p as any).id as string);

    await Promise.all([
      // User record + auth accounts
      userCol().deleteOne(byId(userId)),
      db().collection("account").deleteMany({ userId }),
      db().collection("session").deleteMany({ userId }),
      // Projects and their content
      db().collection("projects").deleteMany({ userId }),
      contentCol().deleteMany({ userId }),
      // Jobs
      jobsCol().deleteMany({ userId }),
    ]);

    // Delete all GridFS files for this user
    const bucket = filesBucket();
    const files = await bucket.find({ "metadata.userId": userId }).toArray();
    await Promise.all(files.map((f) => bucket.delete(f._id)));

    logger.info({ userId, projectCount: projectIds.length, fileCount: files.length }, "user account deleted");
    res.json({ ok: true });
  } catch (err) {
    logger.error({ err, userId }, "failed to delete account");
    res.status(500).json({ error: "Failed to delete account" });
  }
});
