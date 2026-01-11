import { useState } from "react";
import { apiPost } from "../lib/api";
import { saveAuth } from "../lib/auth";
import { useRouter } from "next/router";

export default function Login() {
  const [email, setEmail] = useState("student@demo.com");
  const [password, setPassword] = useState("password123");
  const [error, setError] = useState("");
  const router = useRouter();

  async function submit(e) {
    e.preventDefault();
    setError("");
    try {
      const data = await apiPost("/api/auth/login", { email, password });
      saveAuth(data.token, data.user);
      router.push("/listings");
    } catch (e) {
      setError(String(e));
    }
  }

  return (
    <div className="container">
      <h2>Login</h2>
      {error && <p style={{color:"red"}}>{error}</p>}
      <form onSubmit={submit} className="card">
        <input value={email} onChange={(e)=>setEmail(e.target.value)} placeholder="email"/>
        <input value={password} onChange={(e)=>setPassword(e.target.value)} placeholder="password" type="password"/>
        <button type="submit">Login</button>
      </form>
      <p className="small">Demo: student@demo.com / password123</p>
    </div>
  );
}
