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

  GOOGLE_CLIENT_ID: z.preprocess(v => v || undefined, z.string().min(1).optional()),
  GOOGLE_CLIENT_SECRET: z.preprocess(v => v || undefined, z.string().min(1).optional()),

  RESEND_API_KEY: z.preprocess(v => v || undefined, z.string().startsWith("re_").optional()),
  RESEND_FROM_EMAIL: z.preprocess(v => v || undefined, z.string().email().optional()),

  REGISTRATION_MODE: z.enum(["open", "invite-only"]).default("open"),
  ADMIN_EMAIL: z.preprocess(v => v || undefined, z.string().email().optional()),
  ADMIN_PASSWORD: z.preprocess(v => v || undefined, z.string().min(8).optional()),

  // Stripe — all optional; billing is disabled when STRIPE_SECRET_KEY is absent
  STRIPE_SECRET_KEY: z.string().startsWith("sk_").optional(),
  STRIPE_WEBHOOK_SECRET: z.string().startsWith("whsec_").optional(),
  STRIPE_STUDENT_MONTHLY_PRICE_ID: z.string().optional(),
  STRIPE_STUDENT_YEARLY_PRICE_ID: z.string().optional(),
  STRIPE_PRO_MONTHLY_PRICE_ID: z.string().optional(),
  STRIPE_PRO_YEARLY_PRICE_ID: z.string().optional(),

  // Lemon Squeezy — alternative billing provider (mutually exclusive with Stripe)
  LS_API_KEY: z.string().optional(),
  LS_WEBHOOK_SECRET: z.string().optional(),
  LS_STORE_ID: z.string().optional(),
  LS_STUDENT_MONTHLY_VARIANT_ID: z.string().optional(),
  LS_STUDENT_YEARLY_VARIANT_ID: z.string().optional(),
  LS_PRO_MONTHLY_VARIANT_ID: z.string().optional(),
  LS_PRO_YEARLY_VARIANT_ID: z.string().optional(),
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
