import { useMemo, useState } from "react";
import { useExpenses, getLastAmount, type Expense } from "./useExpenses";
import { useVehicles } from "@/vehicles/useVehicles";
import { Icon } from "@/app/ui";
import type { PaymentMethod } from "@/lib/offline-queue";
import { fuelActionLabel, quantityFieldLabel, unitForVehicle } from "./fuelUnit";

const MAINTENANCE_PRESETS = [
  { label: "Oil change", icon: "🛢️" },
  { label: "Chain lube", icon: "⛓️" },
  { label: "General service", icon: "⚙️" },
  { label: "Brake pads", icon: "🛑" },
  { label: "Tyre replacement", icon: "🏍️" },
  { label: "Battery", icon: "🔋" },
  { label: "Wash & polish", icon: "✨" },
  { label: "Other repairs", icon: "🔧" },
];

const PAYMENT_METHODS: { key: PaymentMethod; label: string }[] = [
  { key: "cash", label: "Cash" },
  { key: "upi", label: "UPI" },
  { key: "card", label: "Card" },
  { key: "wallet", label: "Wallet" },
  { key: "net_banking", label: "Net banking" },
];

interface Props {
  vehicleId: string;
  vehicleName: string;
  initialExpense?: Expense;
  onDone?: () => void;
}

const LAST_PM_KEY = "motopulse:lastPaymentMethod";

export function QuickLogForm({ vehicleId, vehicleName, initialExpense, onDone }: Props) {
  const { saveExpense, deleteExpense } = useExpenses(vehicleId);
  const { vehicles } = useVehicles();
  const vehicle = vehicles.find((v) => v.id === vehicleId);
  const fuelUnit = unitForVehicle(vehicle?.fuel_type ?? null);
  const isEditing = Boolean(initialExpense);

  const [category, setCategory] = useState<"fuel" | "maintenance">(initialExpense?.category ?? "fuel");
  const [amount, setAmount] = useState(() =>
    initialExpense ? initialExpense.total_amount.toString() : (getLastAmount(vehicleId, "fuel")?.toString() ?? "")
  );
  const [litres, setLitres] = useState(() =>
    initialExpense?.litres != null ? initialExpense.litres.toString() : ""
  );
  const [odometer, setOdometer] = useState(() =>
    initialExpense?.odometer_reading != null ? initialExpense.odometer_reading.toString() : ""
  );
  const [expenseDate, setExpenseDate] = useState(() =>
    initialExpense?.expense_date ?? new Date().toISOString().slice(0, 10)
  );
  const [itemLabel, setItemLabel] = useState(() => {
    return (initialExpense?.category === "maintenance" ? initialExpense.notes : null) ?? "";
  });
  const [notes, setNotes] = useState(initialExpense?.notes ?? "");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(() => {
    try {
      return (localStorage.getItem(LAST_PM_KEY) as PaymentMethod) ?? "upi";
    } catch {
      return "upi";
    }
  });
  const [saving, setSaving] = useState(false);
  const [undoState, setUndoState] = useState<{ id: string } | null>(null);

  // Seamless in-screen mode switcher (does not navigate or open another tab)
  const switchCategory = (next: "fuel" | "maintenance") => {
    setCategory(next);
    if (!isEditing) {
      setAmount(getLastAmount(vehicleId, next)?.toString() ?? "");
      if (next === "maintenance" && !itemLabel) {
        setItemLabel("Oil change");
      }
    }
  };

  const choosePayment = (m: PaymentMethod) => {
    setPaymentMethod(m);
    try {
      localStorage.setItem(LAST_PM_KEY, m);
    } catch {
      /* non-fatal */
    }
  };

  const pricePerLitre = useMemo(() => {
    const a = Number(amount);
    const l = Number(litres);
    if (a > 0 && l > 0) return (a / l).toFixed(2);
    return null;
  }, [amount, litres]);

  const handleSave = async () => {
    const total = Number(amount);
    if (!total || total < 0) return;

    setSaving(true);
    const id = initialExpense?.id ?? crypto.randomUUID();
    await saveExpense({
      p_id: id,
      p_vehicle_id: vehicleId,
      p_category: category,
      p_total_amount: total,
      p_litres: category === "fuel" && litres ? Number(litres) : null,
      p_odometer_reading: odometer ? Number(odometer) : null,
      p_expense_date: expenseDate,
      p_notes: notes.trim() || null,
      p_items: category === "maintenance" && itemLabel ? [{ label: itemLabel, amount: total }] : null,
      p_payment_method: paymentMethod,
      p_fuel_unit: fuelUnit,
    });
    setSaving(false);
    if (!isEditing) {
      setUndoState({ id });
      setTimeout(() => setUndoState((cur) => (cur?.id === id ? null : cur)), 6000);
    }
    onDone?.();
  };

  const handleUndo = async () => {
    if (!undoState) return;
    await deleteExpense(undoState.id);
    setUndoState(null);
  };

  return (
    <div
      className="u-col u-gap-4"
      role="form"
      aria-label={`Log expense for ${vehicleName}`}
      style={{ paddingBottom: 16 }}
    >
      {/* Dynamic Header on the same screen */}
      <div>
        <h3 className="sheet__title" style={{ fontSize: "1.3rem", margin: "0 0 4px" }}>
          {isEditing
            ? `Edit entry for ${vehicleName}`
            : category === "fuel"
            ? `Log Fuel for ${vehicleName}`
            : `Log Maintenance for ${vehicleName}`}
        </h3>
        <p className="sheet__subtitle" style={{ margin: 0, color: "var(--ink-muted, #a0a097)" }}>
          {isEditing
            ? "Update details and save changes."
            : category === "fuel"
            ? "Record fill-up at the pump"
            : "Record service, oil change, or repairs"}
        </p>
      </div>

      {/* Modern Unified Segmented Switch (Fuel vs Maintenance) */}
      <div
        style={{
          display: "flex",
          background: "rgba(255, 255, 255, 0.06)",
          borderRadius: 999,
          padding: 4,
          gap: 4,
          border: "1px solid rgba(255, 255, 255, 0.1)",
        }}
      >
        <button
          type="button"
          onClick={() => switchCategory("fuel")}
          style={{
            flex: 1,
            height: 42,
            borderRadius: 999,
            border: 0,
            background: category === "fuel" ? "var(--accent-500, #f5b800)" : "transparent",
            color: category === "fuel" ? "#000000" : "var(--ink-muted, #a0a097)",
            fontWeight: category === "fuel" ? 700 : 500,
            fontSize: "0.95rem",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            transition: "all 0.18s ease",
            boxShadow: category === "fuel" ? "0 4px 14px rgba(245, 184, 0, 0.35)" : "none",
          }}
        >
          <Icon name="fuel" size="sm" />
          <span>{fuelActionLabel(fuelUnit)}</span>
        </button>

        <button
          type="button"
          onClick={() => switchCategory("maintenance")}
          style={{
            flex: 1,
            height: 42,
            borderRadius: 999,
            border: 0,
            background: category === "maintenance" ? "var(--accent-500, #f5b800)" : "transparent",
            color: category === "maintenance" ? "#000000" : "var(--ink-muted, #a0a097)",
            fontWeight: category === "maintenance" ? 700 : 500,
            fontSize: "0.95rem",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            transition: "all 0.18s ease",
            boxShadow: category === "maintenance" ? "0 4px 14px rgba(245, 184, 0, 0.35)" : "none",
          }}
        >
          <Icon name="wrench" size="sm" />
          <span>Maintenance</span>
        </button>
      </div>

      {/* MAINTENANCE MODE: Quick Preset Chips */}
      {category === "maintenance" && (
        <div className="u-col u-gap-2">
          <label style={{ fontSize: "0.85rem", color: "var(--ink-muted, #a0a097)", fontWeight: 600 }}>
            Select maintenance type
          </label>
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 8,
            }}
          >
            {MAINTENANCE_PRESETS.map((p) => {
              const selected = itemLabel.toLowerCase() === p.label.toLowerCase();
              return (
                <button
                  key={p.label}
                  type="button"
                  onClick={() => setItemLabel(p.label)}
                  style={{
                    background: selected ? "rgba(245, 184, 0, 0.2)" : "rgba(255, 255, 255, 0.05)",
                    border: selected ? "1.5px solid var(--accent-500, #f5b800)" : "1px solid rgba(255, 255, 255, 0.1)",
                    color: selected ? "var(--accent-500, #f5b800)" : "#f0efe9",
                    fontWeight: selected ? 700 : 500,
                    padding: "6px 14px",
                    borderRadius: 999,
                    fontSize: "0.85rem",
                    cursor: "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    transition: "all 0.15s ease",
                  }}
                >
                  <span>{p.icon}</span>
                  <span>{p.label}</span>
                </button>
              );
            })}
          </div>

          <div style={{ marginTop: 6 }}>
            <input
              id="item"
              type="text"
              value={itemLabel}
              onChange={(e) => setItemLabel(e.target.value)}
              placeholder="Custom service name or parts description"
              style={{
                width: "100%",
                background: "rgba(255, 255, 255, 0.04)",
                border: "1px solid rgba(255, 255, 255, 0.12)",
                borderRadius: "var(--r-inner, 14px)",
                padding: "10px 14px",
                color: "#ffffff",
                fontSize: "0.95rem",
              }}
            />
          </div>
        </div>
      )}

      {/* Amount Input */}
      <div>
        <label htmlFor="amount" style={{ fontSize: "0.85rem", color: "var(--ink-muted, #a0a097)", fontWeight: 600 }}>
          {category === "fuel" ? "Fuel Amount (₹)" : "Service / Repair Cost (₹)"}
        </label>
        <div style={{ position: "relative", marginTop: 4 }}>
          <span
            style={{
              position: "absolute",
              left: 16,
              top: "50%",
              transform: "translateY(-50%)",
              fontSize: "1.3rem",
              fontWeight: 700,
              color: "var(--accent-500, #f5b800)",
            }}
          >
            ₹
          </span>
          <input
            id="amount"
            inputMode="decimal"
            type="number"
            min={0}
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0"
            autoFocus
            style={{
              width: "100%",
              height: 52,
              paddingLeft: 38,
              paddingRight: 14,
              fontSize: "1.4rem",
              fontWeight: 700,
              background: "rgba(255, 255, 255, 0.05)",
              border: "1.5px solid var(--accent-500, #f5b800)",
              borderRadius: "var(--r-inner, 14px)",
              color: "#ffffff",
              boxShadow: "0 0 0 2px rgba(245, 184, 0, 0.15)",
            }}
          />
        </div>
      </div>

      {/* FUEL MODE: Litres + Live Calculation */}
      {category === "fuel" && (
        <div>
          <div className="u-row u-row-between" style={{ alignItems: "center", marginBottom: 4 }}>
            <label htmlFor="qty" style={{ fontSize: "0.85rem", color: "var(--ink-muted, #a0a097)", fontWeight: 600 }}>
              {quantityFieldLabel(fuelUnit)}
            </label>
            {pricePerLitre && (
              <span
                style={{
                  fontSize: "0.8rem",
                  color: "var(--accent-500, #f5b800)",
                  fontWeight: 700,
                  background: "rgba(245, 184, 0, 0.15)",
                  padding: "2px 8px",
                  borderRadius: 6,
                }}
              >
                ₹{pricePerLitre} / {fuelUnit}
              </span>
            )}
          </div>
          <input
            id="qty"
            inputMode="decimal"
            type="number"
            min={0}
            step="0.01"
            value={litres}
            onChange={(e) => setLitres(e.target.value)}
            placeholder="Litres filled"
            style={{
              width: "100%",
              height: 44,
              padding: "0 14px",
              background: "rgba(255, 255, 255, 0.04)",
              border: "1px solid rgba(255, 255, 255, 0.12)",
              borderRadius: "var(--r-inner, 14px)",
              color: "#ffffff",
              fontSize: "1rem",
            }}
          />
        </div>
      )}

      {/* Payment Method Pills */}
      <div>
        <label style={{ fontSize: "0.85rem", color: "var(--ink-muted, #a0a097)", fontWeight: 600, display: "block", marginBottom: 6 }}>
          Payment method
        </label>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {PAYMENT_METHODS.map((m) => {
            const active = paymentMethod === m.key;
            return (
              <button
                key={m.key}
                type="button"
                onClick={() => choosePayment(m.key)}
                style={{
                  background: active ? "var(--accent-500, #f5b800)" : "rgba(255, 255, 255, 0.05)",
                  color: active ? "#000000" : "#f0efe9",
                  fontWeight: active ? 700 : 500,
                  border: active ? "1px solid var(--accent-500, #f5b800)" : "1px solid rgba(255, 255, 255, 0.12)",
                  borderRadius: 999,
                  padding: "8px 16px",
                  fontSize: "0.9rem",
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                  boxShadow: active ? "0 4px 12px rgba(245, 184, 0, 0.3)" : "none",
                }}
              >
                {m.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Odometer Reading */}
      <div>
        <label htmlFor="odometer" style={{ fontSize: "0.85rem", color: "var(--ink-muted, #a0a097)", fontWeight: 600 }}>
          Odometer (km, optional)
        </label>
        <input
          id="odometer"
          inputMode="decimal"
          type="number"
          min={0}
          value={odometer}
          onChange={(e) => setOdometer(e.target.value)}
          placeholder="e.g. 12450"
          style={{
            width: "100%",
            height: 44,
            padding: "0 14px",
            marginTop: 4,
            background: "rgba(255, 255, 255, 0.04)",
            border: "1px solid rgba(255, 255, 255, 0.12)",
            borderRadius: "var(--r-inner, 14px)",
            color: "#ffffff",
            fontSize: "1rem",
          }}
        />
      </div>

      {/* Date & Notes (Expandable or standard) */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <div>
          <label htmlFor="exp-date" style={{ fontSize: "0.85rem", color: "var(--ink-muted, #a0a097)", fontWeight: 600 }}>
            Date
          </label>
          <input
            id="exp-date"
            type="date"
            value={expenseDate}
            onChange={(e) => setExpenseDate(e.target.value)}
            style={{
              width: "100%",
              height: 44,
              padding: "0 12px",
              marginTop: 4,
              background: "rgba(255, 255, 255, 0.04)",
              border: "1px solid rgba(255, 255, 255, 0.12)",
              borderRadius: "var(--r-inner, 14px)",
              color: "#ffffff",
              fontSize: "0.9rem",
            }}
          />
        </div>

        <div>
          <label htmlFor="notes" style={{ fontSize: "0.85rem", color: "var(--ink-muted, #a0a097)", fontWeight: 600 }}>
            Notes (optional)
          </label>
          <input
            id="notes"
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder={category === "fuel" ? "Petrol bunk name" : "Mechanic / shop"}
            style={{
              width: "100%",
              height: 44,
              padding: "0 12px",
              marginTop: 4,
              background: "rgba(255, 255, 255, 0.04)",
              border: "1px solid rgba(255, 255, 255, 0.12)",
              borderRadius: "var(--r-inner, 14px)",
              color: "#ffffff",
              fontSize: "0.9rem",
            }}
          />
        </div>
      </div>

      {/* Primary Save Button in Application Brand Colors */}
      <button
        type="button"
        onClick={handleSave}
        disabled={saving || !amount}
        style={{
          width: "100%",
          height: 50,
          borderRadius: "var(--r-inner, 14px)",
          border: 0,
          background: saving || !amount ? "rgba(245, 184, 0, 0.3)" : "var(--accent-500, #f5b800)",
          color: saving || !amount ? "rgba(0, 0, 0, 0.5)" : "#000000",
          fontWeight: 700,
          fontSize: "1.05rem",
          cursor: saving || !amount ? "not-allowed" : "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 10,
          marginTop: 8,
          boxShadow: saving || !amount ? "none" : "0 8px 24px rgba(245, 184, 0, 0.35)",
          transition: "all 0.15s ease",
        }}
      >
        <span>
          {saving
            ? "Saving…"
            : isEditing
            ? "Save changes"
            : category === "fuel"
            ? "Save Fuel Entry"
            : "Save Maintenance Entry"}
        </span>
        <Icon name="check" size="sm" />
      </button>

      {undoState && (
        <p className="u-text-sm u-ink-muted" role="status" style={{ textAlign: "center", margin: "4px 0 0" }}>
          Saved.{" "}
          <button
            type="button"
            onClick={handleUndo}
            style={{
              background: "transparent",
              color: "var(--accent-500, #f5b800)",
              padding: 0,
              minHeight: 0,
              border: 0,
              fontWeight: 700,
              cursor: "pointer",
              textDecoration: "underline",
            }}
          >
            Undo
          </button>
        </p>
      )}
    </div>
  );
}
