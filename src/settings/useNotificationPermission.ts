import { useEffect, useState } from "react";
import { LocalNotifications } from "@capacitor/local-notifications";

/**
 * Android 13+ requires a runtime POST_NOTIFICATIONS request (gap analysis
 * "should fix"). Requested lazily — the first time the tap-session flow
 * actually needs to notify ("Ride started"), not blind on app launch.
 */
export function useNotificationPermission() {
  const [granted, setGranted] = useState<boolean | null>(null);

  useEffect(() => {
    LocalNotifications.checkPermissions().then((status) => {
      setGranted(status.display === "granted");
    });
  }, []);

  const request = async (): Promise<boolean> => {
    const status = await LocalNotifications.requestPermissions();
    const ok = status.display === "granted";
    setGranted(ok);
    return ok;
  };

  return { granted, request };
}

/** Fires the "Ride started" notification, requesting permission first if
 * it hasn't been granted or denied yet. Silently no-ops if denied — the app
 * must keep working without it (acceptance criterion in features/polish.md). */
export async function notifyRideStarted(vehicleName: string) {
  const status = await LocalNotifications.checkPermissions();
  if (status.display === "prompt" || status.display === "prompt-with-rationale") {
    await LocalNotifications.requestPermissions();
  }
  const after = await LocalNotifications.checkPermissions();
  if (after.display !== "granted") return;

  await LocalNotifications.schedule({
    notifications: [
      {
        id: Date.now() % 2147483647,
        title: "Ride started",
        body: `${vehicleName} is now active. Tap again when you fuel up.`,
      },
    ],
  });
}
