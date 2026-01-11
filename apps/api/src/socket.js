import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export function initSocket(io) {
  io.on("connection", (socket) => {
    socket.on("join", async ({ roomId, tokenPayload }) => {
      // tokenPayload передаём с фронта (упрощение для учебного проекта).
      // В идеале проверять JWT на сервере.
      socket.data.user = tokenPayload;
      socket.join(roomId);
      socket.emit("joined", { roomId });
    });

    socket.on("message:send", async ({ roomId, body }) => {
      const user = socket.data.user;
      if (!user) return;

      // Проверка доступа: пользователь должен быть участником booking
      const room = await prisma.chatRoom.findUnique({
        where: { id: roomId },
        include: { booking: true }
      });
      if (!room) return;

      const booking = await prisma.booking.findUnique({
        where: { id: room.bookingId },
        include: { listing: true }
      });

      const isAllowed =
        booking.studentId === user.id || booking.listing.tutorId === user.id;

      if (!isAllowed) return;

      const msg = await prisma.chatMessage.create({
        data: {
          roomId,
          senderId: user.id,
          body,
          type: "TEXT"
        },
        include: {
          sender: { include: { profile: true } }
        }
      });

      io.to(roomId).emit("message:new", {
        id: msg.id,
        body: msg.body,
        createdAt: msg.createdAt,
        sender: {
          id: msg.sender.id,
          email: msg.sender.email,
          name: msg.sender.profile?.displayName || msg.sender.email
        }
      });
    });
  });
}
