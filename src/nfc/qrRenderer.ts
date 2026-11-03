import QRCode from "qrcode";

/**
 * Renders a QR code to a canvas with an optional center logo overlay.
 *
 * Uses error-correction level H (30% of the code can be damaged / covered
 * and the scanner still recovers the payload) so the logo in the middle
 * doesn't break scanability. The logo size is capped at 22% of the QR
 * width — well under the 30% EC limit.
 *
 * If the logo URL fails to load (CORS block, network, 404), we silently
 * fall back to a plain QR instead of leaving a half-rendered canvas.
 */
export interface RenderOpts {
  canvas: HTMLCanvasElement;
  payload: string;
  logoUrl?: string | null;
  size?: number;   // canvas edge in px
  dark?: string;
  light?: string;
}

export async function renderQrWithLogo({
  canvas,
  payload,
  logoUrl,
  size = 240,
  dark = "#16161a",
  light = "#ffffff",
}: RenderOpts): Promise<void> {
  await QRCode.toCanvas(canvas, payload, {
    width: size,
    margin: 2,
    color: { dark, light },
    errorCorrectionLevel: "H",
  });

  if (!logoUrl) return;

  try {
    const logo = await loadImage(logoUrl);
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const w = canvas.width;   // in device pixels after qrcode sized the canvas
    const h = canvas.height;
    const edge = Math.min(w, h);
    const logoSize = Math.round(edge * 0.22);
    const padding = Math.round(edge * 0.02);
    const boxSize = logoSize + padding * 2;
    const x = Math.round((w - boxSize) / 2);
    const y = Math.round((h - boxSize) / 2);

    // White rounded square behind the logo — gives the overlay a clean
    // boundary and ensures it reads against the QR's black modules.
    ctx.fillStyle = light;
    roundedRect(ctx, x, y, boxSize, boxSize, Math.round(8 * dpr));
    ctx.fill();

    ctx.drawImage(logo, x + padding, y + padding, logoSize, logoSize);
  } catch {
    // CORS, network or decode failure — the plain QR is already drawn,
    // so just leave it. Logging would be noise.
  }
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    // Data URLs don't need CORS (same-origin by definition); setting
    // crossOrigin on a `data:image/svg+xml;...` URL triggers a tainted-canvas
    // error in Chromium, which was preventing the logo overlay from drawing.
    if (!url.startsWith("data:")) img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("logo load failed"));
    img.src = url;
  });
}

function roundedRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}
