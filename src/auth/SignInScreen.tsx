import { useMemo, useState } from "react";
import { useAuth } from "./AuthContext";
import { Button, Icon } from "@/app/ui";
import { checkPassword, passwordsMatch, validateEmail } from "./validation";

type Mode = "signin" | "signup" | "magic" | "reset";

export function SignInScreen() {
  const { signInWithEmail, signInWithPassword, signUpWithPassword, resetPassword } = useAuth();
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [touched, setTouched] = useState<{ email?: boolean; password?: boolean; confirm?: boolean }>({});
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const emailErrors = useMemo(() => validateEmail(email), [email]);
  const pwCheck = useMemo(
    () => checkPassword(password, email),
    [password, email]
  );
  const confirmOk = mode !== "signup" || passwordsMatch(password, confirm);

  const canSubmit = (() => {
    if (busy) return false;
    if (emailErrors.length > 0) return false;
    if (mode === "magic" || mode === "reset") return true;
    // signin / signup require a password; signup also requires meeting rules + match
    if (mode === "signin") return password.length > 0;
    if (mode === "signup") return pwCheck.ok && confirmOk;
    return false;
  })();

  const switchMode = (next: Mode) => {
    setMode(next);
    setError(null);
    setStatus(null);
    setTouched({});
  };

  const submit = async () => {
    if (!canSubmit) return;
    setBusy(true);
    setError(null);
    setStatus(null);
    if (mode === "signin") {
      const { error: e } = await signInWithPassword(email.trim(), password);
      if (e) setError(e);
    } else if (mode === "signup") {
      const { error: e, needsConfirmation } = await signUpWithPassword(email.trim(), password);
      if (e) setError(e);
      else if (needsConfirmation) setStatus("Check your inbox — confirm your email to finish signing up.");
      else setStatus("Account created. Signing you in…");
    } else if (mode === "magic") {
      const { error: e } = await signInWithEmail(email.trim());
      if (e) setError(e); else setStatus("Check your inbox — the magic link lasts 1 hour.");
    } else if (mode === "reset") {
      const { error: e } = await resetPassword(email.trim());
      if (e) setError(e); else setStatus("Reset link sent — check your inbox.");
    }
    setBusy(false);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && canSubmit) void submit();
  };

  const title =
    mode === "signin" ? "Welcome back"
    : mode === "signup" ? "Create your MotoPulse account"
    : mode === "magic" ? "Sign in with a magic link"
    : "Reset password";

  const sub =
    mode === "signin" ? "Sign in with your email and password."
    : mode === "signup" ? "Strong password required — 8+ chars with upper, lower, digit, symbol."
    : mode === "magic" ? "No password — we'll email you a one-tap link."
    : "Enter your email and we'll send you a reset link.";

  const submitLabel =
    mode === "signin" ? "Sign in"
    : mode === "signup" ? "Create account"
    : mode === "magic" ? "Email me a sign-in link"
    : "Send reset link";

  const showEmailError = touched.email && emailErrors.length > 0;
  const showPwError = mode === "signup" && touched.password && !pwCheck.ok;
  const showConfirmError = mode === "signup" && touched.confirm && !confirmOk;

  return (
    <div className="signin">
      <section className="signin__hero">
        <div className="signin__brand">
          <span className="sidebar__brand-mark"><Icon name="bike" size="md"/></span>
          MotoPulse
        </div>

        <div className="signin__hero-copy">
          <h1 className="signin__hero-title">
            Every rupee you spend<br/>
            on your <span className="signin__hero-accent">ride,</span><br/>
            remembered.
          </h1>
          <p className="signin__hero-sub">
            Tap your bike's NFC tag at the pump. Log fuel and service in one tap.
            See where every month's money went.
          </p>

          <div className="signin__feats">
            <Feat icon="nfc"    label="Tap to log"/>
            <Feat icon="chart"  label="Monthly & yearly"/>
            <Feat icon="wrench" label="Service reminders"/>
            <Feat icon="camera" label="Garage, pictured"/>
          </div>
        </div>
      </section>

      <section className="signin__form-side">
        <div className="signin__form">
          <h2 className="signin__form-title">{title}</h2>
          <p className="signin__form-sub">{sub}</p>

          <label htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            inputMode="email"
            autoComplete="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onBlur={() => setTouched((t) => ({ ...t, email: true }))}
            onKeyDown={onKeyDown}
            aria-invalid={showEmailError}
            aria-describedby={showEmailError ? "email-err" : undefined}
          />
          {showEmailError && (
            <p id="email-err" className="u-text-xs" style={{ color: "var(--status-crit)", marginTop: 4 }}>
              {emailErrors[0]}
            </p>
          )}

          {(mode === "signin" || mode === "signup") && (
            <>
              <div className="u-row u-row-between" style={{ marginTop: "var(--s-4)" }}>
                <label htmlFor="password" style={{ margin: 0 }}>Password</label>
                {mode === "signin" && (
                  <button type="button"
                    onClick={() => switchMode("reset")}
                    style={{ background: "none", border: 0, color: "var(--accent-700)", padding: 0, minHeight: 0, fontSize: "var(--t-xs)", cursor: "pointer" }}>
                    Forgot?
                  </button>
                )}
              </div>
              <div style={{ position: "relative" }}>
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete={mode === "signin" ? "current-password" : "new-password"}
                  placeholder={mode === "signup" ? "At least 8 characters" : "Your password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onBlur={() => setTouched((t) => ({ ...t, password: true }))}
                  onKeyDown={onKeyDown}
                  aria-invalid={showPwError}
                />
                <button type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  style={{ position: "absolute", right: 6, top: "50%", transform: "translateY(-50%)", background: "transparent", border: 0, padding: 6, cursor: "pointer", color: "var(--ink-muted)", height: "auto", minHeight: 0 }}>
                  <Icon name={showPassword ? "close" : "search"} size="sm"/>
                </button>
              </div>

              {mode === "signup" && password.length > 0 && (
                <PasswordMeter check={pwCheck}/>
              )}

              {mode === "signup" && (
                <>
                  <label htmlFor="confirm" style={{ marginTop: "var(--s-3)" }}>Confirm password</label>
                  <input
                    id="confirm"
                    type={showPassword ? "text" : "password"}
                    autoComplete="new-password"
                    placeholder="Repeat your password"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    onBlur={() => setTouched((t) => ({ ...t, confirm: true }))}
                    onKeyDown={onKeyDown}
                    aria-invalid={showConfirmError}
                  />
                  {showConfirmError && (
                    <p className="u-text-xs" style={{ color: "var(--status-crit)", marginTop: 4 }}>
                      Passwords don't match.
                    </p>
                  )}
                </>
              )}
            </>
          )}

          <div style={{ marginTop: "var(--s-5)" }}>
            <Button variant="primary" onClick={submit} disabled={!canSubmit} className="u-full">
              {busy ? "Working…" : submitLabel}
              <Icon name="arrow_right" size="sm"/>
            </Button>
          </div>

          {error && (
            <p role="alert" className="signin__status" style={{ color: "var(--status-crit)" }}>
              {error}
            </p>
          )}
          {status && !error && (
            <p role="status" className="signin__status">{status}</p>
          )}

          <div className="signin__divider"><span>or</span></div>

          {mode !== "signin" && (
            <Button variant="ghost" onClick={() => switchMode("signin")} className="u-full">
              Sign in with password
            </Button>
          )}
          {mode !== "signup" && mode !== "reset" && (
            <Button variant="ghost" onClick={() => switchMode("signup")} className="u-full">
              Create a new account
            </Button>
          )}
          {mode !== "magic" && mode !== "reset" && (
            <Button variant="ghost" onClick={() => switchMode("magic")} className="u-full">
              Email me a magic link instead
            </Button>
          )}

          <p className="signin__fine">
            By continuing, you agree the app stores your email and expense log
            in your private Supabase workspace.
          </p>
        </div>
      </section>
    </div>
  );
}

function PasswordMeter({ check }: { check: ReturnType<typeof checkPassword> }) {
  const color = check.score <= 1 ? "var(--status-crit)"
              : check.score === 2 ? "var(--status-warn)"
              : check.score === 3 ? "var(--status-good)"
              : "var(--accent-500)";
  const pct = check.score * 25;
  return (
    <div style={{ marginTop: "var(--s-2)" }}>
      <div className="u-row u-row-between u-text-xs" style={{ color: "var(--ink-muted)", marginBottom: 4 }}>
        <span>Strength</span>
        <span style={{ color }}>{check.label}</span>
      </div>
      <div style={{ height: 4, background: "var(--surface-alt)", borderRadius: 999, overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${pct}%`, background: color, transition: "width 0.3s" }}/>
      </div>
      {check.failures.length > 0 && (
        <ul className="u-text-xs u-ink-muted" style={{ listStyle: "none", padding: 0, margin: "8px 0 0" }}>
          {check.failures.slice(0, 3).map((f) => (
            <li key={f} style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
              <span style={{ width: 14, height: 14, borderRadius: 999, display: "inline-flex", alignItems: "center", justifyContent: "center", background: "var(--status-crit)", color: "white", fontSize: 10 }}>×</span>
              {f}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Feat({ icon, label }: { icon: Parameters<typeof Icon>[0]["name"]; label: string }) {
  return (
    <div className="signin__feat">
      <span className="signin__feat-icon"><Icon name={icon} size="sm"/></span>
      <span>{label}</span>
    </div>
  );
}
