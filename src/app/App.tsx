import { useEffect } from "react";
import { Navigate, Route, Routes, useNavigate, useParams } from "react-router-dom";
import { useAuth } from "@/auth/AuthContext";
import { SignInScreen } from "@/auth/SignInScreen";
import { DashboardScreen } from "@/dashboard/DashboardScreen";
import { VehiclesScreen } from "@/vehicles/VehiclesScreen";
import { VehicleDetailScreen } from "@/vehicles/VehicleDetailScreen";
import { NfcToolsScreen } from "@/nfc/NfcToolsScreen";
import { AnalyticsScreen } from "@/analytics/AnalyticsScreen";
import { SettingsScreen } from "@/settings/SettingsScreen";
import { CalendarScreen } from "@/calendar/CalendarScreen";
import { TapHandler } from "@/tap-session/TapHandler";
import { DesktopSidebar, MobileNav } from "./Navigation";
import { useDueNotifications } from "@/notifications/useDueNotifications";
import { AdminScreen } from "@/admin/AdminScreen";
import { DonateScreen } from "@/support/DonateScreen";
import { ScanFab } from "./ScanFab";
import { stashPendingTap } from "@/tap-session/useAppLinkListener";
import { Capacitor } from "@capacitor/core";

function TokenRouteHandler() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();

  useEffect(() => {
    if (!token) return;

    // Inside native app: process immediately and route to dashboard
    if (Capacitor.isNativePlatform()) {
      stashPendingTap(token);
      window.dispatchEvent(new CustomEvent("motopulse:tapToken", { detail: token }));
      navigate("/dashboard", { replace: true });
      return;
    }

    // In a mobile web browser:
    // Stash the token and automatically launch the installed MotoPulse Android app
    stashPendingTap(token);
    const intentUrl = `intent://v/${token}#Intent;scheme=motopulse;package=app.motopulse.android;end;`;
    window.location.href = intentUrl;
  }, [token, navigate]);

  // If in web browser, render an instant deep-link transition card
  if (!Capacitor.isNativePlatform() && token) {
    const intentUrl = `intent://v/${token}#Intent;scheme=motopulse;package=app.motopulse.android;end;`;

    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "100vh",
          padding: 24,
          textAlign: "center",
          background: "#0d0d11",
          color: "#f5f5f7",
        }}
      >
        <div
          style={{
            width: 72,
            height: 72,
            borderRadius: "50%",
            background: "linear-gradient(135deg, #38bdf8, #0284c7)",
            display: "grid",
            placeItems: "center",
            fontSize: 34,
            marginBottom: 20,
            boxShadow: "0 8px 24px rgba(56, 189, 248, 0.3)",
          }}
        >
          🏍
        </div>
        <h2 style={{ fontSize: "1.35rem", margin: "0 0 8px" }}>Opening MotoPulse...</h2>
        <p style={{ color: "#8e8e93", fontSize: "0.95rem", maxWidth: 340, margin: "0 0 24px" }}>
          Redirecting to the MotoPulse mobile app to process your bike tap.
        </p>

        <a
          href={intentUrl}
          style={{
            display: "inline-block",
            background: "#38bdf8",
            color: "#000000",
            fontWeight: 700,
            padding: "14px 28px",
            borderRadius: 12,
            textDecoration: "none",
            fontSize: "1rem",
            marginBottom: 16,
          }}
        >
          Open in MotoPulse App
        </a>

        <div>
          <button
            type="button"
            onClick={() => {
              window.dispatchEvent(new CustomEvent("motopulse:tapToken", { detail: token }));
              navigate("/dashboard", { replace: true });
            }}
            style={{
              background: "none",
              border: 0,
              color: "#8e8e93",
              fontSize: "0.85rem",
              textDecoration: "underline",
              cursor: "pointer",
            }}
          >
            Continue in web browser instead
          </button>
        </div>
      </div>
    );
  }

  return null;
}

function InviteRouteHandler() {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();

  useEffect(() => {
    if (code) {
      try {
        localStorage.setItem("motopulse:referred_by", code.trim());
      } catch {
        /* ignore */
      }
    }
    navigate("/dashboard", { replace: true });
  }, [code, navigate]);

  return null;
}

export function App() {
  const { session, loading } = useAuth();
  // Mount the overdue/expiring notification scheduler once at the app shell level.
  // It no-ops when the user isn't signed in.
  useDueNotifications();

  if (loading) {
    return (
      <div style={{ display: "grid", placeItems: "center", minHeight: "100vh" }}>
        <div className="pulse" style={{
          width: 48, height: 48, borderRadius: "50%",
          background: "linear-gradient(135deg, var(--accent-glow), var(--accent-500))",
        }}/>
      </div>
    );
  }

  if (!session) {
    return (
      <Routes>
        <Route
          path="/donate"
          element={
            <div className="app-shell" style={{ padding: "var(--s-5) var(--s-4)", maxWidth: 720, margin: "0 auto" }}>
              <DonateScreen publicView />
            </div>
          }
        />
        <Route path="/v/:token" element={<TokenRouteHandler />} />
        <Route path="/i/:code" element={<InviteRouteHandler />} />
        <Route path="*" element={<SignInScreen />} />
      </Routes>
    );
  }

  return (
    <div className="app-shell">
      <DesktopSidebar />
      <main className="app-main">
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<DashboardScreen />} />
          <Route path="/calendar" element={<CalendarScreen />} />
          <Route path="/vehicles" element={<VehiclesScreen />} />
          <Route path="/vehicles/:vehicleId" element={<VehicleDetailScreen />} />
          <Route path="/nfc-tools" element={<NfcToolsScreen />} />
          <Route path="/analytics" element={<AnalyticsScreen />} />
          <Route path="/settings" element={<SettingsScreen />} />
          <Route path="/admin" element={<AdminScreen />} />
          <Route path="/donate" element={<DonateScreen />} />
          <Route path="/v/:token" element={<TokenRouteHandler />} />
          <Route path="/i/:code" element={<InviteRouteHandler />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </main>
      <MobileNav />
      <TapHandler />
      <ScanFab />
    </div>
  );
}
