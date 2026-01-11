import { Router } from "express";
import { PrismaClient } from "@prisma/client";
import { authRequired } from "../middleware.js";

const prisma = new PrismaClient();
const router = Router();

router.post("/", authRequired, async (req, res) => {
  const { bookingId, reason } = req.body;
  const dispute = await prisma.dispute.create({
    data: { bookingId, reason }
  });
  res.json(dispute);
});

router.get("/mine", authRequired, async (req, res) => {
  const disputes = await prisma.dispute.findMany({
    where: {
      booking: {
        OR: [
          { studentId: req.user.id },
          { listing: { tutorId: req.user.id } }
        ]
      }
    }
  });
  res.json(disputes);
});

export default router;
