import { useState, type FormEvent } from "react";
import { Link } from "react-router";
import Img from "../components/Img";
import "./auth.css";

// UI only: sign-in and sign-up are not wired to a backend yet.
export default function Auth({ mode }: { mode: "login" | "register" }) {
  const [sent, setSent] = useState(false);
  const isLogin = mode === "login";

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    setSent(true);
  };

  return (
    <section className="auth">
      <Img id="1727524366429-27de8607d5f6" alt="" ratio={1.3} sizes="50vw" className="auth__img" />
      <div className="auth__panel">
        <div className="auth__tabs" role="tablist" aria-label="Account">
          <Link to="/account/login" role="tab" aria-selected={isLogin} className="auth__tab">Sign in</Link>
          <Link to="/account/register" role="tab" aria-selected={!isLogin} className="auth__tab">Create account</Link>
        </div>

        <h1>{isLogin ? "Welcome back" : "Create your account"}</h1>
        <p className="muted">
          {isLogin ? "Sign in to see your orders and saved addresses." : "Track orders, save your sizes and check out faster."}
        </p>

        <form onSubmit={onSubmit} key={mode}>
          {!isLogin && (
            <div className="field-row">
              <div className="field"><label htmlFor="first">First name</label><input id="first" className="input" required autoComplete="given-name" /></div>
              <div className="field"><label htmlFor="last">Last name</label><input id="last" className="input" required autoComplete="family-name" /></div>
            </div>
          )}
          <div className="field"><label htmlFor="email">Email</label><input id="email" className="input" type="email" required autoComplete="email" /></div>
          <div className="field">
            <label htmlFor="password">Password</label>
            <input id="password" className="input" type="password" required minLength={8} autoComplete={isLogin ? "current-password" : "new-password"} />
            {!isLogin && <span className="form-note">At least 8 characters.</span>}
          </div>
          {isLogin && <p className="auth__forgot"><a href="#" className="link" onClick={(e) => e.preventDefault()}>Forgot your password?</a></p>}

          {sent ? (
            <p className="notice" role="status">Accounts aren't connected yet. Nothing was sent.</p>
          ) : (
            <button type="submit" className="btn btn--primary btn--block">{isLogin ? "Sign in" : "Create account"}</button>
          )}
        </form>
      </div>
    </section>
  );
}
