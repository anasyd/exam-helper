import { Router } from "express";
import { createHmac } from "crypto";
import { config } from "../config.js";
import { userCol, byId } from "../db.js";
import { logger } from "../logger.js";

export const emailPrefsRouter = Router();

// Signed token so unsubscribe works without login.
// Token = HMAC-SHA256(secret, "unsub:" + userId), base64url-encoded.
export function signUnsubToken(userId: string): string {
  return createHmac("sha256", config.BETTER_AUTH_SECRET)
    .update(`unsub:${userId}`)
    .digest("base64url");
}

export function buildUnsubscribeUrl(userId: string): string {
  return `${config.FRONTEND_URL}/unsubscribe?uid=${encodeURIComponent(userId)}&sig=${encodeURIComponent(signUnsubToken(userId))}`;
}

function verifyToken(uid: string, sig: string): boolean {
  return signUnsubToken(uid) === sig;
}

// POST /api/email/unsubscribe — no session required
emailPrefsRouter.post("/unsubscribe", async (req, res) => {
  const { uid, sig } = req.body ?? {};
  if (!uid || !sig) { res.status(400).json({ error: "uid and sig required" }); return; }
  if (!verifyToken(uid, sig)) { res.status(403).json({ error: "Invalid token" }); return; }

  const result = await userCol().updateOne(byId(uid), {
    $set: { emailUnsubscribed: true, emailUnsubscribedAt: new Date() },
  });
  if (result.matchedCount === 0) { res.status(404).json({ error: "User not found" }); return; }

  logger.info({ uid }, "user unsubscribed from emails");
  res.json({ ok: true });
});

// POST /api/email/resubscribe — no session required, same token
emailPrefsRouter.post("/resubscribe", async (req, res) => {
  const { uid, sig } = req.body ?? {};
  if (!uid || !sig) { res.status(400).json({ error: "uid and sig required" }); return; }
  if (!verifyToken(uid, sig)) { res.status(403).json({ error: "Invalid token" }); return; }

  const result = await userCol().updateOne(byId(uid), {
    $set: { emailUnsubscribed: false },
    $unset: { emailUnsubscribedAt: "" },
  });
  if (result.matchedCount === 0) { res.status(404).json({ error: "User not found" }); return; }

  logger.info({ uid }, "user resubscribed to emails");
  res.json({ ok: true });
});

// GET /api/email/status — check subscription status (used by frontend)
emailPrefsRouter.get("/status", async (req, res) => {
  const { uid, sig } = req.query as Record<string, string>;
  if (!uid || !sig) { res.status(400).json({ error: "uid and sig required" }); return; }
  if (!verifyToken(uid, sig)) { res.status(403).json({ error: "Invalid token" }); return; }

  const user = await userCol().findOne(byId(uid), { projection: { emailUnsubscribed: 1 } });
  if (!user) { res.status(404).json({ error: "User not found" }); return; }

  res.json({ unsubscribed: !!(user as any).emailUnsubscribed });
});
