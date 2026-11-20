import { useState } from "react";
import { Link, Navigate, useLocation } from "react-router";
import { useAuth } from "../auth/AuthContext";
import "./content.css";

export default function Account() {
  const { status, user, logout, logoutAll } = useAuth();
  const location = useLocation();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  if (status === "loading") return <div className="page-loading" role="status" aria-label="Loading account" />;
  if (status === "guest" || !user) return <Navigate to="/account/login" state={{ from: location.pathname }} replace />;

  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    setError("");
    try {
      await fn();
    } catch {
      setError("Couldn't sign you out everywhere. Check your connection and try again.");
      setBusy(false);
    }
  };

  return (
    <>
      <header className="container page-head">
        <h1>Hello, {user.firstName}</h1>
        <p>Manage your account and see your orders.</p>
      </header>

      <section className="container section account">
        <dl className="account__details">
          <div><dt>Name</dt><dd>{user.firstName} {user.lastName}</dd></div>
          <div><dt>Username</dt><dd>{user.username}</dd></div>
          <div><dt>Email</dt><dd>{user.email}</dd></div>
        </dl>

        <div className="account__orders">
          <h2>Orders</h2>
          <p className="muted">You haven't placed any orders yet.</p>
          <Link to="/collections/best-sellers" className="btn btn--outline">Shop best sellers</Link>
        </div>

        <div className="account__actions">
          {error && <p className="form-error" role="alert">{error}</p>}
          <button className="btn btn--primary" disabled={busy} onClick={() => run(logout)}>Sign out</button>
          <button className="link account__all" disabled={busy} onClick={() => run(logoutAll)}>Sign out on all devices</button>
        </div>
      </section>
    </>
  );
}
