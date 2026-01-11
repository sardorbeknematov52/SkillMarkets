import { Router } from "express";
import { PrismaClient } from "@prisma/client";
import { authRequired } from "../middleware.js";

const prisma = new PrismaClient();
const router = Router();

router.get("/mine", authRequired, async (req, res) => {
  const bookings = await prisma.booking.findMany({
    where: {
      OR: [
        { studentId: req.user.id },
        { listing: { tutorId: req.user.id } }
      ]
    },
    include: {
      listing: true,
      slot: true,
      review: true,
      chatRoom: true
    }
  });
  res.json(bookings);
});

router.post("/:id/complete", authRequired, async (req, res) => {
  const booking = await prisma.booking.findUnique({
    where: { id: req.params.id },
    include: { listing: true }
  });

  if (!booking) return res.status(404).json({ error: "Not found" });
  if (booking.listing.tutorId !== req.user.id)
    return res.status(403).json({ error: "Only tutor can complete" });

  const updated = await prisma.booking.update({
    where: { id: booking.id },
    data: { status: "COMPLETED" }
  });

  const room = await prisma.chatRoom.findUnique({ where: { bookingId: booking.id } });
  if (room) {
    await prisma.chatMessage.create({
      data: {
        roomId: room.id,
        senderId: req.user.id,
        type: "SYSTEM",
        body: "Session completed"
      }
    });
  }

  res.json(updated);
});

export default router;
