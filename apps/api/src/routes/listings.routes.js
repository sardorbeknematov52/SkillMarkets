import { Router } from "express";
import { PrismaClient } from "@prisma/client";
import { authRequired } from "../middleware.js";
import { z } from "zod";

const prisma = new PrismaClient();
const router = Router();

router.get("/", async (req, res) => {
  const q = String(req.query.q || "").trim();
  const skill = String(req.query.skill || "").trim();

  const listings = await prisma.listing.findMany({
    where: {
      status: "ACTIVE",
      OR: q
        ? [
            { title: { contains: q, mode: "insensitive" } },
            { description: { contains: q, mode: "insensitive" } }
          ]
        : undefined,
      skills: skill
        ? { some: { skill: { name: { equals: skill, mode: "insensitive" } } } }
        : undefined
    },
    include: {
      tutor: { include: { profile: true } },
      skills: { include: { skill: true } }
    },
    orderBy: { createdAt: "desc" }
  });

  res.json(listings);
});

router.get("/:id", async (req, res) => {
  const listing = await prisma.listing.findUnique({
    where: { id: req.params.id },
    include: {
      tutor: { include: { profile: true } },
      skills: { include: { skill: true } },
      slots: { orderBy: { startAt: "asc" } },
      bookings: true
    }
  });
  if (!listing) return res.status(404).json({ error: "Not found" });
  res.json(listing);
});

router.post("/", authRequired, async (req, res) => {
  const schema = z.object({
    title: z.string().min(3),
    description: z.string().min(10),
    priceCents: z.number().int().min(100),
    currency: z.string().default("usd"),
    durationMinutes: z.number().int().min(15),
    skillIds: z.array(z.string()).min(1)
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json(parsed.error);

  const data = parsed.data;

  const listing = await prisma.listing.create({
    data: {
      tutorId: req.user.id,
      title: data.title,
      description: data.description,
      priceCents: data.priceCents,
      currency: data.currency,
      durationMinutes: data.durationMinutes,
      skills: {
        create: data.skillIds.map((skillId) => ({
          skillId,
          level: "INTERMEDIATE"
        }))
      }
    }
  });

  res.json(listing);
});

router.post("/:id/slots", authRequired, async (req, res) => {
  const schema = z.object({
    startAt: z.string().datetime(),
    endAt: z.string().datetime(),
    timezone: z.string().default("UTC")
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json(parsed.error);

  const listing = await prisma.listing.findUnique({ where: { id: req.params.id } });
  if (!listing) return res.status(404).json({ error: "Listing not found" });
  if (listing.tutorId !== req.user.id) return res.status(403).json({ error: "Forbidden" });

  const slot = await prisma.availabilitySlot.create({
    data: {
      listingId: listing.id,
      startAt: new Date(parsed.data.startAt),
      endAt: new Date(parsed.data.endAt),
      timezone: parsed.data.timezone
    }
  });

  res.json(slot);
});

export default router;
