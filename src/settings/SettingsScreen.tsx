import { Link } from "react-router-dom";
import { useAuth } from "@/auth/AuthContext";
import { useSettings } from "./useSettings";
import { useProfile } from "@/profile/useProfile";
import { Button, Card, Icon } from "@/app/ui";
import { InviteCard } from "@/referrals/InviteCard";

export function SettingsScreen() {
  const { session, signOut } = useAuth();
  const { currency, loading: currencyLoading, updateCurrency } = useSettings();
  const { profile, isSuperadmin, error: profileError, loading: profileLoading, refresh } = useProfile();

  return (
    <div className="u-col u-gap-5">
      <header className="page-head">
        <div>
          <h1>Settings</h1>
          <p className="u-ink-muted u-text-sm">Account, preferences, and tools.</p>
        </div>
      </header>

      {/* Always-visible profile diagnostic — so if Admin + Invite are missing
          the user can see *why* instead of guessing. */}
      <Card>
        <div className="u-row u-row-between">
          <h3>Account</h3>
          <Button size="sm" variant="ghost" onClick={() => void refresh()}>
            <Icon name="arrow_right" size="sm"/> Refresh
          </Button>
        </div>
        <div className="u-row u-row-between">
          <span className="u-ink-muted u-text-sm">Signed in as</span>
          <strong>{session?.user.email}</strong>
        </div>
        <div className="u-row u-row-between">
          <span className="u-ink-muted u-text-sm">Role</span>
          <strong>
            {profileLoading ? "loading…"
              : profileError ? "unknown"
              : profile ? (isSuperadmin ? "Superadmin" : "User")
              : "no profile row"}
          </strong>
        </div>
        <div className="u-row u-row-between">
          <span className="u-ink-muted u-text-sm">Referral code</span>
          <code>{profile?.referral_code ?? "—"}</code>
        </div>
        {profileError && (
          <p role="alert" className="u-text-sm" style={{ color: "var(--status-crit)", marginTop: 8 }}>
            <strong>Profile fetch failed:</strong> {profileError}
          </p>
        )}
        {!profileLoading && !profileError && !profile && (
          <p role="alert" className="u-text-sm" style={{ color: "var(--status-warn)", marginTop: 8 }}>
            Your profile row doesn't exist yet. Hard-refresh (<kbd>Ctrl+Shift+R</kbd>) or sign out and back in.
          </p>
        )}
      </Card>

      <Card>
        <h3>Preferences</h3>
        <div>
          <label htmlFor="cur">Currency</label>
          <select id="cur" value={currency} disabled={currencyLoading}
            onChange={(e) => void updateCurrency(e.target.value as "INR" | "USD")}>
            <option value="INR">₹ (INR)</option>
            <option value="USD">$ (USD)</option>
          </select>
        </div>
      </Card>

      <InviteCard/>

      <Card>
        <div className="u-row u-row-between">
          <h3>Support MotoPulse</h3>
          <span className="chip">UPI</span>
        </div>
        <p className="u-text-sm u-ink-muted">
          If MotoPulse saves you time at the pump, help us keep it free and ad-free.
        </p>
        <div className="sheet__actions">
          <Link to="/donate" className="btn btn--primary">
            <Icon name="arrow_right" size="sm"/> Support
          </Link>
        </div>
      </Card>

      <Card>
        <h3>Tools</h3>
        <div className="u-row u-gap-2 u-row-wrap">
          <Link to="/nfc-tools" className="pill-btn">
            <Icon name="nfc" size="sm"/> NFC Tools
          </Link>
          {isSuperadmin && (
            <Link to="/admin" className="pill-btn is-active">
              <Icon name="settings" size="sm"/> Admin console
            </Link>
          )}
        </div>
        {!isSuperadmin && !profileLoading && profile && (
          <p className="u-text-xs u-ink-muted">
            Admin console is only visible to superadmin accounts.
          </p>
        )}
      </Card>

      <div>
        <Button variant="ghost" onClick={() => void signOut()}>
          <Icon name="logout" size="sm"/> Sign out
        </Button>
      </div>
    </div>
  );
}
