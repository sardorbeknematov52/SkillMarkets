import { useEffect, useState } from "react";
import Link from "next/link";
import { apiGet, apiPost } from "../lib/api";

export default function Bookings() {
  const [items, setItems] = useState([]);

  useEffect(() => {
    apiGet("/api/bookings/mine").then(setItems);
  }, []);

  async function complete(id) {
    await apiPost(`/api/bookings/${id}/complete`, {});
    location.reload();
  }

  return (
    <div className="container">
      <h2>My Bookings</h2>
      {items.map(b => (
        <div key={b.id} className="card">
          <p>{b.listing.title}</p>
          <p>Status: {b.status}</p>
          <div className="row">
            <Link href={`/chat/${b.id}`}>Chat</Link>
            {b.status === "CONFIRMED" && (
              <button onClick={() => complete(b.id)}>Complete</button>
            )}
            {b.status === "COMPLETED" && !b.review && (
              <Link href={`/review/${b.id}`}>Leave review</Link>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
