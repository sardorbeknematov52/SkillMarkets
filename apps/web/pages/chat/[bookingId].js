import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";
import { apiGet, apiPost } from "../../lib/api";
import { makeSocket, tokenPayload } from "../../lib/socket";
import { loadStripe } from "@stripe/stripe-js";

export default function ChatPage() {
  const router = useRouter();
  const { bookingId } = router.query;

  const [roomId, setRoomId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [error, setError] = useState("");

  const socket = useMemo(() => makeSocket(), []);

  useEffect(() => {
    if (!bookingId) return;

    apiGet(`/api/chat/${bookingId}`)
      .then((data) => {
        setRoomId(data.roomId);
        setMessages(data.messages);
      })
      .catch((e) => setError(String(e)));
  }, [bookingId]);

  useEffect(() => {
    if (!roomId) return;

    const payload = tokenPayload();
    socket.emit("join", { roomId, tokenPayload: payload });

    socket.on("message:new", (m) => {
      setMessages((prev) => [...prev, m]);
    });

    return () => {
      socket.off("message:new");
      socket.disconnect();
    };
  }, [roomId]);

  function send() {
    if (!text.trim() || !roomId) return;
    socket.emit("message:send", { roomId, body: text.trim() });
    setText("");
  }

  async function pay() {
    setError("");
    try {
      const resp = await apiPost("/api/payments/create-intent", { bookingId });
      if (resp.alreadyPaid) {
        alert("Already paid");
        return;
      }
      const stripe = await loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY);
      await stripe.confirmPayment({
        clientSecret: resp.clientSecret,
        confirmParams: { return_url: window.location.href }
      });
      alert("Payment flow started. If succeeded, booking becomes CONFIRMED.");
    } catch (e) {
      setError(String(e));
    }
  }

  return (
    <div className="container">
      <h2>Chat (Booking: {bookingId})</h2>
      {error && <p style={{color:"red"}}>{error}</p>}

      <div className="card">
        <button onClick={pay}>Pay (Stripe Test)</button>
        <p className="small">
          После успешной оплаты Stripe webhook отметит Payment=PAID и Booking=CONFIRMED.
        </p>
      </div>

      <div className="card" style={{ minHeight: 300 }}>
        {messages.map((m) => (
          <div key={m.id} style={{ marginBottom: 10 }}>
            <b>{m.sender?.name}</b>: {m.body}
            <div className="small">{new Date(m.createdAt).toLocaleString()}</div>
          </div>
        ))}
      </div>

      <div className="card">
        <input value={text} onChange={(e)=>setText(e.target.value)} placeholder="Type message..." />
        <button onClick={send}>Send</button>
      </div>
    </div>
  );
}
