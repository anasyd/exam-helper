// Billing/Stripe is only active when NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY is set.
// Self-hosted instances that don't set this env var get no pricing page, no upgrade CTAs.
export const BILLING_ENABLED = Boolean(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY);
