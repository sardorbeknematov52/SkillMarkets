import { Router } from "express";
import { PrismaClient } from "@prisma/client";
import { authRequired } from "../middleware.js";

const prisma = new PrismaClient();
const router = Router();

router.get("/:bookingId", authRequired, async (req, res) => {
  const bookingId = req.params.bookingId;

  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { listing: true, chatRoom: true }
  });
  if (!booking || !booking.chatRoom) return res.status(404).json({ error: "Not found" });

  const allowed = booking.studentId === req.user.id || booking.listing.tutorId === req.user.id;
  if (!allowed) return res.status(403).json({ error: "Forbidden" });

  const room = await prisma.chatRoom.findUnique({
    where: { bookingId },
    include: {
      messages: {
        include: { sender: { include: { profile: true } } },
        orderBy: { createdAt: "asc" }
      }
    }
  });

  res.json({
    roomId: room.id,
    messages: room.messages.map((m) => ({
      id: m.id,
      body: m.body,
      createdAt: m.createdAt,
      sender: {
        id: m.sender.id,
        name: m.sender.profile?.displayName || m.sender.email
      }
    }))
  });
});

export default router;
