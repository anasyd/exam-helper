import { Router } from "express";
import { requireAuth, type AuthedRequest } from "../middleware/auth-guard.js";
import { db } from "../db.js";

export const statsRouter = Router();
statsRouter.use(requireAuth);

function col() {
  return db().collection<{ userId: string; currentStreak: number; lastStudiedDate: string | null; updatedAt: Date }>("userStats");
}

statsRouter.get("/", async (req, res) => {
  const { userId } = req as AuthedRequest;
  const doc = await col().findOne({ userId }, { projection: { _id: 0 } });
  res.json(doc ?? { currentStreak: 0, lastStudiedDate: null });
});

statsRouter.put("/", async (req, res) => {
  const { userId } = req as AuthedRequest;
  const { currentStreak, lastStudiedDate } = req.body as { currentStreak: number; lastStudiedDate: string | null };
  await col().updateOne(
    { userId },
    { $set: { userId, currentStreak: currentStreak ?? 0, lastStudiedDate: lastStudiedDate ?? null, updatedAt: new Date() } },
    { upsert: true },
  );
  res.json({ ok: true });
});
