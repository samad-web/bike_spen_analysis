import { useEffect } from "react";
import { App, type URLOpenListenerEvent } from "@capacitor/app";
import { MOTOPULSE_URL_PREFIX } from "@/nfc/nfcPlugin";

type TokenHandler = (token: string) => void | Promise<void>;

/** Listens for the Android App Link that fires when a MotoPulse tag is
 * tapped (gap analysis #2 — handled at the Android layer via assetlinks,
 * not through the Capacitor NFC plugin). Pending taps that arrive while the
 * user is logged out are deferred to localStorage, replayed by replayPendingTap
 * after sign-in (gap analysis "should fix": tap-while-logged-out resumes). */
export function useAppLinkListener(onToken: TokenHandler) {
  useEffect(() => {
    let handle: { remove: () => Promise<void> } | undefined;
    App.addListener("appUrlOpen", (event: URLOpenListenerEvent) => {
      const token = extractToken(event.url);
      if (token) void onToken(token);
    }).then((h) => {
      handle = h;
    });
    return () => {
      void handle?.remove();
    };
  }, [onToken]);
}

export function extractToken(url: string | null | undefined): string | null {
  if (!url) return null;
  if (!url.startsWith(MOTOPULSE_URL_PREFIX)) return null;
  const rest = url.slice(MOTOPULSE_URL_PREFIX.length);
  // Guard against path traversal / query strings — the token is a bare opaque string.
  const token = rest.split(/[/?#]/)[0];
  return /^[A-Za-z0-9_-]{8,64}$/.test(token) ? token : null;
}

const PENDING_KEY = "motopulse:pendingTapToken";

export function stashPendingTap(token: string): void {
  try {
    localStorage.setItem(PENDING_KEY, token);
  } catch {
    /* localStorage can fail in private mode — tap is simply lost in that case */
  }
}

export function takePendingTap(): string | null {
  try {
    const t = localStorage.getItem(PENDING_KEY);
    if (t) localStorage.removeItem(PENDING_KEY);
    return t;
  } catch {
    return null;
  }
}
