import Stripe from "stripe";
import type { Request, Response } from "express";
import { userCol, byId } from "../db.js";
import { config } from "../config.js";
import { logger } from "../logger.js";
import type { AuthedRequest } from "../middleware/auth-guard.js";
import type { Tier } from "../tiers.js";

const stripe = new Stripe(config.STRIPE_SECRET_KEY!);

function priceToTier(priceId: string): Tier | null {
  const map: Record<string, Tier> = {};
  if (config.STRIPE_STUDENT_MONTHLY_PRICE_ID) map[config.STRIPE_STUDENT_MONTHLY_PRICE_ID] = "student";
  if (config.STRIPE_STUDENT_YEARLY_PRICE_ID)  map[config.STRIPE_STUDENT_YEARLY_PRICE_ID]  = "student";
  if (config.STRIPE_PRO_MONTHLY_PRICE_ID)     map[config.STRIPE_PRO_MONTHLY_PRICE_ID]     = "pro";
  if (config.STRIPE_PRO_YEARLY_PRICE_ID)      map[config.STRIPE_PRO_YEARLY_PRICE_ID]      = "pro";
  return map[priceId] ?? null;
}

export async function handleCheckout(req: Request, res: Response): Promise<void> {
  const { userId } = req as unknown as AuthedRequest;
  const { tier, interval } = req.body as { tier: string; interval: string };

  const priceId =
    tier === "student"
      ? interval === "year" ? config.STRIPE_STUDENT_YEARLY_PRICE_ID : config.STRIPE_STUDENT_MONTHLY_PRICE_ID
      : interval === "year" ? config.STRIPE_PRO_YEARLY_PRICE_ID      : config.STRIPE_PRO_MONTHLY_PRICE_ID;

  if (!priceId) {
    res.status(400).json({ error: "Invalid tier or interval" });
    return;
  }

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    line_items: [{ price: priceId, quantity: 1 }],
    client_reference_id: userId,
    metadata: { userId, tier },
    allow_promotion_codes: true,
    success_url: `${config.FRONTEND_URL}/app?checkout=success`,
    cancel_url:  `${config.FRONTEND_URL}/pricing`,
  });

  res.json({ url: session.url });
}

export async function handlePortal(req: Request, res: Response): Promise<void> {
  const { userId } = req as unknown as AuthedRequest;
  const user = await userCol().findOne(byId(userId));
  const customerId = (user as Record<string, unknown>)?.stripeCustomerId as string | undefined;
  if (!customerId) {
    res.status(400).json({ error: "No active subscription found. Subscribe first." });
    return;
  }

  const session = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: `${config.FRONTEND_URL}/app/settings`,
  });

  res.json({ url: session.url });
}

// Exported for raw-body webhook mounting in index.ts
export async function webhookHandler(req: Request, res: Response): Promise<void> {
  const sig = req.headers["stripe-signature"] as string;
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(req.body as Buffer, sig, config.STRIPE_WEBHOOK_SECRET!);
  } catch {
    res.status(400).send("Webhook signature verification failed");
    return;
  }
  try {
    await handleEvent(event);
    res.json({ received: true });
  } catch (err) {
    logger.error({ err, type: event.type }, "stripe webhook error");
    res.status(500).json({ error: "Internal error" });
  }
}

async function handleEvent(event: Stripe.Event): Promise<void> {
  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const userId = session.client_reference_id ?? session.metadata?.userId;
      const tier   = session.metadata?.tier as Tier | undefined;
      if (!userId || !tier) return;
      await userCol().updateOne(byId(userId), {
        $set: { planTier: tier, stripeCustomerId: session.customer as string, updatedAt: new Date() },
      });
      logger.info({ userId, tier }, "stripe checkout complete");
      break;
    }
    case "customer.subscription.updated": {
      const sub  = event.data.object as Stripe.Subscription;
      const tier = priceToTier(sub.items.data[0]?.price.id ?? "");
      if (!tier) return;
      await userCol().updateOne(
        { stripeCustomerId: sub.customer as string } as never,
        { $set: { planTier: tier, updatedAt: new Date() } },
      );
      break;
    }
    case "customer.subscription.deleted": {
      const sub = event.data.object as Stripe.Subscription;
      await userCol().updateOne(
        { stripeCustomerId: sub.customer as string } as never,
        { $set: { planTier: "free", planExpiresAt: null, updatedAt: new Date() } },
      );
      logger.info({ customer: sub.customer }, "stripe subscription cancelled");
      break;
    }
  }
}
