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

  GOOGLE_CLIENT_ID: z.string().min(1).optional(),
  GOOGLE_CLIENT_SECRET: z.string().min(1).optional(),

  RESEND_API_KEY: z.string().startsWith("re_").optional(),
  RESEND_FROM_EMAIL: z.string().email().optional(),

  REGISTRATION_MODE: z.enum(["open", "invite-only"]).default("open"),
  ADMIN_EMAIL: z.string().email().optional(),
  ADMIN_PASSWORD: z.string().min(8).optional(),

  // Stripe — all optional; billing is disabled when STRIPE_SECRET_KEY is absent
  STRIPE_SECRET_KEY: z.string().startsWith("sk_").optional(),
  STRIPE_WEBHOOK_SECRET: z.string().startsWith("whsec_").optional(),
  STRIPE_STUDENT_MONTHLY_PRICE_ID: z.string().optional(),
  STRIPE_STUDENT_YEARLY_PRICE_ID: z.string().optional(),
  STRIPE_PRO_MONTHLY_PRICE_ID: z.string().optional(),
  STRIPE_PRO_YEARLY_PRICE_ID: z.string().optional(),
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
