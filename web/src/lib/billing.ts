// NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY → Stripe provider
// NEXT_PUBLIC_BILLING_PROVIDER=lemonsqueezy → Lemon Squeezy provider
// If neither is set, billing UI is hidden (self-hosted / dev).

export type BillingProvider = "stripe" | "lemonsqueezy";

export const BILLING_PROVIDER: BillingProvider | null =
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
    ? "stripe"
    : process.env.NEXT_PUBLIC_BILLING_PROVIDER === "lemonsqueezy"
      ? "lemonsqueezy"
      : null;

export const BILLING_ENABLED = BILLING_PROVIDER !== null;

export const BILLING_PROVIDER_NAME: string =
  BILLING_PROVIDER === "lemonsqueezy" ? "Lemon Squeezy" : "Stripe";
