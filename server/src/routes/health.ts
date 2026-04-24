import { Router } from "express";
import { db } from "../db.js";

export const healthRouter = Router();

healthRouter.get("/", async (_req, res) => {
  try {
    await db().command({ ping: 1 });
    res.json({ ok: true });
  } catch (err) {
    res.status(503).json({
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    });
  }
});
