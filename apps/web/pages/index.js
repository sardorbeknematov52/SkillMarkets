import { useEffect, useState } from "react";
import Link from "next/link";
import { getUser, logout } from "../lib/auth";

export default function Home() {
  const [user, setUser] = useState(null);

  // Загружаем пользователя ТОЛЬКО на клиенте
  useEffect(() => {
    const u = getUser();
    setUser(u);
  }, []);

  function handleLogout(e) {
    e.preventDefault();
    logout();
    setUser(null);
  }

  return (
    <div className="container">
      <h1>SkillMarkets</h1>
      <p>Маркетплейс знаний: бронирование, чат, оплата, отзывы.</p>

      {!user ? (
        <div className="row">
          <Link href="/login">Login</Link>
          <Link href="/register">Register</Link>
          <Link href="/listings">Listings</Link>
        </div>
      ) : (
        <div>
          <p>
            Вы вошли как: <b>{user.email}</b> ({user.role})
          </p>

          <div className="row">
            <Link href="/listings">Listings</Link>
            <a href="#" onClick={handleLogout}>
              Logout
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
