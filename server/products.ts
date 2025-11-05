/**
 * Stripe Product and Price Configuration
 * 
 * Define your subscription plans here.
 * Price IDs will be created in Stripe and stored here for reference.
 */

export const PLANS = {
  free: {
    name: "Free",
    description: "Perfect for testing and small projects",
    price: 0,
    features: [
      "100 API requests per hour",
      "Up to 5 QR chains",
      "Basic analytics",
      "Email support",
    ],
    limits: {
      apiRequests: 100,
      chains: 5,
    },
  },
  starter: {
    name: "Starter",
    description: "For small businesses and events",
    price: 29, // $29/month
    priceId: "price_starter_monthly", // Will be created in Stripe
    features: [
      "1,000 API requests per hour",
      "Up to 50 QR chains",
      "Advanced analytics",
      "Webhook notifications",
      "CSV/PDF exports",
      "Priority email support",
    ],
    limits: {
      apiRequests: 1000,
      chains: 50,
    },
  },
  professional: {
    name: "Professional",
    description: "For growing businesses",
    price: 99, // $99/month
    priceId: "price_professional_monthly", // Will be created in Stripe
    features: [
      "10,000 API requests per hour",
      "Unlimited QR chains",
      "Advanced analytics & reports",
      "Webhook notifications",
      "CSV/PDF exports",
      "White-label branding",
      "Custom domain support",
      "Priority support",
    ],
    limits: {
      apiRequests: 10000,
      chains: -1, // unlimited
    },
  },
  enterprise: {
    name: "Enterprise",
    description: "For large-scale deployments",
    price: 299, // $299/month
    priceId: "price_enterprise_monthly", // Will be created in Stripe
    features: [
      "100,000 API requests per hour",
      "Unlimited QR chains",
      "Advanced analytics & reports",
      "Webhook notifications",
      "CSV/PDF exports",
      "White-label branding",
      "Custom domain support",
      "Dedicated account manager",
      "SLA guarantee",
      "Phone & chat support",
    ],
    limits: {
      apiRequests: 100000,
      chains: -1, // unlimited
    },
  },
} as const;

export type PlanName = keyof typeof PLANS;

/**
 * Get plan details by name
 */
export function getPlan(planName: PlanName) {
  return PLANS[planName];
}

/**
 * Get price ID for a plan (used when creating Stripe checkout sessions)
 */
export function getPriceId(planName: PlanName): string | null {
  const plan = PLANS[planName];
  return "priceId" in plan ? plan.priceId : null;
}

/**
 * Check if a plan has a specific feature
 */
export function hasFeature(planName: PlanName, feature: string): boolean {
  const plan = PLANS[planName];
  return plan.features.some(f => f.toLowerCase().includes(feature.toLowerCase()));
}
