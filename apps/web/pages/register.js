import { useState } from "react";
import { saveAuth } from "../lib/auth";
import { useRouter } from "next/router";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

export default function Register() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [role, setRole] = useState("STUDENT");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const router = useRouter();

  async function submit(e) {
    e.preventDefault();
    if (loading) return;

    setError("");
    setLoading(true);

    try {
      const res = await fetch(`${API_URL}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, displayName, role }),
      });

      // Считываем как текст (чтобы красиво показать HTML/ошибку)
      const text = await res.text();

      if (!res.ok) {
        // Попробуем вытащить message из JSON, иначе покажем текст
        try {
          const j = JSON.parse(text);
          throw new Error(j.message || j.error || text);
        } catch {
          throw new Error(text);
        }
      }

      // Парсим успешный JSON
      const data = JSON.parse(text);

      if (!data?.token || !data?.user) {
        throw new Error("Invalid server response (missing token/user)");
      }

      saveAuth(data.token, data.user);
      router.push("/listings");
    } catch (err) {
      setError(err?.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="container">
      <h2>Register</h2>

      {error && (
        <p style={{ color: "red", whiteSpace: "pre-wrap" }}>
          {error.length > 400 ? error.slice(0, 400) + "..." : error}
        </p>
      )}

      <form onSubmit={submit} className="card">
        <input
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          placeholder="Display name"
          required
        />

        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email"
          type="email"
          required
        />

        <input
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          type="password"
          required
          minLength={6}
        />

        <select value={role} onChange={(e) => setRole(e.target.value)}>
          <option value="STUDENT">STUDENT</option>
          <option value="TUTOR">TUTOR</option>
          <option value="BOTH">BOTH</option>
        </select>

        <button type="submit" disabled={loading}>
          {loading ? "Creating..." : "Create"}
        </button>
      </form>
    </div>
  );
}
