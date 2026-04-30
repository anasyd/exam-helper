import crypto from "crypto";
import type { Request, Response } from "express";
import { userCol, byId } from "../db.js";
import { config } from "../config.js";
import { logger } from "../logger.js";
import type { AuthedRequest } from "../middleware/auth-guard.js";
import type { Tier } from "../tiers.js";

const LS_API_BASE = "https://api.lemonsqueezy.com/v1";

async function lsRequest<T>(path: string, opts?: RequestInit): Promise<T> {
  const res = await fetch(`${LS_API_BASE}${path}`, {
    ...opts,
    headers: {
      Authorization: `Bearer ${config.LS_API_KEY}`,
      Accept: "application/vnd.api+json",
      "Content-Type": "application/vnd.api+json",
      ...opts?.headers,
    },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`LS API ${res.status}: ${body}`);
  }
  return res.json() as Promise<T>;
}

function variantToTier(variantId: string | number): Tier | null {
  const id = String(variantId);
  if (config.LS_STUDENT_MONTHLY_VARIANT_ID === id || config.LS_STUDENT_YEARLY_VARIANT_ID === id) return "student";
  if (config.LS_PRO_MONTHLY_VARIANT_ID     === id || config.LS_PRO_YEARLY_VARIANT_ID     === id) return "pro";
  return null;
}

export async function handleCheckout(req: Request, res: Response): Promise<void> {
  const { userId } = req as unknown as AuthedRequest;
  const { tier, interval } = req.body as { tier: string; interval: string };
  const user = await userCol().findOne(byId(userId));

  const variantId =
    tier === "student"
      ? interval === "year" ? config.LS_STUDENT_YEARLY_VARIANT_ID : config.LS_STUDENT_MONTHLY_VARIANT_ID
      : interval === "year" ? config.LS_PRO_YEARLY_VARIANT_ID      : config.LS_PRO_MONTHLY_VARIANT_ID;

  if (!variantId || !config.LS_STORE_ID) {
    res.status(400).json({ error: "Invalid tier or interval" });
    return;
  }

  interface CheckoutResponse {
    data: { attributes: { url: string } };
  }

  const data = await lsRequest<CheckoutResponse>("/checkouts", {
    method: "POST",
    body: JSON.stringify({
      data: {
        type: "checkouts",
        attributes: {
          checkout_data: {
            email: user?.email ?? undefined,
            custom: { user_id: userId },
          },
          product_options: {
            redirect_url:      `${config.FRONTEND_URL}/app?checkout=success`,
            receipt_button_text: "Go to dashboard",
          },
        },
        relationships: {
          store:   { data: { type: "stores",   id: config.LS_STORE_ID } },
          variant: { data: { type: "variants", id: variantId } },
        },
      },
    }),
  });

  res.json({ url: data.data.attributes.url });
}

export async function handlePortal(req: Request, res: Response): Promise<void> {
  const { userId } = req as unknown as AuthedRequest;
  const user = await userCol().findOne(byId(userId));
  const portalUrl = (user as Record<string, unknown>)?.lsCustomerPortalUrl as string | undefined;

  if (!portalUrl) {
    res.status(400).json({ error: "No active subscription" });
    return;
  }

  res.json({ url: portalUrl });
}

interface LsWebhookPayload {
  meta: {
    event_name: string;
    custom_data?: { user_id?: string };
  };
  data: {
    id: string;
    attributes: {
      status: string;
      variant_id: number;
      customer_id: number;
      user_email?: string;
      urls?: { customer_portal?: string };
    };
  };
}

export async function webhookHandler(req: Request, res: Response): Promise<void> {
  const rawBody = req.body as Buffer;
  const signature = req.headers["x-signature"] as string | undefined;

  if (!signature || !config.LS_WEBHOOK_SECRET) {
    res.status(400).send("Missing signature");
    return;
  }

  const digest = crypto.createHmac("sha256", config.LS_WEBHOOK_SECRET).update(rawBody).digest("hex");
  if (!crypto.timingSafeEqual(Buffer.from(digest, "hex"), Buffer.from(signature, "hex"))) {
    res.status(400).send("Webhook signature verification failed");
    return;
  }

  let payload: LsWebhookPayload;
  try {
    payload = JSON.parse(rawBody.toString()) as LsWebhookPayload;
  } catch {
    res.status(400).send("Invalid JSON");
    return;
  }

  try {
    await handleEvent(payload);
    res.json({ received: true });
  } catch (err) {
    logger.error({ err, event: payload.meta.event_name }, "ls webhook error");
    res.status(500).json({ error: "Internal error" });
  }
}

async function handleEvent(payload: LsWebhookPayload): Promise<void> {
  const { event_name, custom_data } = payload.meta;
  const attrs = payload.data.attributes;
  const userId = custom_data?.user_id;

  switch (event_name) {
    case "subscription_created": {
      const tier = variantToTier(attrs.variant_id);
      if (!tier) return;
      const filter = userId
        ? byId(userId)
        : attrs.user_email
          ? ({ email: attrs.user_email.toLowerCase() } as never)
          : null;
      if (!filter) return;
      await userCol().updateOne(filter, {
        $set: {
          planTier: tier,
          lsSubscriptionId: payload.data.id,
          lsCustomerPortalUrl: attrs.urls?.customer_portal ?? null,
          updatedAt: new Date(),
        },
      });
      logger.info({ userId, email: attrs.user_email, tier }, "ls subscription created");
      break;
    }

    case "subscription_updated": {
      // Find user by lsSubscriptionId since custom_data may not always be present
      const filter = userId
        ? byId(userId)
        : ({ lsSubscriptionId: payload.data.id } as never);
      const tier = variantToTier(attrs.variant_id);
      if (!tier) return;
      await userCol().updateOne(filter, {
        $set: {
          planTier: tier,
          lsCustomerPortalUrl: attrs.urls?.customer_portal ?? null,
          updatedAt: new Date(),
        },
      });
      logger.info({ subscriptionId: payload.data.id, tier }, "ls subscription updated");
      break;
    }

    case "subscription_cancelled":
    case "subscription_expired": {
      const filter = userId
        ? byId(userId)
        : ({ lsSubscriptionId: payload.data.id } as never);
      // cancelled = not yet expired, expired = access ends now
      if (event_name === "subscription_expired" || attrs.status === "expired") {
        await userCol().updateOne(filter, {
          $set: { planTier: "free", planExpiresAt: null, updatedAt: new Date() },
        });
        logger.info({ subscriptionId: payload.data.id }, "ls subscription expired, downgraded");
      } else {
        // cancelled but still in billing period — keep access, just log
        logger.info({ subscriptionId: payload.data.id }, "ls subscription cancelled, access until period end");
      }
      break;
    }

    case "subscription_paused": {
      // Billing paused — keep tier access during pause, LS will resume or expire later
      logger.info({ subscriptionId: payload.data.id }, "ls subscription paused");
      break;
    }

    case "subscription_unpaused":
    case "subscription_resumed": {
      // Restore tier from variant when coming back from pause or cancellation
      const filter = userId
        ? byId(userId)
        : ({ lsSubscriptionId: payload.data.id } as never);
      const tier = variantToTier(attrs.variant_id);
      if (!tier) return;
      await userCol().updateOne(filter, {
        $set: {
          planTier: tier,
          lsCustomerPortalUrl: attrs.urls?.customer_portal ?? null,
          updatedAt: new Date(),
        },
      });
      logger.info({ subscriptionId: payload.data.id, tier, event: event_name }, "ls subscription restored");
      break;
    }

    case "subscription_payment_failed": {
      // LS handles grace period — don't downgrade yet, just log
      logger.warn({ subscriptionId: payload.data.id }, "ls subscription payment failed");
      break;
    }
  }
}
