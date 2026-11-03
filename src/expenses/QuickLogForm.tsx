import { useState } from "react";
import { useExpenses, getLastAmount } from "./useExpenses";
import { useVehicles } from "@/vehicles/useVehicles";
import { Button, Icon } from "@/app/ui";
import type { PaymentMethod } from "@/lib/offline-queue";
import { fuelActionLabel, quantityFieldLabel, unitForVehicle } from "./fuelUnit";

const COMMON_MAINTENANCE_LABELS = ["Oil change", "Chain lube", "Tyre", "Brake pads", "Service", "Battery"];

const PAYMENT_METHODS: { key: PaymentMethod; label: string }[] = [
  { key: "cash",         label: "Cash" },
  { key: "upi",          label: "UPI" },
  { key: "card",         label: "Card" },
  { key: "wallet",       label: "Wallet" },
  { key: "net_banking",  label: "Net banking" },
];

interface Props {
  vehicleId: string;
  vehicleName: string;
  onDone?: () => void;
}

const LAST_PM_KEY = "motopulse:lastPaymentMethod";

export function QuickLogForm({ vehicleId, vehicleName, onDone }: Props) {
  const { saveExpense, deleteExpense } = useExpenses(vehicleId);
  const { vehicles } = useVehicles();
  const vehicle = vehicles.find((v) => v.id === vehicleId);
  const fuelUnit = unitForVehicle(vehicle?.fuel_type ?? null);
  const [category, setCategory] = useState<"fuel" | "maintenance">("fuel");
  const [amount, setAmount] = useState(() => getLastAmount(vehicleId, "fuel")?.toString() ?? "");
  const [litres, setLitres] = useState("");
  const [odometer, setOdometer] = useState("");
  const [itemLabel, setItemLabel] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(() => {
    try { return (localStorage.getItem(LAST_PM_KEY) as PaymentMethod) ?? "upi"; } catch { return "upi"; }
  });
  const [saving, setSaving] = useState(false);
  const [undoState, setUndoState] = useState<{ id: string } | null>(null);

  const switchCategory = (next: "fuel" | "maintenance") => {
    setCategory(next);
    setAmount(getLastAmount(vehicleId, next)?.toString() ?? "");
  };

  const choosePayment = (m: PaymentMethod) => {
    setPaymentMethod(m);
    try { localStorage.setItem(LAST_PM_KEY, m); } catch { /* non-fatal */ }
  };

  const handleSave = async () => {
    const total = Number(amount);
    if (!total || total < 0) return;

    setSaving(true);
    const id = crypto.randomUUID();
    await saveExpense({
      p_id: id,
      p_vehicle_id: vehicleId,
      p_category: category,
      p_total_amount: total,
      p_litres: category === "fuel" && litres ? Number(litres) : null,
      p_odometer_reading: odometer ? Number(odometer) : null,
      p_expense_date: new Date().toISOString().slice(0, 10),
      p_notes: null,
      p_items: category === "maintenance" && itemLabel ? [{ label: itemLabel, amount: total }] : null,
      p_payment_method: paymentMethod,
      p_fuel_unit: fuelUnit,
    });
    setSaving(false);
    setUndoState({ id });
    setTimeout(() => setUndoState((cur) => (cur?.id === id ? null : cur)), 6000);
    onDone?.();
  };

  const handleUndo = async () => {
    if (!undoState) return;
    await deleteExpense(undoState.id);
    setUndoState(null);
  };

  return (
    <div className="u-col u-gap-4" role="form" aria-label={`Log expense for ${vehicleName}`}>
      <div>
        <h3 className="sheet__title">Log for {vehicleName}</h3>
        <p className="sheet__subtitle">Takes two taps at the pump.</p>
      </div>

      <div className="u-row u-gap-2">
        <button type="button"
          className={"pill-btn u-grow " + (category === "fuel" ? "is-active" : "")}
          onClick={() => switchCategory("fuel")}
          style={{ justifyContent: "center" }}>
          <Icon name="fuel" size="sm"/> {fuelActionLabel(fuelUnit)}
        </button>
        <button type="button"
          className={"pill-btn u-grow " + (category === "maintenance" ? "is-active" : "")}
          onClick={() => switchCategory("maintenance")}
          style={{ justifyContent: "center" }}>
          <Icon name="wrench" size="sm"/> Maintenance
        </button>
      </div>

      <div>
        <label htmlFor="amount">Amount (₹)</label>
        <input id="amount" inputMode="decimal" type="number" min={0} step="0.01"
          value={amount} onChange={(e) => setAmount(e.target.value)} autoFocus
          className="amount-input"/>
      </div>

      {category === "fuel" && (
        <div>
          <label htmlFor="qty">{quantityFieldLabel(fuelUnit)}</label>
          <input id="qty" inputMode="decimal" type="number" min={0} step="0.01"
            value={litres} onChange={(e) => setLitres(e.target.value)}/>
        </div>
      )}

      {category === "maintenance" && (
        <div>
          <label htmlFor="item">What was it?</label>
          <input id="item" list="maintenance-labels" value={itemLabel}
            onChange={(e) => setItemLabel(e.target.value)} placeholder="e.g. Oil change"/>
          <datalist id="maintenance-labels">
            {COMMON_MAINTENANCE_LABELS.map((l) => <option key={l} value={l}/>)}
          </datalist>
        </div>
      )}

      <div>
        <label>Payment method</label>
        <div className="u-row u-gap-2 u-row-wrap">
          {PAYMENT_METHODS.map((m) => (
            <button key={m.key} type="button"
              onClick={() => choosePayment(m.key)}
              className={"pill-btn " + (paymentMethod === m.key ? "is-active" : "")}>
              {m.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label htmlFor="odometer">Odometer (optional)</label>
        <input id="odometer" inputMode="decimal" type="number" min={0}
          value={odometer} onChange={(e) => setOdometer(e.target.value)}/>
      </div>

      <Button variant="primary" onClick={handleSave} disabled={saving || !amount}>
        {saving ? "Saving…" : "Save"}
        <Icon name="check" size="sm"/>
      </Button>

      {undoState && (
        <p className="u-text-sm u-ink-muted" role="status">
          Saved.{" "}
          <button type="button" onClick={handleUndo}
            style={{ background: "transparent", color: "var(--accent-700)", padding: 0, minHeight: 0, border: 0, fontWeight: 600, cursor: "pointer" }}>
            Undo
          </button>
        </p>
      )}
    </div>
  );
}
