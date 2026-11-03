import { useEffect, useRef, useState } from "react";
import { errorMessage } from "@/lib/errors";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/auth/AuthContext";
import { useVehicles } from "@/vehicles/useVehicles";
import { Button, Card, Icon } from "@/app/ui";
import { generateToken, registerToken } from "./tagRegistry";
import { logTagEvent } from "./useTagEvents";
import { renderQrWithLogo } from "./qrRenderer";
import { brandMarkForMake, brandMarkToDataUrl, brandSlug, resolveBrandLogoFile } from "@/vehicles/brandLogo";

import { PUBLIC_URL, TOKEN_URL_PREFIX } from "@/lib/publicUrl";
const BASE_URL = TOKEN_URL_PREFIX;
const DISPLAY_HOST = PUBLIC_URL.replace(/^https?:\/\//, "");

interface Props {
  vehicleId: string;
  vehicleName: string;
  activeToken: string | null;
}

/**
 * QR codes reuse the SAME token-URL format as NFC tags, so a phone's native
 * camera can scan a printed QR, open the URL, and the Android App Link
 * handler fires the exact same quick-log flow as a tap.
 *
 * This card renders the QR with the vehicle's brand logo centered in it
 * (if the make matches a known brand). Logo lookups come from
 * `vehicles/brandLogo.ts` → bundled inline SVG brand marks (no network).
 */
export function QrCodeCard({ vehicleId, vehicleName, activeToken }: Props) {
  const { session } = useAuth();
  const { vehicles } = useVehicles();
  const vehicle = vehicles.find((v) => v.id === vehicleId);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [token, setToken] = useState<string | null>(activeToken);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const url = token ? `${BASE_URL}${token}` : "";
  const brandMark = brandMarkForMake(vehicle?.make);
  const inlineMarkUrl = brandMark ? brandMarkToDataUrl(brandMark, 128) : null;
  const [resolvedFileUrl, setResolvedFileUrl] = useState<string | null>(null);

  // Prefer a real logo file dropped into public/brand-logos/<slug>.<ext>
  useEffect(() => {
    let cancelled = false;
    void resolveBrandLogoFile(vehicle?.make).then((u) => {
      if (!cancelled) setResolvedFileUrl(u);
    });
    return () => { cancelled = true; };
  }, [vehicle?.make]);

  const logoUrl = resolvedFileUrl ?? inlineMarkUrl;

  useEffect(() => {
    if (!url || !canvasRef.current) return;
    void renderQrWithLogo({
      canvas: canvasRef.current,
      payload: url,
      logoUrl,
      size: 240,
    });
  }, [url, logoUrl]);

  const mintNewToken = async () => {
    if (!session?.user.id) return;
    setBusy(true);
    setError(null);
    try {
      const newToken = generateToken();
      const registered = await registerToken(vehicleId, newToken);
      await supabase.from("vehicles").update({ qr_exported_at: new Date().toISOString() }).eq("id", vehicleId);
      await logTagEvent({ tagToken: registered, vehicleId, eventType: "written", detail: { via: "qr" } });
      setToken(registered);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const download = async () => {
    if (!canvasRef.current) return;
    const dataUrl = canvasRef.current.toDataURL("image/png");
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = `motopulse-${vehicleName.toLowerCase().replace(/\s+/g, "-")}-qr.png`;
    a.click();
  };

  const printQr = async () => {
    if (!canvasRef.current) return;
    const dataUrl = canvasRef.current.toDataURL("image/png");
    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(`<!doctype html><html><head><title>${vehicleName} — QR</title>
      <style>body{display:flex;align-items:center;justify-content:center;height:100vh;margin:0;font-family:system-ui;background:#fff}
      .card{text-align:center}.card img{display:block;margin:0 auto}h2{font-weight:700;margin:12px 0 4px}p{color:#666;font-size:12px;margin:0}
      @media print{@page{margin:1cm}}</style></head>
      <body><div class="card"><img src="${dataUrl}" width="300" height="300"/>
      <h2>${vehicleName}</h2><p>MotoPulse · ${DISPLAY_HOST}/v/${token?.slice(0, 8)}…</p></div></body></html>`);
    win.document.close();
    setTimeout(() => win.print(), 400);
  };

  return (
    <Card>
      <div className="u-row u-row-between">
        <h3>QR code</h3>
        <span className="chip">Same URL as NFC</span>
      </div>

      {!token ? (
        <div className="u-col u-gap-3" style={{ padding: "var(--s-5) 0", textAlign: "center" }}>
          <p className="u-ink-muted u-text-sm">
            No tag or QR yet. Generate one — the same opaque token works for both NFC and QR scanning.
          </p>
          <Button variant="primary" onClick={() => void mintNewToken()} disabled={busy}>
            {busy ? "Minting…" : "Generate QR for this vehicle"}
          </Button>
        </div>
      ) : (
        <div className="u-row u-gap-5 u-row-wrap">
          <div className="donate-qr">
            <canvas ref={canvasRef}/>
          </div>
          <div className="u-col u-gap-3 u-grow">
            <div>
              <div className="u-ink-muted u-text-xs" style={{ letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 4 }}>
                Scan with any camera
              </div>
              <div className="u-text-sm" style={{ fontFamily: "ui-monospace, monospace", wordBreak: "break-all" }}>
                {DISPLAY_HOST}/v/{token.slice(0, 12)}…
              </div>
              {resolvedFileUrl && vehicle?.make && (
                <p className="u-text-xs u-ink-muted" style={{ marginTop: 8 }}>
                  Centered: <strong>{vehicle.make}</strong> · from <code>/brand-logos/{brandSlug(vehicle.make)}.*</code>
                </p>
              )}
              {!resolvedFileUrl && brandMark && (
                <p className="u-text-xs u-ink-muted" style={{ marginTop: 8 }}>
                  Centered: initial mark for <strong>{brandMark.fullName}</strong>.{" "}
                  Drop a real logo at <code>public/brand-logos/{brandSlug(vehicle?.make)}.svg</code> to override.
                </p>
              )}
              {!resolvedFileUrl && !brandMark && vehicle?.make && (
                <p className="u-text-xs u-ink-muted" style={{ marginTop: 8 }}>
                  No bundled mark for "{vehicle.make}". Add a logo at <code>public/brand-logos/{brandSlug(vehicle.make)}.svg</code>.
                </p>
              )}
            </div>
            <p className="u-text-sm u-ink-muted">
              Print as a sticker and put it on your fuel cap. A phone camera opens MotoPulse to the quick-log sheet.
            </p>
            <div className="u-row u-gap-2 u-row-wrap">
              <Button variant="ghost" size="sm" onClick={() => void download()}>
                <Icon name="download" size="sm"/> PNG
              </Button>
              <Button variant="ghost" size="sm" onClick={() => void printQr()}>
                <Icon name="download" size="sm"/> Print
              </Button>
            </div>
          </div>
        </div>
      )}
      {error && <p role="alert" className="u-text-sm" style={{ color: "var(--status-crit)" }}>{error}</p>}
    </Card>
  );
}
