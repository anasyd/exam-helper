import { Router } from "express";
import { fromNodeHeaders } from "better-auth/node";
import { auth } from "../auth.js";
import { mongo, userCol } from "../db.js";
import { TIER_LIMITS, type Tier } from "../tiers.js";

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
  const dbUser = await userCol().findOne({ id });
  const tier = ((dbUser?.planTier as Tier) ?? "free");
  const limits = TIER_LIMITS[tier];

  const projectCount = await mongo.db().collection("projects").countDocuments({ userId: id });

  res.json({
    user: { id, email, emailVerified, name, image, createdAt },
    planTier: tier,
    planExpiresAt: dbUser?.planExpiresAt ?? null,
    usage: { projects: projectCount, limits },
  });
});
