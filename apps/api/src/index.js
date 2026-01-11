import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import { createServer } from "http";
import { Server } from "socket.io";

import authRoutes from "./routes/auth.routes.js";
import skillsRoutes from "./routes/skills.routes.js";
import listingsRoutes from "./routes/listings.routes.js";
import bookingsRoutes from "./routes/bookings.routes.js";
import paymentsRoutes, { handleStripeWebhook } from "./routes/payments.routes.js";
import chatRoutes from "./routes/chat.routes.js";
import reviewsRoutes from "./routes/reviews.routes.js";
import disputesRoutes from "./routes/disputes.routes.js";
import notificationsRoutes from "./routes/notifications.routes.js";

import { initSocket } from "./socket.js";

const app = express();
app.use(helmet());
app.use(morgan("dev"));
app.use(cors({ origin: process.env.CORS_ORIGIN }));

// Stripe webhook (RAW BODY)
app.post(
  "/api/payments/webhook",
  express.raw({ type: "application/json" }),
  handleStripeWebhook
);

app.use(express.json());
app.post("/auth/register", async (req, res) => {
  const { email, password, displayName, role } = req.body || {};

  if (!email || !password || !displayName || !role) {
    return res.status(400).json({ message: "Missing fields" });
  }

  // Временный ответ (чтобы фронт заработал прямо сейчас)
  return res.json({
    token: "dev-token-123",
    user: {
      id: Date.now(),
      email,
      displayName,
      role,
    },
  });
});

app.get("/health", (_, res) => res.json({ ok: true }));

app.use("/api/auth", authRoutes);
app.use("/api/skills", skillsRoutes);
app.use("/api/listings", listingsRoutes);
app.use("/api/bookings", bookingsRoutes);
app.use("/api/payments", paymentsRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/reviews", reviewsRoutes);
app.use("/api/disputes", disputesRoutes);
app.use("/api/notifications", notificationsRoutes);

const server = createServer(app);
const io = new Server(server, {
  cors: { origin: process.env.CORS_ORIGIN }
});
initSocket(io);

server.listen(4000, () => console.log("API running on http://localhost:4000"));
