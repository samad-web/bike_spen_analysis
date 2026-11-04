import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { registerSW } from "virtual:pwa-register";
import { AuthProvider } from "@/auth/AuthContext";
import { App } from "@/app/App";
import "@/app/app.css";
import "@/auth/signin.css";

// Register the Service Worker. autoUpdate strategy (configured in
// vite.config.ts): on every page load the SW checks for a new version and
// swaps the cached app shell on the next cold start. This is what lets
// the app boot offline / when Cloudflare is unreachable and still pick up
// new CF deploys silently.
registerSW({
  immediate: true,
  onRegisteredSW() {
    // No-op — autoUpdate handles everything. Hook kept for future telemetry.
  },
  onRegisterError(err) {
    console.warn("SW registration failed (app still works, just no offline cache):", err);
  },
});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>
);
