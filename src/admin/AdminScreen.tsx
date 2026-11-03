import { useState } from "react";
import { Navigate } from "react-router-dom";
import { Button, Card, Icon, StatTile } from "@/app/ui";
import { useProfile } from "@/profile/useProfile";
import { useAdminStats, type AdminUserRow } from "./useAdminStats";
import { useDonationConfig } from "@/support/useDonationConfig";
import { formatCurrency } from "@/app/charts";

/** Superadmin-only dashboard. User roles, activity, and the donation UPI
 * config live here. Non-admins are redirected to the home dashboard. */
export function AdminScreen() {
  const { profile, loading: profileLoading, isSuperadmin } = useProfile();
  const { rows, totals, loading, error, toggleRole } = useAdminStats(isSuperadmin);

  if (profileLoading) return <p className="u-ink-muted">Loading…</p>;
  if (!profile || !isSuperadmin) return <Navigate to="/dashboard" replace />;

  return (
    <div className="u-col u-gap-5">
      <header className="page-head">
        <div>
          <h1>Admin console</h1>
          <p className="u-ink-muted u-text-sm">Users, activity, and app settings.</p>
        </div>
      </header>

      {/* Top-line stats */}
      <div className="bento">
        <div className="bento__3"><StatTile label="Users"           value={String(totals.total)} /></div>
        <div className="bento__3"><StatTile label="Active · 30 d"  value={String(totals.activeLast30)} /></div>
        <div className="bento__3"><StatTile label="New · 7 d"      value={String(totals.signupsLast7)} /></div>
        <div className="bento__3"><StatTile label="Lifetime spend" value={formatCurrency(totals.lifetimeSpend)} variant="accent"/></div>
        <div className="bento__6"><StatTile label="Vehicles tracked" value={String(totals.vehicles)} /></div>
        <div className="bento__6"><StatTile label="Expenses logged" value={String(totals.expenses)} /></div>
      </div>

      {/* Donation config */}
      <DonationAdminCard/>

      {/* User list */}
      <Card>
        <div className="u-row u-row-between">
          <h3>People</h3>
          <span className="chip">{rows.length}</span>
        </div>
        {loading ? <p className="u-ink-muted u-text-sm">Loading users…</p>
          : error ? <p role="alert" className="u-text-sm" style={{ color: "var(--status-crit)" }}>{error}</p>
          : rows.length === 0 ? <p className="u-ink-muted u-text-sm">No users yet.</p>
          : <AdminUserTable rows={rows} toggleRole={toggleRole}/>
        }
      </Card>
    </div>
  );
}

function AdminUserTable({ rows, toggleRole }: {
  rows: AdminUserRow[];
  toggleRole: (userId: string, next: "user" | "superadmin") => Promise<{ error: string | null }>;
}) {
  return (
    <div style={{ overflowX: "auto" }}>
      <table className="admin-table">
        <thead>
          <tr>
            <th>Email</th>
            <th>Role</th>
            <th>Joined</th>
            <th>Last active</th>
            <th>Vehicles</th>
            <th>Entries</th>
            <th>Spend</th>
            <th>Referral</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.user_id}>
              <td>{r.email}</td>
              <td>
                <span className={"chip " + (r.role === "superadmin" ? "chip--accent" : "")}>
                  {r.role}
                </span>
              </td>
              <td className="u-text-xs u-ink-muted">{formatShortDate(r.signed_up_at)}</td>
              <td className="u-text-xs u-ink-muted">{r.last_activity_at ? formatShortDate(r.last_activity_at) : "—"}</td>
              <td>{r.vehicle_count}</td>
              <td>{r.expense_count}</td>
              <td>{formatCurrency(Number(r.lifetime_spend ?? 0))}</td>
              <td className="u-text-xs u-ink-muted">{r.referral_code}</td>
              <td>
                <Button variant="ghost" size="sm"
                  onClick={() => void toggleRole(r.user_id, r.role === "superadmin" ? "user" : "superadmin")}>
                  {r.role === "superadmin" ? "Demote" : "Promote"}
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function DonationAdminCard() {
  const { config, update } = useDonationConfig();
  const [upi, setUpi] = useState(config?.upi_id ?? "");
  const [name, setName] = useState(config?.display_name ?? "");
  const [note, setNote] = useState(config?.note ?? "");
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  // Sync local state once the server config loads
  if (config && savedAt === null && upi === "" && config.upi_id !== "") {
    setUpi(config.upi_id);
    setName(config.display_name);
    setNote(config.note);
  }

  const save = async () => {
    setSaving(true);
    await update({ upi_id: upi.trim(), display_name: name.trim(), note: note.trim() });
    setSaving(false);
    setSavedAt(Date.now());
  };

  return (
    <Card>
      <div className="u-row u-row-between">
        <h3>Donation UPI</h3>
        <span className="chip">Shown publicly on /donate</span>
      </div>
      <p className="u-text-sm u-ink-muted">
        Users scanning the QR send to this UPI id. Supports any @upi handle (phonepe, paytm, oksbi, …).
      </p>

      <div>
        <label htmlFor="d-upi">UPI id</label>
        <input id="d-upi" value={upi} onChange={(e) => setUpi(e.target.value)}
          placeholder="yourname@okaxis"
          style={{ fontFamily: "ui-monospace, monospace" }}/>
      </div>
      <div>
        <label htmlFor="d-name">Display name</label>
        <input id="d-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="MotoPulse Support"/>
      </div>
      <div>
        <label htmlFor="d-note">Transaction note</label>
        <input id="d-note" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Support MotoPulse"/>
      </div>

      <div className="sheet__actions">
        <Button variant="primary" onClick={() => void save()} disabled={saving || !upi.trim()}>
          <Icon name="check" size="sm"/> {saving ? "Saving…" : savedAt ? "Saved" : "Save donation config"}
        </Button>
      </div>
    </Card>
  );
}

function formatShortDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}
