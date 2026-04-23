import type { Request, Response, NextFunction } from "express";
import { fromNodeHeaders } from "better-auth/node";
import { auth } from "../auth.js";

export interface AuthedRequest extends Request {
  userId: string;
}

export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const session = await auth.api.getSession({
    headers: fromNodeHeaders(req.headers),
  });
  if (!session?.user) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  (req as AuthedRequest).userId = session.user.id;
  next();
}
