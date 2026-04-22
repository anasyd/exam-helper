import type { Request, Response, NextFunction } from "express";
import { logger } from "../logger.js";

export function errorHandler(
  err: unknown,
  req: Request,
  res: Response,
  // Express requires 4 args to detect error middleware; keep _next.
  _next: NextFunction,
): void {
  const requestId = (req as Request & { requestId?: string }).requestId;
  const message = err instanceof Error ? err.message : String(err);
  logger.error({ err: message, requestId, path: req.path }, "request failed");

  if (res.headersSent) return;

  const status =
    err instanceof Error && /CORS blocked/.test(err.message) ? 403 : 500;
  res.status(status).json({
    error: status === 500 ? "Internal server error" : message,
    code: status === 500 ? "internal" : "cors",
    requestId,
  });
}
