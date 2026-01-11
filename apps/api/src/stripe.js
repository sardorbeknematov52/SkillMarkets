import Stripe from "stripe";

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2024-06-20"
});

export function calcFees(grossCents) {
  const pct = Number(process.env.PLATFORM_FEE_PERCENT || 10);
  const fee = Math.round((grossCents * pct) / 100);
  return { platformFeeCents: fee, tutorPayoutCents: grossCents - fee };
}
