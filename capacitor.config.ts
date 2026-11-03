import type { CapacitorConfig } from "@capacitor/cli";

// App Link host used for NFC tag payloads (see build-docs/features/nfc-tools.md
// and build-docs/features/tap-session.md). assetlinks.json must be served from
// https://motopulse.app/.well-known/assetlinks.json pointing at this package.
const config: CapacitorConfig = {
  appId: "app.motopulse.android",
  appName: "MotoPulse",
  webDir: "dist",
  android: {
    allowMixedContent: false,
  },
};

export default config;
