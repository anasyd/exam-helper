import "dotenv/config";
import { z } from "zod";

const schema = z.object({
  PORT: z.string().default("4000").transform(Number),
  NODE_ENV: z.enum(["development", "production"]).default("development"),

  MONGODB_URI: z.string().startsWith("mongodb"),

  BETTER_AUTH_SECRET: z
    .string()
    .min(32, "generate with: openssl rand -base64 32"),
  BETTER_AUTH_URL: z.string().url(),
  FRONTEND_URL: z.string().url(),

  GOOGLE_CLIENT_ID: z.string().min(1),
  GOOGLE_CLIENT_SECRET: z.string().min(1),

  RESEND_API_KEY: z.string().startsWith("re_"),
  RESEND_FROM_EMAIL: z.string().email(),
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  console.error(
    "Invalid env:",
    JSON.stringify(parsed.error.flatten().fieldErrors, null, 2),
  );
  process.exit(1);
}

export const config = parsed.data;
export type Config = typeof config;
