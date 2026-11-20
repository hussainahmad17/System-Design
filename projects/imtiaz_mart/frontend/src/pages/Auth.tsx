import { useRef, useState, type FormEvent } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router";
import { ApiError, api } from "../auth/api";
import { useAuth } from "../auth/AuthContext";
import Img from "../components/Img";
import "./auth.css";

type Errors = Record<string, string>;
type Availability = Partial<Record<"email" | "username", { value: string; available: boolean }>>;

export default function Auth({ mode }: { mode: "login" | "register" }) {
  const isLogin = mode === "login";
  const { status, login, register } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [avail, setAvail] = useState<Availability>({});
  const checkSeq = useRef(0);

  const next = (location.state as { from?: string } | null)?.from ?? "/account";
  if (status === "authed") return <Navigate to={next} replace />;

  // Availability check on blur. Backed by the bloom filter, so most checks never touch the DB.
  const checkAvailability = async (field: "email" | "username", raw: string) => {
    const value = raw.trim().toLowerCase();
    const valid = field === "email" ? /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) : /^[a-z0-9._]{3,30}$/.test(value);
    if (!valid || avail[field]?.value === value) return;
    const seq = ++checkSeq.current;
    try {
      const r = await api.availability(field, value);
      if (seq === checkSeq.current) setAvail((a) => ({ ...a, [field]: { value, available: r.available } }));
    } catch {
      /* availability is a hint only; the server re-checks on submit */
    }
  };

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const get = (k: string) => String(f.get(k) ?? "");
    setErrors({});
    setFormError("");
    setSubmitting(true);
    try {
      if (isLogin) {
        await login(get("identifier"), get("password"));
      } else {
        await register({
          firstName: get("firstName"),
          lastName: get("lastName"),
          username: get("username"),
          email: get("email"),
          password: get("password"),
        });
      }
      navigate(next, { replace: true });
    } catch (err) {
      if (err instanceof ApiError) {
        // Field problems show under each field; everything else (wrong password, rate limit,
        // server down) shows once at the top of the form.
        setErrors(err.details ?? {});
        setFormError(err.details ? (err.details.input ?? "") : err.message);
      } else {
        setFormError("Something went wrong. Try again.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const fieldError = (name: string) =>
    errors[name] ? <span id={`${name}-error`} className="field-error">{errors[name]}</span> : null;
  const aria = (name: string) => ({ "aria-invalid": !!errors[name], "aria-describedby": errors[name] ? `${name}-error` : undefined });

  const availHint = (field: "email" | "username") => {
    const a = avail[field];
    if (!a || errors[field]) return null;
    return a.available ? (
      <span className="field-ok">{field === "email" ? "Email is free to use" : "Username is available"}</span>
    ) : (
      <span className="field-error">{field === "email" ? "This email is already registered. Sign in instead." : "This username is taken"}</span>
    );
  };

  return (
    <section className="auth">
      <Img id="1727524366429-27de8607d5f6" alt="" ratio={1.3} sizes="50vw" className="auth__img" />
      <div className="auth__panel">
        <div className="auth__tabs" role="tablist" aria-label="Account">
          <Link to="/account/login" state={location.state} role="tab" aria-selected={isLogin} className="auth__tab">Sign in</Link>
          <Link to="/account/register" state={location.state} role="tab" aria-selected={!isLogin} className="auth__tab">Create account</Link>
        </div>

        <h1>{isLogin ? "Welcome back" : "Create your account"}</h1>
        <p className="muted">
          {isLogin ? "Sign in to see your orders and saved addresses." : "Track orders, save your sizes and check out faster."}
        </p>

        <form onSubmit={onSubmit} key={mode} noValidate>
          {formError && <p className="form-error" role="alert">{formError}</p>}

          {isLogin ? (
            <div className="field">
              <label htmlFor="identifier">Email or username</label>
              <input id="identifier" name="identifier" className="input" required autoComplete="username" {...aria("identifier")} />
              {fieldError("identifier")}
            </div>
          ) : (
            <>
              <div className="field-row">
                <div className="field">
                  <label htmlFor="firstName">First name</label>
                  <input id="firstName" name="firstName" className="input" required autoComplete="given-name" {...aria("firstName")} />
                  {fieldError("firstName")}
                </div>
                <div className="field">
                  <label htmlFor="lastName">Last name</label>
                  <input id="lastName" name="lastName" className="input" required autoComplete="family-name" {...aria("lastName")} />
                  {fieldError("lastName")}
                </div>
              </div>
              <div className="field">
                <label htmlFor="username">Username</label>
                <input
                  id="username" name="username" className="input" required autoComplete="username"
                  autoCapitalize="none" spellCheck={false}
                  onBlur={(e) => checkAvailability("username", e.target.value)}
                  onChange={() => setErrors(({ username: _u, ...rest }) => rest)}
                  {...aria("username")}
                />
                {fieldError("username") ?? availHint("username") ?? <span className="form-note">3 to 30 letters, numbers, dots or underscores.</span>}
              </div>
              <div className="field">
                <label htmlFor="email">Email</label>
                <input
                  id="email" name="email" className="input" type="email" required autoComplete="email"
                  onBlur={(e) => checkAvailability("email", e.target.value)}
                  onChange={() => setErrors(({ email: _e, ...rest }) => rest)}
                  {...aria("email")}
                />
                {fieldError("email") ?? availHint("email")}
              </div>
            </>
          )}

          <div className="field">
            <label htmlFor="password">Password</label>
            <input
              id="password" name="password" className="input" type="password" required
              minLength={isLogin ? undefined : 8} autoComplete={isLogin ? "current-password" : "new-password"}
              {...aria("password")}
            />
            {fieldError("password") ?? (!isLogin && <span className="form-note">At least 8 characters.</span>)}
          </div>

          {isLogin && (
            <p className="auth__forgot">
              <a href="#" className="link" onClick={(e) => e.preventDefault()}>Forgot your password?</a>
            </p>
          )}

          <button type="submit" className="btn btn--primary btn--block" disabled={submitting}>
            {submitting ? (isLogin ? "Signing in…" : "Creating account…") : isLogin ? "Sign in" : "Create account"}
          </button>
        </form>
      </div>
    </section>
  );
}
