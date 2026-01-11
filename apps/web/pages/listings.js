import { useEffect, useState } from "react";
import Link from "next/link";
import { apiGet } from "../lib/api";

export default function Listings() {
  const [listings, setListings] = useState([]);
  const [q, setQ] = useState("");

  async function load() {
    const data = await apiGet(`/api/listings?q=${encodeURIComponent(q)}`);
    setListings(data);
  }

  useEffect(() => { load(); }, []);

  return (
    <div className="container">
      <h2>Listings</h2>

      <div className="card">
        <input value={q} onChange={(e)=>setQ(e.target.value)} placeholder="Search..." />
        <button onClick={load}>Search</button>
      </div>

      {listings.map((l) => (
        <div key={l.id} className="card">
          <h3><Link href={`/listing/${l.id}`}>{l.title}</Link></h3>
          <p>{l.description}</p>
          <p className="small">
            Tutor: {l.tutor?.profile?.displayName || l.tutor?.email} • Price: {l.priceCents/100} {l.currency}
          </p>
        </div>
      ))}
    </div>
  );
}
