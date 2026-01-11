import { Router } from "express";
import { PrismaClient } from "@prisma/client";
import { authRequired } from "../middleware.js";
import { z } from "zod";

const prisma = new PrismaClient();
const router = Router();

router.post("/", authRequired, async (req, res) => {
  const schema = z.object({
    bookingId: z.string(),
    rating: z.number().int().min(1).max(5),
    comment: z.string().optional()
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json(parsed.error);

  const { bookingId, rating, comment } = parsed.data;

  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { listing: true }
  });
  if (!booking) return res.status(404).json({ error: "Booking not found" });
  if (booking.studentId !== req.user.id) return res.status(403).json({ error: "Only student can review" });
  if (booking.status !== "COMPLETED") return res.status(400).json({ error: "Booking not completed" });

  const review = await prisma.review.create({
    data: {
      bookingId,
      authorId: req.user.id,
      rating,
      comment
    }
  });

  // пересчёт рейтинга тьютора
  const tutorId = booking.listing.tutorId;
  const tutorReviews = await prisma.review.findMany({
    where: { booking: { listing: { tutorId } } }
  });
  const avg = tutorReviews.reduce((s, r) => s + r.rating, 0) / (tutorReviews.length || 1);

  await prisma.profile.update({
    where: { userId: tutorId },
    data: { ratingAvg: avg, ratingCount: tutorReviews.length }
  });

  res.json(review);
});

export default router;
