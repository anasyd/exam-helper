// NEXT_PUBLIC_BILLING_PROVIDER=stripe|lemonsqueezy enables billing UI.
// If unset (self-hosted default), the pricing page and upgrade CTAs are hidden.

export type BillingProvider = "stripe" | "lemonsqueezy";

export const BILLING_PROVIDER: BillingProvider | null =
  process.env.NEXT_PUBLIC_BILLING_PROVIDER === "stripe"
    ? "stripe"
    : process.env.NEXT_PUBLIC_BILLING_PROVIDER === "lemonsqueezy"
      ? "lemonsqueezy"
      : null;

export const BILLING_ENABLED = BILLING_PROVIDER !== null;

export const BILLING_PROVIDER_NAME: string =
  BILLING_PROVIDER === "lemonsqueezy" ? "Lemon Squeezy" : "Stripe";
