import { useEffect, useState } from "react";
import { apiGet, apiPost } from "../lib/api";

export default function Disputes() {
  const [items, setItems] = useState([]);
  const [bookingId, setBookingId] = useState("");
  const [reason, setReason] = useState("");

  useEffect(() => {
    apiGet("/api/disputes/mine").then(setItems);
  }, []);

  async function open() {
    await apiPost("/api/disputes", { bookingId, reason });
    location.reload();
  }

  return (
    <div className="container">
      <h2>Disputes</h2>
      <input placeholder="Booking ID" onChange={e=>setBookingId(e.target.value)} />
      <textarea placeholder="Reason" onChange={e=>setReason(e.target.value)} />
      <button onClick={open}>Open</button>

      {items.map(d => (
        <div key={d.id} className="card">
          <p>{d.bookingId}</p>
          <p>{d.reason}</p>
          <p>Status: {d.status}</p>
        </div>
      ))}
    </div>
  );
}
