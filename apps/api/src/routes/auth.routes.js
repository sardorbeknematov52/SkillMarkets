import { Router } from "express";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { signToken } from "../auth.js";

const prisma = new PrismaClient();
const router = Router();

router.post("/register", async (req, res) => {
  const schema = z.object({
    email: z.string().email(),
    password: z.string().min(6),
    displayName: z.string().min(2),
    role: z.enum(["STUDENT", "TUTOR", "BOTH"]).default("STUDENT")
  });

  const body = schema.safeParse(req.body);
  if (!body.success) return res.status(400).json(body.error);

  const { email, password, displayName, role } = body.data;

  const exists = await prisma.user.findUnique({ where: { email } });
  if (exists) return res.status(409).json({ error: "Email already used" });

  const passwordHash = await bcrypt.hash(password, 10);

  const user = await prisma.user.create({
    data: {
      email,
      passwordHash,
      role,
      profile: { create: { displayName } }
    },
    include: { profile: true }
  });

  return res.json({ token: signToken(user), user: { id: user.id, email, role, profile: user.profile } });
});

router.post("/login", async (req, res) => {
  const schema = z.object({
    email: z.string().email(),
    password: z.string().min(1)
  });

  const body = schema.safeParse(req.body);
  if (!body.success) return res.status(400).json(body.error);

  const { email, password } = body.data;

  const user = await prisma.user.findUnique({ where: { email }, include: { profile: true } });
  if (!user) return res.status(401).json({ error: "Invalid credentials" });

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return res.status(401).json({ error: "Invalid credentials" });

  return res.json({ token: signToken(user), user: { id: user.id, email, role: user.role, profile: user.profile } });
});

export default router;
