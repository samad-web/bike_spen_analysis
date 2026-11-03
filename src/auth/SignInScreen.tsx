import { useState } from "react";
import { useAuth } from "./AuthContext";
import { Button, Icon } from "@/app/ui";

/** Sign-in — redesigned per audit: calmer blobs, breathing form, no competing
 *  glass surface, feature chips grouped on the hero side. */
export function SignInScreen() {
  const { signInWithEmail, signInWithGoogle } = useAuth();
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  const handleEmail = async () => {
    if (!email || sending) return;
    setSending(true);
    setStatus("Sending link…");
    const { error } = await signInWithEmail(email);
    setStatus(error ? `Couldn't send: ${error}` : "Check your inbox — the magic link lasts 1 hour.");
    setSending(false);
  };

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
          <h2 className="signin__form-title">Welcome back</h2>
          <p className="signin__form-sub">Sign in with a magic link — no password to remember.</p>

          <label htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            inputMode="email"
            autoComplete="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          <Button variant="primary" onClick={handleEmail} disabled={!email || sending} className="u-full">
            {sending ? "Sending…" : "Email me a sign-in link"}
            <Icon name="arrow_right" size="sm"/>
          </Button>

          <div className="signin__divider"><span>or</span></div>

          <Button variant="ghost" onClick={() => void signInWithGoogle()} className="u-full">
            <GoogleG/> Continue with Google
          </Button>

          {status && <p role="status" className="signin__status">{status}</p>}

          <p className="signin__fine">
            By continuing, you agree the app stores your email and expense log
            in your private Supabase workspace.
          </p>
        </div>
      </section>
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

function GoogleG() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.9 32.8 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.8 1.1 7.9 3L37.6 9.3C34 6 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.3-.4-3.5z"/>
      <path fill="#FF3D00" d="M6.3 14.1l6.6 4.8C14.6 15.1 18.9 12 24 12c3 0 5.8 1.1 7.9 3L37.6 9.3C34 6 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.1z"/>
      <path fill="#4CAF50" d="M24 44c5.1 0 9.8-2 13.4-5.1l-6.2-5.2C29.3 35.3 26.8 36 24 36c-5.3 0-9.8-3.2-11.3-7.6l-6.6 5C9.6 39.6 16.2 44 24 44z"/>
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.7 2-2.1 3.8-3.9 5.1l6.2 5.2C40.6 35.5 44 30.2 44 24c0-1.2-.1-2.4-.4-3.5z"/>
    </svg>
  );
}
