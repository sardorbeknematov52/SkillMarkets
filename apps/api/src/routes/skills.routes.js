import { Router } from "express";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const router = Router();

router.get("/", async (_req, res) => {
  const skills = await prisma.skill.findMany({ orderBy: { name: "asc" } });
  res.json(skills);
});

export default router;
