import { useEffect, useRef, useState } from "react";
import jsQR from "jsqr";
import { Button, Icon, Sheet } from "@/app/ui";

import { TOKEN_URL_PREFIX } from "@/lib/publicUrl";
const BASE_URL = TOKEN_URL_PREFIX;

interface Props {
  onClose: () => void;
  onToken: (token: string) => void;
}

/**
 * In-app QR scanner using getUserMedia + jsQR. Used from the "Tag info"
 * screen as an alternative to the NFC chip scanner — handy for verifying
 * what a printed sticker encodes, or on devices without NFC. The common
 * tap-at-pump path uses the phone's native camera, not this scanner.
 */
export function QrScannerSheet({ onClose, onToken }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState("Point the camera at a MotoPulse QR");
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    let cancelled = false;

    const start = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
          tick();
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not access camera");
      }
    };

    const tick = () => {
      if (cancelled) return;
      const v = videoRef.current;
      const c = canvasRef.current;
      if (!v || !c || v.readyState !== v.HAVE_ENOUGH_DATA) {
        rafRef.current = requestAnimationFrame(tick);
        return;
      }
      const w = v.videoWidth;
      const h = v.videoHeight;
      c.width = w;
      c.height = h;
      const ctx = c.getContext("2d", { willReadFrequently: true });
      if (!ctx) return;
      ctx.drawImage(v, 0, 0, w, h);
      const img = ctx.getImageData(0, 0, w, h);
      const code = jsQR(img.data, w, h, { inversionAttempts: "dontInvert" });
      if (code && code.data) {
        const token = extractToken(code.data);
        if (token) {
          setStatus(`Found tag · ${token.slice(0, 8)}…`);
          cancelled = true;
          cleanup();
          onToken(token);
          onClose();
          return;
        }
        setStatus("That QR isn't a MotoPulse code");
      }
      rafRef.current = requestAnimationFrame(tick);
    };

    const cleanup = () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };

    void start();
    return () => {
      cancelled = true;
      cleanup();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Sheet onClose={onClose} title="Scan a QR" subtitle={status}>
      <div style={{ borderRadius: "var(--r-outer)", overflow: "hidden", background: "#000", aspectRatio: "4/3", position: "relative" }}>
        <video ref={videoRef} playsInline muted
          style={{ width: "100%", height: "100%", objectFit: "cover" }}/>
        <canvas ref={canvasRef} style={{ display: "none" }}/>
        <div style={{
          position: "absolute", inset: "20%",
          border: "2px solid rgba(245, 184, 0, 0.9)",
          borderRadius: 16,
          pointerEvents: "none",
        }}/>
      </div>
      {error && <p role="alert" className="u-text-sm">{error}</p>}
      <div className="sheet__actions">
        <Button variant="ghost" onClick={onClose}><Icon name="close" size="sm"/>Close</Button>
      </div>
    </Sheet>
  );
}

export function extractToken(url: string): string | null {
  if (!url.startsWith(BASE_URL)) return null;
  const rest = url.slice(BASE_URL.length).split(/[/?#]/)[0];
  return /^[A-Za-z0-9_-]{8,64}$/.test(rest) ? rest : null;
}
