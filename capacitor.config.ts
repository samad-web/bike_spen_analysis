import type { CapacitorConfig } from "@capacitor/cli";

/**
 * MotoPulse Capacitor config.
 *
 * SDUI note: `server.url` points at the deployed Cloudflare Pages app so
 * the Android shell loads UI from the live URL instead of a bundled copy.
 * Every git push to main → CF redeploys → the installed APK picks up the
 * new UI on next launch. No APK rebuild needed for UI/logic changes.
 *
 * Native features (NFC, Local Notifications, SQLite, App) still work via
 * the Capacitor bridge — Capacitor plugins are injected into whatever the
 * WebView loads, local or remote.
 *
 * Caveats:
 *   - Needs network at launch. First launch and every cold start fetches
 *     index.html from the server.
 *   - If CF Pages is down, the app can't boot. (For a true production
 *     app, swap to @capgo/capacitor-updater which bundles a fallback.)
 *   - To develop locally against a dev server, set VITE_CAPACITOR_SERVER
 *     to http://192.168.x.y:5173 (your dev machine on LAN) and rebuild.
 */

const PRODUCTION_URL = "https://motopulse.mas20042005.workers.dev";
const devOverride = process.env.VITE_CAPACITOR_SERVER;

const config: CapacitorConfig = {
  appId: "app.motopulse.android",
  appName: "MotoPulse",
  webDir: "dist",
  android: {
    allowMixedContent: false,
  },
  server: {
    url: devOverride || PRODUCTION_URL,
    cleartext: false,
    // Allowlist of hosts the WebView can navigate to. Keep it tight — any
    // host the APK can resolve becomes a valid NFC/QR target for auth redirects.
    allowNavigation: [
      "motopulse.mas20042005.workers.dev",
      "*.supabase.co",             // auth callback
      "accounts.google.com",       // OAuth if enabled
      "logo.clearbit.com",         // brand-logo API (not currently used)
    ],
  },
};

export default config;
