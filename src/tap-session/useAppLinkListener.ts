import { useEffect } from "react";
import { App, type URLOpenListenerEvent } from "@capacitor/app";

type TokenHandler = (token: string) => void | Promise<void>;

const ALLOWED_HOSTS = [
  "motopulse.app",
  "motopulse.mas20042005.workers.dev",
  "motopulse.pages.dev",
  "localhost",
];

/**
 * Extracts a token from an App Link URL or NFC payload.
 * Validates against trusted domains, strips query/hash parameters,
 * and ensures the token matches the opaque 8-64 char alphanumeric format.
 */
export function extractToken(url: string | null | undefined): string | null {
  if (!url) return null;

  try {
    const parsed = new URL(url);
    const host = parsed.hostname.toLowerCase();
    const isAllowedHost =
      ALLOWED_HOSTS.some((h) => host === h || host.endsWith("." + h)) ||
      (typeof window !== "undefined" && host === window.location.hostname);

    if (!isAllowedHost) return null;

    const match = parsed.pathname.match(/^\/v\/([A-Za-z0-9_-]{8,64})(?:[/?#]|$)/);
    if (match) return match[1];
    return null;
  } catch {
    // Custom scheme e.g. motopulse://v/:token or motopulse://app/v/:token
    if (url.startsWith("motopulse://")) {
      const match = url.match(/motopulse:\/\/(?:app)?\/v\/([A-Za-z0-9_-]{8,64})(?:[/?#]|$)/);
      if (match) return match[1];
    }
    return null;
  }
}

/** Listens for the Android App Link that fires when a MotoPulse tag is
 * tapped (gap analysis #2 — handled at the Android layer via assetlinks,
 * not through the Capacitor NFC plugin). Pending taps that arrive while the
 * user is logged out are deferred to localStorage, replayed by takePendingTap
 * after sign-in (gap analysis "should fix": tap-while-logged-out resumes). */
export function useAppLinkListener(onToken: TokenHandler) {
  useEffect(() => {
    let handle: { remove: () => Promise<void> } | undefined;

    // Check cold-start launch URL (when app was opened from cold start by NFC tap)
    App.getLaunchUrl()
      .then((launch) => {
        if (launch?.url) {
          const token = extractToken(launch.url);
          if (token) void onToken(token);
        }
      })
      .catch(() => {});

    // Listen for subsequent intent opens while app is running
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
