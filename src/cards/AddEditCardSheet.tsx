import { useState } from "react";
import { Sheet, Icon } from "@/app/ui";
import {
  type PaymentCard,
  type CardNetwork,
  type CardColor,
  type FuelBrand,
  CARD_PRESETS,
  type CardPreset,
} from "./cardReturns";
import { CardVisual } from "./CardVisual";
import type { CardInput } from "./useCards";

interface Props {
  initialCard?: PaymentCard | null;
  onSave: (card: CardInput) => Promise<{ error?: string }>;
  onClose: () => void;
}

export function AddEditCardSheet({ initialCard, onSave, onClose }: Props) {
  const isEditing = Boolean(initialCard);

  const [cardName, setCardName] = useState(initialCard?.card_name ?? "BPCL SBI Card Octane");
  const [lastFour, setLastFour] = useState(initialCard?.last_four ?? "");
  const [bankName, setBankName] = useState(initialCard?.bank_name ?? "SBI");
  const [network, setNetwork] = useState<CardNetwork>(initialCard?.network ?? "rupay");
  const [cardColor, setCardColor] = useState<CardColor>(initialCard?.card_color ?? "amber");
  const [fuelCashback, setFuelCashback] = useState(
    initialCard ? String(initialCard.fuel_cashback_percent) : "6.25"
  );
  const [surchargeWaiver, setSurchargeWaiver] = useState(
    initialCard ? String(initialCard.surcharge_waiver_percent) : "1.0"
  );
  const [minWaiver, setMinWaiver] = useState(
    initialCard ? String(initialCard.surcharge_min_amount) : "400"
  );
  const [maxWaiver, setMaxWaiver] = useState(
    initialCard ? String(initialCard.surcharge_max_amount) : "4000"
  );
  const [partnerBrand, setPartnerBrand] = useState<FuelBrand>(
    initialCard?.partner_fuel_brand ?? "bpcl"
  );
  const [otherCashback, setOtherCashback] = useState(
    initialCard ? String(initialCard.other_cashback_percent) : "1.0"
  );
  const [isDefault, setIsDefault] = useState(initialCard?.is_default ?? true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const applyPreset = (preset: CardPreset) => {
    setCardName(preset.card_name);
    setBankName(preset.bank_name);
    setNetwork(preset.network);
    setCardColor(preset.card_color);
    setFuelCashback(String(preset.fuel_cashback_percent));
    setSurchargeWaiver(String(preset.surcharge_waiver_percent));
    setMinWaiver(String(preset.surcharge_min_amount));
    setMaxWaiver(String(preset.surcharge_max_amount));
    setPartnerBrand(preset.partner_fuel_brand);
    setOtherCashback(String(preset.other_cashback_percent));
  };

  const previewCard: PaymentCard = {
    id: initialCard?.id ?? "preview",
    card_name: cardName || "Card Nickname",
    last_four: lastFour || "0000",
    bank_name: bankName || "Bank",
    network,
    card_color: cardColor,
    fuel_cashback_percent: Number(fuelCashback) || 0,
    surcharge_waiver_percent: Number(surchargeWaiver) || 0,
    surcharge_min_amount: Number(minWaiver) || 400,
    surcharge_max_amount: Number(maxWaiver) || 4000,
    partner_fuel_brand: partnerBrand,
    other_cashback_percent: Number(otherCashback) || 0,
    is_default: isDefault,
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanLastFour = lastFour.trim();
    if (!/^\d{4}$/.test(cleanLastFour)) {
      setError("Please enter exactly 4 digits for the card ending");
      return;
    }
    if (!cardName.trim()) {
      setError("Please provide a name or nickname for this card");
      return;
    }

    setSaving(true);
    setError(null);

    const payload: CardInput = {
      card_name: cardName.trim(),
      last_four: cleanLastFour,
      bank_name: bankName.trim() || "Other",
      network,
      card_color: cardColor,
      fuel_cashback_percent: Math.max(0, Number(fuelCashback) || 0),
      surcharge_waiver_percent: Math.max(0, Number(surchargeWaiver) || 0),
      surcharge_min_amount: Math.max(0, Number(minWaiver) || 400),
      surcharge_max_amount: Math.max(Number(minWaiver) || 400, Number(maxWaiver) || 4000),
      partner_fuel_brand: partnerBrand,
      other_cashback_percent: Math.max(0, Number(otherCashback) || 0),
      is_default: isDefault,
    };

    const res = await onSave(payload);
    setSaving(false);

    if (res.error) {
      setError(res.error);
    } else {
      onClose();
    }
  };

  return (
    <Sheet
      onClose={onClose}
      title={isEditing ? "Edit Payment Card" : "Add Payment Card"}
      subtitle="Track fuel surcharge waivers and cashback rewards."
    >
      <form onSubmit={handleSubmit} className="u-col u-gap-4" style={{ marginTop: 8 }}>
        {/* Live Card Preview */}
        <div>
          <CardVisual card={previewCard} />
        </div>

        {/* Security Banner */}
        <div
          style={{
            background: "rgba(16, 185, 129, 0.1)",
            border: "1px solid rgba(16, 185, 129, 0.25)",
            borderRadius: 12,
            padding: "10px 14px",
            fontSize: "0.8rem",
            color: "#34d399",
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <Icon name="check" size="sm" />
          <span>
            <strong>Secure & Private:</strong> Only card nickname and last 4 digits are saved. CVV and expiry are never requested.
          </span>
        </div>

        {/* Popular Presets Selector (when adding or switching) */}
        <div>
          <label style={{ fontSize: "0.85rem", color: "var(--ink-muted, #a0a097)", fontWeight: 600, display: "block", marginBottom: 6 }}>
            Popular Card Presets
          </label>
          <div
            style={{
              display: "flex",
              overflowX: "auto",
              gap: 8,
              paddingBottom: 4,
            }}
          >
            {CARD_PRESETS.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => applyPreset(p)}
                style={{
                  flexShrink: 0,
                  background: cardName === p.card_name ? "rgba(245, 184, 0, 0.2)" : "rgba(255, 255, 255, 0.05)",
                  border: cardName === p.card_name ? "1.5px solid var(--accent-500, #f5b800)" : "1px solid rgba(255, 255, 255, 0.1)",
                  color: cardName === p.card_name ? "var(--accent-500, #f5b800)" : "#ffffff",
                  borderRadius: 999,
                  padding: "6px 14px",
                  fontSize: "0.8rem",
                  fontWeight: cardName === p.card_name ? 700 : 500,
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                }}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Card Nickname and Last 4 Digits */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 120px", gap: 12 }}>
          <div>
            <label htmlFor="card-name" style={{ fontSize: "0.85rem", color: "var(--ink-muted, #a0a097)", fontWeight: 600 }}>
              Card Nickname *
            </label>
            <input
              id="card-name"
              type="text"
              value={cardName}
              onChange={(e) => setCardName(e.target.value)}
              placeholder="e.g. BPCL SBI Octane"
              required
              style={{
                width: "100%",
                height: 44,
                padding: "0 14px",
                marginTop: 4,
                background: "rgba(255, 255, 255, 0.05)",
                border: "1px solid rgba(255, 255, 255, 0.12)",
                borderRadius: "var(--r-inner, 14px)",
                color: "#ffffff",
                fontSize: "0.95rem",
              }}
            />
          </div>

          <div>
            <label htmlFor="card-last4" style={{ fontSize: "0.85rem", color: "var(--ink-muted, #a0a097)", fontWeight: 600 }}>
              Last 4 Digits *
            </label>
            <input
              id="card-last4"
              inputMode="numeric"
              pattern="[0-9]{4}"
              maxLength={4}
              value={lastFour}
              onChange={(e) => setLastFour(e.target.value.replace(/\D/g, "").slice(0, 4))}
              placeholder="4589"
              required
              style={{
                width: "100%",
                height: 44,
                padding: "0 14px",
                marginTop: 4,
                background: "rgba(255, 255, 255, 0.05)",
                border: "1.5px solid var(--accent-500, #f5b800)",
                borderRadius: "var(--r-inner, 14px)",
                color: "#ffffff",
                fontSize: "1.1rem",
                fontWeight: 700,
                textAlign: "center",
                letterSpacing: 2,
              }}
            />
          </div>
        </div>

        {/* Bank & Network */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div>
            <label htmlFor="bank-name" style={{ fontSize: "0.85rem", color: "var(--ink-muted, #a0a097)", fontWeight: 600 }}>
              Bank / Issuer
            </label>
            <input
              id="bank-name"
              type="text"
              value={bankName}
              onChange={(e) => setBankName(e.target.value)}
              placeholder="SBI, HDFC, ICICI, etc."
              style={{
                width: "100%",
                height: 44,
                padding: "0 14px",
                marginTop: 4,
                background: "rgba(255, 255, 255, 0.05)",
                border: "1px solid rgba(255, 255, 255, 0.12)",
                borderRadius: "var(--r-inner, 14px)",
                color: "#ffffff",
                fontSize: "0.95rem",
              }}
            />
          </div>

          <div>
            <label htmlFor="network" style={{ fontSize: "0.85rem", color: "var(--ink-muted, #a0a097)", fontWeight: 600 }}>
              Network
            </label>
            <select
              id="network"
              value={network}
              onChange={(e) => setNetwork(e.target.value as CardNetwork)}
              style={{
                width: "100%",
                height: 44,
                padding: "0 12px",
                marginTop: 4,
                background: "rgba(255, 255, 255, 0.05)",
                border: "1px solid rgba(255, 255, 255, 0.12)",
                borderRadius: "var(--r-inner, 14px)",
                color: "#ffffff",
                fontSize: "0.95rem",
              }}
            >
              <option value="rupay">RuPay</option>
              <option value="visa">Visa</option>
              <option value="mastercard">Mastercard</option>
              <option value="amex">American Express</option>
              <option value="other">Other</option>
            </select>
          </div>
        </div>

        {/* Color Theme Selector */}
        <div>
          <label style={{ fontSize: "0.85rem", color: "var(--ink-muted, #a0a097)", fontWeight: 600, display: "block", marginBottom: 6 }}>
            Card Color Theme
          </label>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            {(["amber", "emerald", "indigo", "rose", "slate", "gold", "purple", "cyan"] as CardColor[]).map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setCardColor(c)}
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: "50%",
                  border: cardColor === c ? "2px solid #ffffff" : "1px solid rgba(255, 255, 255, 0.2)",
                  background:
                    c === "amber" ? "#f5b800" :
                    c === "emerald" ? "#10b981" :
                    c === "indigo" ? "#6366f1" :
                    c === "rose" ? "#f43f5e" :
                    c === "slate" ? "#64748b" :
                    c === "gold" ? "#eab308" :
                    c === "purple" ? "#a855f7" : "#06b6d4",
                  cursor: "pointer",
                  transform: cardColor === c ? "scale(1.15)" : "scale(1)",
                  transition: "all 0.15s ease",
                  boxShadow: cardColor === c ? "0 0 10px rgba(255,255,255,0.4)" : "none",
                }}
                aria-label={`Color ${c}`}
              />
            ))}
          </div>
        </div>

        {/* Returns & Cashback Configuration */}
        <div
          style={{
            background: "rgba(255, 255, 255, 0.03)",
            border: "1px solid rgba(255, 255, 255, 0.08)",
            borderRadius: 16,
            padding: 16,
          }}
          className="u-col u-gap-3"
        >
          <h4 style={{ margin: "0 0 4px", fontSize: "0.95rem", color: "var(--accent-500, #f5b800)" }}>
            Returns & Cashback Rates
          </h4>

          {/* Fuel Cashback % and Partner Brand */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label htmlFor="fuel-rate" style={{ fontSize: "0.8rem", color: "var(--ink-muted, #a0a097)", fontWeight: 600 }}>
                Fuel Cashback (%)
              </label>
              <input
                id="fuel-rate"
                inputMode="decimal"
                type="number"
                step="0.01"
                min={0}
                max={100}
                value={fuelCashback}
                onChange={(e) => setFuelCashback(e.target.value)}
                placeholder="6.25"
                style={{
                  width: "100%",
                  height: 40,
                  padding: "0 12px",
                  marginTop: 4,
                  background: "rgba(255, 255, 255, 0.05)",
                  border: "1px solid rgba(255, 255, 255, 0.12)",
                  borderRadius: 10,
                  color: "#ffffff",
                  fontSize: "0.9rem",
                }}
              />
            </div>

            <div>
              <label htmlFor="partner-brand" style={{ fontSize: "0.8rem", color: "var(--ink-muted, #a0a097)", fontWeight: 600 }}>
                Partner Fuel Brand
              </label>
              <select
                id="partner-brand"
                value={partnerBrand}
                onChange={(e) => setPartnerBrand(e.target.value as FuelBrand)}
                style={{
                  width: "100%",
                  height: 40,
                  padding: "0 10px",
                  marginTop: 4,
                  background: "rgba(255, 255, 255, 0.05)",
                  border: "1px solid rgba(255, 255, 255, 0.12)",
                  borderRadius: 10,
                  color: "#ffffff",
                  fontSize: "0.9rem",
                }}
              >
                <option value="all">All petrol bunks</option>
                <option value="bpcl">BPCL (Bharat Petroleum)</option>
                <option value="hpcl">HPCL (Hindustan Petroleum)</option>
                <option value="iocl">IOCL (IndianOil)</option>
                <option value="shell">Shell</option>
                <option value="none">None (No fuel cashback)</option>
              </select>
            </div>
          </div>

          {/* Surcharge Waiver % & Range */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
            <div>
              <label htmlFor="waiver-rate" style={{ fontSize: "0.75rem", color: "var(--ink-muted, #a0a097)", fontWeight: 600 }}>
                Surcharge Waiver %
              </label>
              <input
                id="waiver-rate"
                inputMode="decimal"
                type="number"
                step="0.1"
                min={0}
                max={10}
                value={surchargeWaiver}
                onChange={(e) => setSurchargeWaiver(e.target.value)}
                placeholder="1.0"
                style={{
                  width: "100%",
                  height: 40,
                  padding: "0 10px",
                  marginTop: 4,
                  background: "rgba(255, 255, 255, 0.05)",
                  border: "1px solid rgba(255, 255, 255, 0.12)",
                  borderRadius: 10,
                  color: "#ffffff",
                  fontSize: "0.9rem",
                }}
              />
            </div>

            <div>
              <label htmlFor="min-waiver" style={{ fontSize: "0.75rem", color: "var(--ink-muted, #a0a097)", fontWeight: 600 }}>
                Min Spend (₹)
              </label>
              <input
                id="min-waiver"
                inputMode="numeric"
                type="number"
                min={0}
                value={minWaiver}
                onChange={(e) => setMinWaiver(e.target.value)}
                placeholder="400"
                style={{
                  width: "100%",
                  height: 40,
                  padding: "0 10px",
                  marginTop: 4,
                  background: "rgba(255, 255, 255, 0.05)",
                  border: "1px solid rgba(255, 255, 255, 0.12)",
                  borderRadius: 10,
                  color: "#ffffff",
                  fontSize: "0.9rem",
                }}
              />
            </div>

            <div>
              <label htmlFor="max-waiver" style={{ fontSize: "0.75rem", color: "var(--ink-muted, #a0a097)", fontWeight: 600 }}>
                Max Spend (₹)
              </label>
              <input
                id="max-waiver"
                inputMode="numeric"
                type="number"
                min={0}
                value={maxWaiver}
                onChange={(e) => setMaxWaiver(e.target.value)}
                placeholder="4000"
                style={{
                  width: "100%",
                  height: 40,
                  padding: "0 10px",
                  marginTop: 4,
                  background: "rgba(255, 255, 255, 0.05)",
                  border: "1px solid rgba(255, 255, 255, 0.12)",
                  borderRadius: 10,
                  color: "#ffffff",
                  fontSize: "0.9rem",
                }}
              />
            </div>
          </div>

          {/* Other / Maintenance Cashback % */}
          <div>
            <label htmlFor="other-rate" style={{ fontSize: "0.8rem", color: "var(--ink-muted, #a0a097)", fontWeight: 600 }}>
              Maintenance / Spares Cashback (%)
            </label>
            <input
              id="other-rate"
              inputMode="decimal"
              type="number"
              step="0.1"
              min={0}
              max={100}
              value={otherCashback}
              onChange={(e) => setOtherCashback(e.target.value)}
              placeholder="1.0"
              style={{
                width: "100%",
                height: 40,
                padding: "0 12px",
                marginTop: 4,
                background: "rgba(255, 255, 255, 0.05)",
                border: "1px solid rgba(255, 255, 255, 0.12)",
                borderRadius: 10,
                color: "#ffffff",
                fontSize: "0.9rem",
              }}
            />
          </div>
        </div>

        {/* Set Default Toggle */}
        <label
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            cursor: "pointer",
            fontSize: "0.9rem",
            color: "#ffffff",
            padding: "4px 2px",
          }}
        >
          <input
            type="checkbox"
            checked={isDefault}
            onChange={(e) => setIsDefault(e.target.checked)}
            style={{ width: 18, height: 18, accentColor: "var(--accent-500, #f5b800)" }}
          />
          <span>Set as default payment card for logging expenses</span>
        </label>

        {error && (
          <p role="alert" style={{ color: "var(--status-crit, #f43f5e)", fontSize: "0.85rem", margin: 0 }}>
            {error}
          </p>
        )}

        {/* Action Button */}
        <button
          type="submit"
          disabled={saving}
          style={{
            width: "100%",
            height: 48,
            borderRadius: "var(--r-inner, 14px)",
            border: 0,
            background: "var(--accent-500, #f5b800)",
            color: "#000000",
            fontWeight: 700,
            fontSize: "1rem",
            cursor: saving ? "not-allowed" : "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            boxShadow: "0 6px 20px rgba(245, 184, 0, 0.35)",
            transition: "all 0.15s ease",
            marginTop: 4,
          }}
        >
          <Icon name="check" size="sm" />
          <span>{saving ? "Saving…" : isEditing ? "Save Changes" : "Add Card"}</span>
        </button>
      </form>
    </Sheet>
  );
}
