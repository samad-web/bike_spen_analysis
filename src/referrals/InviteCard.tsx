import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import { supabase } from "@/lib/supabase";
import { Button, Card, Icon } from "@/app/ui";
import { useProfile } from "@/profile/useProfile";

import { PUBLIC_URL } from "@/lib/publicUrl";
const BASE = PUBLIC_URL;

/** Invite card — share a referral link, see your referrals so far. Lives in
 * Settings so it's one tap from anywhere in the app. */
export function InviteCard() {
  const { profile } = useProfile();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [copied, setCopied] = useState(false);
  const [referralCount, setReferralCount] = useState<number | null>(null);

  const code = profile?.referral_code;
  const inviteUrl = code ? `${BASE}/i/${code}` : "";

  useEffect(() => {
    if (!inviteUrl || !canvasRef.current) return;
    void QRCode.toCanvas(canvasRef.current, inviteUrl, {
      width: 180, margin: 2,
      color: { dark: "#16161a", light: "#ffffff" },
      errorCorrectionLevel: "M",
    });
  }, [inviteUrl]);

  useEffect(() => {
    if (!profile?.referral_code) return;
    void supabase.from("user_profiles").select("user_id", { count: "exact", head: true })
      .eq("referred_by_code", profile.referral_code).then((r) => {
        setReferralCount(r.count ?? 0);
      });
  }, [profile?.referral_code]);

  if (!profile) return null;

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch { /* best effort */ }
  };

  const nativeShare = async () => {
    if (typeof navigator.share !== "function") { void copyLink(); return; }
    try {
      await navigator.share({
        title: "Try MotoPulse",
        text: "Tap your bike's NFC tag at the pump — MotoPulse logs the fuel. Join me:",
        url: inviteUrl,
      });
    } catch { /* user cancelled */ }
  };

  const shareUrls = {
    whatsapp: `https://wa.me/?text=${encodeURIComponent("Try MotoPulse — logs your fuel at the tap of a tag. " + inviteUrl)}`,
    telegram: `https://t.me/share/url?url=${encodeURIComponent(inviteUrl)}&text=${encodeURIComponent("Try MotoPulse — tap, log, done.")}`,
    twitter:  `https://twitter.com/intent/tweet?text=${encodeURIComponent("Tap your bike's NFC tag at the pump — @MotoPulse logs the fuel. Try it: " + inviteUrl)}`,
    email:    `mailto:?subject=${encodeURIComponent("Try MotoPulse")}&body=${encodeURIComponent("I've been using MotoPulse to log fuel + maintenance in one tap. Thought you'd like it: " + inviteUrl)}`,
  };

  return (
    <Card>
      <div className="u-row u-row-between">
        <h3>Invite a friend</h3>
        {referralCount != null && referralCount > 0 && (
          <span className="chip chip--accent">{referralCount} joined</span>
        )}
      </div>
      <p className="u-text-sm u-ink-muted">
        Riders who join from your link show up here. We're saving a bigger thank-you for later.
      </p>

      <div className="u-row u-gap-5 u-row-wrap" style={{ marginTop: "var(--s-3)" }}>
        <div className="donate-qr donate-qr--small">
          <canvas ref={canvasRef}/>
        </div>
        <div className="u-col u-gap-3 u-grow" style={{ minWidth: 240 }}>
          <div>
            <div className="u-ink-muted u-text-xs" style={{ letterSpacing: "0.08em", textTransform: "uppercase" }}>Your invite link</div>
            <div className="u-text-sm" style={{ fontFamily: "ui-monospace, monospace", wordBreak: "break-all", marginTop: 4 }}>
              {inviteUrl || "…"}
            </div>
          </div>
          <div className="u-row u-gap-2 u-row-wrap">
            <Button variant="primary" onClick={() => void nativeShare()}>
              <Icon name="arrow_right" size="sm"/> Share
            </Button>
            <Button variant="ghost" onClick={() => void copyLink()}>
              {copied ? "Copied" : "Copy link"}
            </Button>
          </div>
          <div className="u-row u-gap-2 u-row-wrap">
            <a className="pill-btn" href={shareUrls.whatsapp} target="_blank" rel="noopener">WhatsApp</a>
            <a className="pill-btn" href={shareUrls.telegram} target="_blank" rel="noopener">Telegram</a>
            <a className="pill-btn" href={shareUrls.twitter}  target="_blank" rel="noopener">X / Twitter</a>
            <a className="pill-btn" href={shareUrls.email}>Email</a>
          </div>
        </div>
      </div>
    </Card>
  );
}
