import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "@/auth/AuthContext";
import { SignInScreen } from "@/auth/SignInScreen";
import { DashboardScreen } from "@/dashboard/DashboardScreen";
import { VehiclesScreen } from "@/vehicles/VehiclesScreen";
import { VehicleDetailScreen } from "@/vehicles/VehicleDetailScreen";
import { NfcToolsScreen } from "@/nfc/NfcToolsScreen";
import { AnalyticsScreen } from "@/analytics/AnalyticsScreen";
import { SettingsScreen } from "@/settings/SettingsScreen";
import { TapHandler } from "@/tap-session/TapHandler";
import { DesktopSidebar, MobileNav } from "./Navigation";
import { useDueNotifications } from "@/notifications/useDueNotifications";
import { AdminScreen } from "@/admin/AdminScreen";
import { DonateScreen } from "@/support/DonateScreen";
import { ScanFab } from "./ScanFab";

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
  if (!session) return <SignInScreen />;

  return (
    <div className="app-shell">
      <DesktopSidebar />
      <main className="app-main">
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<DashboardScreen />} />
          <Route path="/vehicles" element={<VehiclesScreen />} />
          <Route path="/vehicles/:vehicleId" element={<VehicleDetailScreen />} />
          <Route path="/nfc-tools" element={<NfcToolsScreen />} />
          <Route path="/analytics" element={<AnalyticsScreen />} />
          <Route path="/settings" element={<SettingsScreen />} />
          <Route path="/admin" element={<AdminScreen />} />
          <Route path="/donate" element={<DonateScreen />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </main>
      <MobileNav />
      <TapHandler />
      <ScanFab />
    </div>
  );
}
