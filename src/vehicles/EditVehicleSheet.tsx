import { useState } from "react";
import type { Vehicle } from "./useVehicles";
import { Button, Sheet } from "@/app/ui";
import { formatIndianReg, isValidIndianReg, normalizeIndianReg } from "./indianRegistration";

interface Props {
  vehicle: Vehicle;
  onClose: () => void;
  onSave: (id: string, patch: Partial<Vehicle>) => Promise<{ error: string | null }>;
}

export function EditVehicleSheet({ vehicle, onClose, onSave }: Props) {
  const [name, setName] = useState(vehicle.name);
  const [make, setMake] = useState(vehicle.make ?? "");
  const [model, setModel] = useState(vehicle.model ?? "");
  const [year, setYear] = useState(vehicle.year?.toString() ?? "");
  const [reg, setReg] = useState(vehicle.registration_number ?? "");
  const [fuelType, setFuelType] = useState<Vehicle["fuel_type"]>(vehicle.fuel_type ?? "petrol");
  const [tank, setTank] = useState(vehicle.tank_capacity?.toString() ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async () => {
    if (!name.trim() || saving) return;
    setSaving(true);
    setError(null);

    const regCanonical = reg.trim()
      ? isValidIndianReg(reg)
        ? normalizeIndianReg(reg)
        : reg.trim()
      : null;

    const { error: saveErr } = await onSave(vehicle.id, {
      name: name.trim(),
      make: make.trim() || null,
      model: model.trim() || null,
      year: year ? Number(year) : null,
      registration_number: regCanonical,
      fuel_type: fuelType,
      tank_capacity: tank ? Number(tank) : null,
    });

    setSaving(false);
    if (saveErr) {
      setError(saveErr);
    } else {
      onClose();
    }
  };

  return (
    <Sheet onClose={onClose} title={`Edit ${vehicle.name}`} subtitle="Update vehicle information.">
      <div>
        <label htmlFor="ev-name">Nickname</label>
        <input
          id="ev-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Classic 350"
          autoFocus
        />
      </div>

      <div className="u-row u-gap-3">
        <div className="u-grow">
          <label htmlFor="ev-make">Make</label>
          <input
            id="ev-make"
            value={make}
            onChange={(e) => setMake(e.target.value)}
            placeholder="Royal Enfield"
          />
        </div>
        <div className="u-grow">
          <label htmlFor="ev-model">Model</label>
          <input
            id="ev-model"
            value={model}
            onChange={(e) => setModel(e.target.value)}
            placeholder="Classic 350"
          />
        </div>
      </div>

      <div className="u-row u-gap-3">
        <div className="u-grow">
          <label htmlFor="ev-year">Year</label>
          <input
            id="ev-year"
            type="number"
            value={year}
            onChange={(e) => setYear(e.target.value)}
            placeholder="2024"
          />
        </div>
        <div className="u-grow">
          <label htmlFor="ev-reg">Registration</label>
          <input
            id="ev-reg"
            value={reg}
            onChange={(e) => setReg(normalizeIndianReg(e.target.value))}
            onBlur={(e) => setReg(normalizeIndianReg(e.target.value))}
            placeholder="KA01AB1234"
            autoCapitalize="characters"
            autoCorrect="off"
            spellCheck={false}
            inputMode="text"
            style={{ textTransform: "uppercase", fontFamily: "ui-monospace, monospace", letterSpacing: "0.04em" }}
            aria-invalid={reg.length > 0 && !isValidIndianReg(reg)}
          />
          {reg.length > 0 && !isValidIndianReg(reg) && (
            <p className="u-text-xs" style={{ color: "var(--status-warn)", marginTop: 4 }}>
              Format: KA-01-AB-1234 (state-district-series-number) or 22-BH-1234-A
            </p>
          )}
          {reg.length > 0 && isValidIndianReg(reg) && (
            <p className="u-text-xs u-ink-muted" style={{ marginTop: 4 }}>
              Will be saved as <strong>{formatIndianReg(reg)}</strong>
            </p>
          )}
        </div>
      </div>

      <div className="u-row u-gap-3">
        <div className="u-grow">
          <label htmlFor="ev-fuel">Fuel type</label>
          <select
            id="ev-fuel"
            value={fuelType ?? "petrol"}
            onChange={(e) => setFuelType(e.target.value as Vehicle["fuel_type"])}
          >
            <option value="petrol">Petrol</option>
            <option value="diesel">Diesel</option>
            <option value="electric">Electric</option>
            <option value="cng">CNG</option>
            <option value="hybrid">Hybrid</option>
          </select>
        </div>
        <div className="u-grow">
          <label htmlFor="ev-tank">Tank (L)</label>
          <input
            id="ev-tank"
            type="number"
            step="0.1"
            value={tank}
            onChange={(e) => setTank(e.target.value)}
            placeholder="13"
          />
        </div>
      </div>

      {error && (
        <p role="alert" className="u-text-sm" style={{ color: "var(--status-crit)" }}>
          Could not save: {error}
        </p>
      )}

      <div className="sheet__actions">
        <Button variant="ghost" onClick={onClose}>
          Cancel
        </Button>
        <Button variant="primary" onClick={save} disabled={!name.trim() || saving}>
          {saving ? "Saving…" : "Save changes"}
        </Button>
      </div>
    </Sheet>
  );
}

