/**
 * The public origin of this MotoPulse deployment.
 *
 * NFC tags, QR codes, and invite links all encode absolute URLs that end
 * up in physical stickers or shared messages, so the host they point at
 * must survive deployments. We take it from an env var at build time:
 *
 *   VITE_PUBLIC_URL=https://motopulse.pages.dev   (CF Pages subdomain)
 *   VITE_PUBLIC_URL=https://motopulse.app          (owned custom domain)
 *   (unset)                                       → fall back to current origin
 *
 * The fallback to window.location.origin is for local dev — any URL encoded
 * there is useless on another device anyway.
 */
export const PUBLIC_URL: string = (() => {
  const env = (import.meta.env.VITE_PUBLIC_URL ?? "").trim();
  if (env) return env.replace(/\/+$/, "");
  if (typeof window !== "undefined") return window.location.origin;
  return "https://motopulse.pages.dev";
})();

/** The token URL encoded onto physical NFC/QR assets. */
export const TOKEN_URL_PREFIX: string = `${PUBLIC_URL}/v/`;

/** Invite link embedded in referral QRs and share buttons. */
export const INVITE_URL_PREFIX: string = `${PUBLIC_URL}/i/`;
