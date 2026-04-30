import { Router } from "express";
import { requireAuth } from "../middleware/auth-guard.js";
import { config } from "../config.js";

export const billingRouter = Router();
billingRouter.use(requireAuth);

// POST /api/billing/checkout — delegates to whichever provider is configured
billingRouter.post("/checkout", async (req, res) => {
  if (config.STRIPE_SECRET_KEY) {
    const { handleCheckout } = await import("./stripe.js");
    return handleCheckout(req, res);
  }
  if (config.LS_API_KEY) {
    const { handleCheckout } = await import("./lemonsqueezy.js");
    return handleCheckout(req, res);
  }
  res.status(503).json({ error: "No billing provider configured" });
});

// POST /api/billing/portal — delegates to whichever provider is configured
billingRouter.post("/portal", async (req, res) => {
  if (config.STRIPE_SECRET_KEY) {
    const { handlePortal } = await import("./stripe.js");
    return handlePortal(req, res);
  }
  if (config.LS_API_KEY) {
    const { handlePortal } = await import("./lemonsqueezy.js");
    return handlePortal(req, res);
  }
  res.status(503).json({ error: "No billing provider configured" });
});

// DELETE /api/billing/cancel — cancel subscription at period end
billingRouter.delete("/cancel", async (req, res) => {
  if (config.LS_API_KEY) {
    const { handleCancel } = await import("./lemonsqueezy.js");
    return handleCancel(req, res);
  }
  res.status(503).json({ error: "No billing provider configured" });
});

// PATCH /api/billing/switch — change plan (upgrade / downgrade)
billingRouter.patch("/switch", async (req, res) => {
  if (config.LS_API_KEY) {
    const { handleSwitch } = await import("./lemonsqueezy.js");
    return handleSwitch(req, res);
  }
  res.status(503).json({ error: "No billing provider configured" });
});
