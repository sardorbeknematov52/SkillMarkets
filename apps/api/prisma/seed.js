import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const hash = await bcrypt.hash("password123", 10);

  const tutor = await prisma.user.upsert({
    where: { email: "tutor@demo.com" },
    update: {},
    create: {
      email: "tutor@demo.com",
      passwordHash: hash,
      role: "TUTOR",
      profile: { create: { displayName: "Demo Tutor", bio: "I teach Math & English" } }
    }
  });

  await prisma.user.upsert({
    where: { email: "student@demo.com" },
    update: {},
    create: {
      email: "student@demo.com",
      passwordHash: hash,
      role: "STUDENT",
      profile: { create: { displayName: "Demo Student" } }
    }
  });

  const math = await prisma.skill.upsert({
    where: { name: "Mathematics" },
    update: {},
    create: { name: "Mathematics", category: "Education" }
  });

  const eng = await prisma.skill.upsert({
    where: { name: "English" },
    update: {},
    create: { name: "English", category: "Languages" }
  });

  const listing = await prisma.listing.create({
    data: {
      tutorId: tutor.id,
      title: "Math tutoring (1 hour)",
      description: "Algebra, geometry, exam prep",
      priceCents: 2000,
      currency: "usd",
      durationMinutes: 60,
      skills: {
        create: [
          { skillId: math.id, level: "ADVANCED" },
          { skillId: eng.id, level: "INTERMEDIATE" }
        ]
      },
      slots: {
        create: [
          {
            startAt: new Date(Date.now() + 60 * 60 * 1000),
            endAt: new Date(Date.now() + 2 * 60 * 60 * 1000),
            timezone: "UTC"
          }
        ]
      }
    }
  });

  console.log("Seed done. Listing:", listing.id);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => prisma.$disconnect());
