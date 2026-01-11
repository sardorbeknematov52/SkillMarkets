import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { apiGet, apiPost } from "../../lib/api";
import Link from "next/link";

export default function ListingDetail() {
  const router = useRouter();
  const { id } = router.query;

  const [listing, setListing] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!id) return;
    apiGet(`/api/listings/${id}`).then(setListing).catch((e)=>setError(String(e)));
  }, [id]);

  async function book(slotId) {
    setError("");
    try {
      const booking = await apiPost("/api/bookings", { listingId: id, slotId });
      router.push(`/chat/${booking.id}`);
    } catch (e) {
      setError(String(e));
    }
  }

  if (!listing) return <div className="container">Loading...</div>;

  return (
    <div className="container">
      <Link href="/listings">← back</Link>
      <h2>{listing.title}</h2>
      {error && <p style={{color:"red"}}>{error}</p>}

      <div className="card">
        <p>{listing.description}</p>
        <p><b>{listing.priceCents/100} {listing.currency}</b> • {listing.durationMinutes} min</p>
        <p className="small">Tutor: {listing.tutor?.profile?.displayName || listing.tutor?.email}</p>
      </div>

      <h3>Available slots</h3>
      {listing.slots.map((s) => (
        <div key={s.id} className="card">
          <p>{new Date(s.startAt).toLocaleString()} — {new Date(s.endAt).toLocaleString()} ({s.timezone})</p>
          <p className="small">Booked: {String(s.isBooked)}</p>
          <button disabled={s.isBooked} onClick={() => book(s.id)}>
            Book & open chat
          </button>
        </div>
      ))}
    </div>
  );
}
