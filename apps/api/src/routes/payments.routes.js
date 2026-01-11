import { Router } from "express";
import { PrismaClient } from "@prisma/client";
import { authRequired } from "../middleware.js";
import { z } from "zod";
import { stripe, calcFees } from "../stripe.js";

const prisma = new PrismaClient();
const router = Router();

router.post("/create-intent", authRequired, async (req, res) => {
  const schema = z.object({ bookingId: z.string() });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json(parsed.error);

  const booking = await prisma.booking.findUnique({
    where: { id: parsed.data.bookingId },
    include: { listing: true, payment: true, chatRoom: true }
  });
  if (!booking) return res.status(404).json({ error: "Booking not found" });
  if (booking.studentId !== req.user.id) return res.status(403).json({ error: "Forbidden" });

  if (booking.payment?.status === "PAID") {
    return res.json({ alreadyPaid: true });
  }

  const amount = booking.listing.priceCents;
  const intent = await stripe.paymentIntents.create({
    amount,
    currency: booking.listing.currency,
    automatic_payment_methods: { enabled: true },
    metadata: { bookingId: booking.id }
  });

  // upsert payment
  const payment = await prisma.payment.upsert({
    where: { bookingId: booking.id },
    update: { intentId: intent.id, amountCents: amount, status: "REQUIRES_PAYMENT" },
    create: { bookingId: booking.id, intentId: intent.id, amountCents: amount, status: "REQUIRES_PAYMENT" }
  });

  res.json({ clientSecret: intent.client_secret, paymentId: payment.id });
});

// Stripe webhook нужен "raw body", поэтому этот роут будет подключён отдельно в index.js
router.post("/webhook-placeholder", (_req, res) => res.sendStatus(200));

export async function handleStripeWebhook(req, res) {
  const sig = req.headers["stripe-signature"];
  let event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === "payment_intent.succeeded") {
    const intent = event.data.object;
    const bookingId = intent.metadata?.bookingId;
    if (bookingId) {
      const payment = await prisma.payment.update({
        where: { bookingId },
        data: { status: "PAID" }
      });

      await prisma.booking.update({
        where: { id: bookingId },
        data: { status: "CONFIRMED" }
      });

      const { platformFeeCents, tutorPayoutCents } = calcFees(payment.amountCents);

      await prisma.transactionLedger.upsert({
        where: { paymentId: payment.id },
        update: {},
        create: {
          paymentId: payment.id,
          grossCents: payment.amountCents,
          platformFeeCents,
          tutorPayoutCents
        }
      });
    }
  }

  res.json({ received: true });
}

export default router;
