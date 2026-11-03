import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import { Button, Card, Icon } from "@/app/ui";
import { buildUpiUrl, useDonationConfig } from "./useDonationConfig";

/** Public donation page. Reads the UPI id from `app_settings.donation`
 *  (set by a superadmin). Renders a UPI QR + "Copy UPI id" + preset chips. */
export function DonateScreen() {
  const { config, loading } = useDonationConfig();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [amount, setAmount] = useState<number | undefined>(undefined);
  const [copied, setCopied] = useState(false);

  const upi = config?.upi_id?.trim() ?? "";
  const name = config?.display_name?.trim() || "MotoPulse";
  const note = config?.note?.trim() || "Support MotoPulse";
  const url = upi ? buildUpiUrl({ upi, name, note, amount }) : "";

  useEffect(() => {
    if (!url || !canvasRef.current) return;
    void QRCode.toCanvas(canvasRef.current, url, {
      width: 240,
      margin: 2,
      color: { dark: "#16161a", light: "#ffffff" },
      errorCorrectionLevel: "M",
    });
  }, [url]);

  if (loading) return <p className="u-ink-muted">Loading…</p>;

  if (!upi) return (
    <div className="u-col u-gap-5">
      <header className="page-head">
        <div>
          <h1>Support MotoPulse</h1>
          <p className="u-ink-muted u-text-sm">Not configured yet.</p>
        </div>
      </header>
      <Card>
        <p className="u-text-sm">The admin hasn't set up a donation UPI id yet. Please come back soon.</p>
      </Card>
    </div>
  );

  const copyUpi = async () => {
    try {
      await navigator.clipboard.writeText(upi);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch { /* best effort */ }
  };

  const openUpi = () => {
    // On Android, this intents into GPay/PhonePe/Paytm/BHIM etc.
    window.location.href = url;
  };

  return (
    <div className="u-col u-gap-5">
      <header className="page-head">
        <div>
          <h1>Support MotoPulse</h1>
          <p className="u-ink-muted u-text-sm">{note}</p>
        </div>
      </header>

      <Card>
        <div className="u-row u-row-wrap u-gap-5">
          <div className="donate-qr">
            <canvas ref={canvasRef}/>
          </div>
          <div className="u-col u-gap-4 u-grow">
            <div>
              <div className="u-ink-muted u-text-xs" style={{ letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 6 }}>Pay to</div>
              <div className="u-text-md u-weight-700">{name}</div>
              <div className="u-text-sm" style={{ fontFamily: "ui-monospace, monospace", marginTop: 4 }}>{upi}</div>
            </div>

            <div className="u-col u-gap-2">
              <label htmlFor="am-input">Amount (optional)</label>
              <div className="u-row u-gap-2 u-row-wrap">
                {[49, 99, 199, 499, 999].map((v) => (
                  <button key={v} type="button"
                    onClick={() => setAmount(v)}
                    className={"pill-btn " + (amount === v ? "is-active" : "")}>
                    ₹{v}
                  </button>
                ))}
                <button type="button" onClick={() => setAmount(undefined)}
                  className={"pill-btn " + (amount == null ? "is-active" : "")}>
                  Any
                </button>
              </div>
            </div>

            <div className="u-row u-gap-2 u-row-wrap">
              <Button variant="primary" onClick={openUpi}>
                <Icon name="arrow_right" size="sm"/> Open UPI app
              </Button>
              <Button variant="ghost" onClick={() => void copyUpi()}>
                <Icon name="check" size="sm"/> {copied ? "Copied" : "Copy UPI id"}
              </Button>
            </div>
          </div>
        </div>
      </Card>

      <Card>
        <h3>Why donate?</h3>
        <p className="u-text-sm u-ink-muted">
          MotoPulse is free. Your contribution helps us pay for Supabase, the domain,
          and the time to keep the app ad-free and growing.
        </p>
      </Card>
    </div>
  );
}
