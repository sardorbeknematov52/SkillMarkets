import { useRouter } from "next/router";
import { useState } from "react";
import { apiPost } from "../../lib/api";

export default function Review() {
  const { bookingId } = useRouter().query;
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");

  async function submit() {
    await apiPost("/api/reviews", { bookingId, rating, comment });
    location.href = "/bookings";
  }

  return (
    <div className="container">
      <h2>Review</h2>
      <select onChange={e=>setRating(+e.target.value)}>
        {[5,4,3,2,1].map(r => <option key={r}>{r}</option>)}
      </select>
      <textarea onChange={e=>setComment(e.target.value)} />
      <button onClick={submit}>Submit</button>
    </div>
  );
}
