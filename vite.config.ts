import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
import path from "node:path";

/**
 * Service Worker config addresses the "CF down = app down" caveat of the
 * live-URL SDUI setup:
 *   - On first launch (online), the SW caches app shell + hashed JS/CSS
 *     + fonts + brand logos.
 *   - On subsequent launches, index.html is served from cache if the
 *     network is unavailable or slow. The app boots offline.
 *   - Supabase + storage requests are NOT cached (they hit the network
 *     every time; cached data would be stale).
 *   - When a new CF deploy ships, the SW picks up the updated manifest
 *     and swaps the shell on the next cold start.
 */
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      workbox: {
        // App shell + all hashed Vite assets
        globPatterns: ["**/*.{js,css,html,ico,png,svg,webp,woff,woff2}"],
        // Lazy-loaded chunks (jspdf, ort, background-removal) can be huge.
        maximumFileSizeToCacheInBytes: 30 * 1024 * 1024,
        runtimeCaching: [
          {
            // Brand logos — long cache, update in the background
            urlPattern: ({ url }) => url.pathname.startsWith("/brand-logos/"),
            handler: "StaleWhileRevalidate",
            options: { cacheName: "brand-logos", expiration: { maxEntries: 60, maxAgeSeconds: 60 * 60 * 24 * 30 } },
          },
          {
            // Vehicle photos in the Supabase storage bucket — stale-while-revalidate
            urlPattern: /^https:\/\/[a-z0-9-]+\.supabase\.co\/storage\/v1\/object\/public\/vehicle-photos\//,
            handler: "StaleWhileRevalidate",
            options: { cacheName: "vehicle-photos", expiration: { maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 * 7 } },
          },
        ],
        // Auth, data, RPC, storage uploads, realtime websocket — never cache
        navigateFallbackDenylist: [/^\/auth\//, /^\/rest\//, /^\/realtime\//, /^\/storage\//],
      },
      includeAssets: ["favicon.ico"],
      manifest: {
        name: "MotoPulse",
        short_name: "MotoPulse",
        description: "Tap-to-log fuel and service for your bike.",
        theme_color: "#f5b800",
        background_color: "#0b0b0f",
        display: "standalone",
        start_url: "/",
      },
    }),
  ],
  resolve: {
    alias: { "@": path.resolve(__dirname, "src") },
  },
  server: { port: 5173 },
});
