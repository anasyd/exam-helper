import type { Request, Response, NextFunction } from "express";
import { randomUUID } from "node:crypto";

export function requestId(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const existing = req.header("x-request-id");
  const id = existing ?? randomUUID();
  res.setHeader("X-Request-Id", id);
  // Attach for downstream middleware/logging
  (req as Request & { requestId: string }).requestId = id;
  next();
}
