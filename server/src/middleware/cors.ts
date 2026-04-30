import cors from "cors";
import { config } from "../config.js";

const allowed = new Set([config.FRONTEND_URL, "http://localhost:3000"]);

export const corsMiddleware = cors({
  origin(origin, cb) {
    // Allow same-origin (no Origin header) and listed origins
    if (!origin || allowed.has(origin)) return cb(null, true);
    cb(new Error(`CORS blocked: ${origin}`));
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Request-Id"],
  exposedHeaders: ["X-Request-Id"],
});
