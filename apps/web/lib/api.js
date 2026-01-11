import { getToken } from "./auth";

const API = () => process.env.NEXT_PUBLIC_API_URL;

export async function apiGet(path) {
  const token = getToken();
  const res = await fetch(`${API()}${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {}
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function apiPost(path, body) {
  const token = getToken();
  const res = await fetch(`${API()}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    body: JSON.stringify(body)
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}
