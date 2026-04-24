import Stripe from "stripe";
import { Router, type Request, type Response } from "express";
import { fromNodeHeaders } from "better-auth/node";
import { auth } from "../auth.js";
import { userCol, byId } from "../db.js";
import { config } from "../config.js";
import { logger } from "../logger.js";
import { requireAuth, type AuthedRequest } from "../middleware/auth-guard.js";
import type { Tier } from "../tiers.js";

export const stripeRouter = Router();
stripeRouter.use(requireAuth);

const stripe = new Stripe(config.STRIPE_SECRET_KEY!);

function priceToTier(priceId: string): Tier | null {
  const map: Record<string, Tier> = {};
  if (config.STRIPE_STUDENT_MONTHLY_PRICE_ID) map[config.STRIPE_STUDENT_MONTHLY_PRICE_ID] = "student";
  if (config.STRIPE_STUDENT_YEARLY_PRICE_ID) map[config.STRIPE_STUDENT_YEARLY_PRICE_ID] = "student";
  if (config.STRIPE_PRO_MONTHLY_PRICE_ID) map[config.STRIPE_PRO_MONTHLY_PRICE_ID] = "pro";
  if (config.STRIPE_PRO_YEARLY_PRICE_ID) map[config.STRIPE_PRO_YEARLY_PRICE_ID] = "pro";
  return map[priceId] ?? null;
}

// POST /api/stripe/checkout — create a Stripe Checkout session
stripeRouter.post("/checkout", async (req, res) => {
  const { userId } = req as unknown as AuthedRequest;
  const { tier, interval } = req.body as { tier: string; interval: string };

  const priceId =
    tier === "student"
      ? interval === "year"
        ? config.STRIPE_STUDENT_YEARLY_PRICE_ID
        : config.STRIPE_STUDENT_MONTHLY_PRICE_ID
      : interval === "year"
        ? config.STRIPE_PRO_YEARLY_PRICE_ID
        : config.STRIPE_PRO_MONTHLY_PRICE_ID;

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
    cancel_url: `${config.FRONTEND_URL}/pricing`,
  });

  res.json({ url: session.url });
});

// POST /api/stripe/portal — open Stripe Customer Portal
stripeRouter.post("/portal", async (req, res) => {
  const { userId } = req as unknown as AuthedRequest;
  const user = await userCol().findOne(byId(userId));
  const customerId = (user as any)?.stripeCustomerId as string | undefined;
  if (!customerId) {
    res.status(400).json({ error: "No active subscription" });
    return;
  }

  const session = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: `${config.FRONTEND_URL}/app/profile`,
  });

  res.json({ url: session.url });
});

// Webhook — exported so index.ts can mount it with raw body parsing before express.json()
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
      const tier = session.metadata?.tier as Tier | undefined;
      if (!userId || !tier) return;

      const customerId = session.customer as string;

      await userCol().updateOne(byId(userId), {
        $set: { planTier: tier, stripeCustomerId: customerId, updatedAt: new Date() },
      });
      logger.info({ userId, tier }, "stripe checkout complete, tier upgraded");
      break;
    }

    case "customer.subscription.updated": {
      const sub = event.data.object as Stripe.Subscription;
      const customerId = sub.customer as string;
      const priceId = sub.items.data[0]?.price.id;
      const tier = priceId ? priceToTier(priceId) : null;
      if (!tier) return;

      await userCol().updateOne(
        { stripeCustomerId: customerId } as any,
        { $set: { planTier: tier, updatedAt: new Date() } },
      );
      logger.info({ customerId, tier }, "stripe subscription updated");
      break;
    }

    case "customer.subscription.deleted": {
      const sub = event.data.object as Stripe.Subscription;
      const customerId = sub.customer as string;

      await userCol().updateOne(
        { stripeCustomerId: customerId } as any,
        { $set: { planTier: "free", planExpiresAt: null, updatedAt: new Date() } },
      );
      logger.info({ customerId }, "stripe subscription cancelled, downgraded to free");
      break;
    }
  }
}
