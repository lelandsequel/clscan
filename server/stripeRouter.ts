import { Router, Request, Response } from "express";
import Stripe from "stripe";
import * as db from "./db";
import { PLANS, getPlan, getPriceId } from "./products";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  apiVersion: "2025-10-29.clover",
});

const router = Router();

/**
 * Create Stripe Checkout Session for subscription upgrade
 */
router.post("/create-checkout-session", async (req: Request, res: Response) => {
  try {
    const { planName, organizationId } = req.body;
    const userId = (req as any).userId; // Assuming auth middleware sets this

    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    if (!planName || !["starter", "professional", "enterprise"].includes(planName)) {
      return res.status(400).json({ error: "Invalid plan" });
    }

    // Get organization
    const org = await db.getOrganizationById(organizationId);
    if (!org) {
      return res.status(404).json({ error: "Organization not found" });
    }

    // Check if user is owner
    const orgs = await db.getUserOrganizations(userId);
    const userOrg = orgs.find(o => o.id === organizationId);
    if (!userOrg || userOrg.role !== "owner") {
      return res.status(403).json({ error: "Only organization owners can upgrade plans" });
    }

    // Get user details
    const user = await db.getUserById(userId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const plan = getPlan(planName as keyof typeof PLANS);
    const priceId = getPriceId(planName as keyof typeof PLANS);

    if (!priceId) {
      return res.status(400).json({ error: "Plan not available for purchase" });
    }

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      customer_email: user.email || undefined,
      client_reference_id: userId.toString(),
      metadata: {
        user_id: userId.toString(),
        organization_id: organizationId.toString(),
        plan_name: planName,
        customer_email: user.email || "",
        customer_name: user.name || "",
      },
      allow_promotion_codes: true,
      success_url: `${req.headers.origin}/dashboard?success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${req.headers.origin}/dashboard?canceled=true`,
    });

    res.json({ checkoutUrl: session.url });
  } catch (error) {
    console.error("Stripe checkout error:", error);
    res.status(500).json({ error: "Failed to create checkout session" });
  }
});

/**
 * Stripe Webhook Handler
 * Handles checkout.session.completed and other events
 */
router.post("/webhook", async (req: Request, res: Response) => {
  const sig = req.headers["stripe-signature"];

  if (!sig) {
    return res.status(400).send("Missing stripe-signature header");
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET || ""
    );
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return res.status(400).send(`Webhook Error: ${(err as Error).message}`);
  }

  // Handle the event
  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      
      // Extract metadata
      const organizationId = parseInt(session.metadata?.organization_id || "0", 10);
      const planName = session.metadata?.plan_name as keyof typeof PLANS;
      const userId = parseInt(session.metadata?.user_id || "0", 10);

      if (!organizationId || !planName) {
        console.error("Missing metadata in checkout session");
        break;
      }

      try {
        // Update organization with Stripe customer ID and subscription
        await db.updateOrganization(organizationId, {
          plan: planName,
          stripeCustomerId: session.customer as string,
          stripeSubscriptionId: session.subscription as string,
        });

        console.log(`✅ Subscription activated: Org ${organizationId} upgraded to ${planName}`);
      } catch (error) {
        console.error("Failed to update organization:", error);
      }
      break;
    }

    case "customer.subscription.updated": {
      const subscription = event.data.object as Stripe.Subscription;
      
      // Find organization by Stripe customer ID
      const org = await db.getOrganizationByStripeCustomerId(subscription.customer as string);
      if (!org) {
        console.error("Organization not found for customer:", subscription.customer);
        break;
      }

      // Check subscription status
      if (subscription.status === "active") {
        console.log(`✅ Subscription renewed: Org ${org.id}`);
      } else if (["canceled", "unpaid", "past_due"].includes(subscription.status)) {
        // Downgrade to free plan
        await db.updateOrganization(org.id, { plan: "free" });
        console.log(`⚠️ Subscription ${subscription.status}: Org ${org.id} downgraded to free`);
      }
      break;
    }

    case "customer.subscription.deleted": {
      const subscription = event.data.object as Stripe.Subscription;
      
      // Find organization and downgrade to free
      const org = await db.getOrganizationByStripeCustomerId(subscription.customer as string);
      if (org) {
        await db.updateOrganization(org.id, { plan: "free" });
        console.log(`❌ Subscription canceled: Org ${org.id} downgraded to free`);
      }
      break;
    }

    default:
      console.log(`Unhandled event type: ${event.type}`);
  }

  res.json({ received: true });
});

/**
 * Get customer portal URL for managing subscription
 */
router.post("/create-portal-session", async (req: Request, res: Response) => {
  try {
    const { organizationId } = req.body;
    const userId = (req as any).userId;

    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const orgData = await db.getOrganizationByIdFull(organizationId);
    if (!orgData || !orgData.stripeCustomerId) {
      return res.status(404).json({ error: "No active subscription found" });
    }

    // Check if user is owner
    const orgs = await db.getUserOrganizations(userId);
    const userOrg = orgs.find(o => o.id === organizationId);
    if (!userOrg || userOrg.role !== "owner") {
      return res.status(403).json({ error: "Only organization owners can manage subscriptions" });
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: orgData.stripeCustomerId,
      return_url: `${req.headers.origin}/dashboard`,
    });

    res.json({ portalUrl: session.url });
  } catch (error) {
    console.error("Portal session error:", error);
    res.status(500).json({ error: "Failed to create portal session" });
  }
});

export default router;
