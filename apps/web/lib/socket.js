import { io } from "socket.io-client";
import { getUser } from "./auth";

export function makeSocket() {
  const socket = io(process.env.NEXT_PUBLIC_API_URL.replace("http", "ws"));
  return socket;
}

export function tokenPayload() {
  const u = getUser();
  return u ? { id: u.id, email: u.email, role: u.role } : null;
}
