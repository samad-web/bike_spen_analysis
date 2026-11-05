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
import { CardsScreen } from "@/cards/CardsScreen";
import { CalendarScreen } from "@/calendar/CalendarScreen";
import { TapHandler } from "@/tap-session/TapHandler";
import { DesktopSidebar, MobileNav } from "./Navigation";
import { useDueNotifications } from "@/notifications/useDueNotifications";
import { AdminScreen } from "@/admin/AdminScreen";
import { DonateScreen } from "@/support/DonateScreen";
import { ScanFab } from "./ScanFab";
import { stashPendingTap } from "@/tap-session/useAppLinkListener";

function TokenRouteHandler() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();

  useEffect(() => {
    if (token) {
      stashPendingTap(token);
      window.dispatchEvent(new CustomEvent("motopulse:tapToken", { detail: token }));
    }
    navigate("/dashboard", { replace: true });
  }, [token, navigate]);

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
          <Route path="/cards" element={<CardsScreen />} />
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
