import { useState } from "react";
import { Link } from "react-router-dom";
import { useVehicles, type Vehicle } from "./useVehicles";
import { Button, Card, Chip, Icon, Sheet } from "@/app/ui";
import { SkeletonVehicleCard } from "@/app/Skeleton";
import { formatIndianReg, isValidIndianReg, normalizeIndianReg } from "./indianRegistration";

export function VehiclesScreen() {
  const { vehicles, loading, createVehicle } = useVehicles();
  const [open, setOpen] = useState(false);

  if (loading) return (
    <div>
      <header className="page-head">
        <div>
          <h1>Your garage</h1>
          <p className="u-ink-muted u-text-sm">Loading…</p>
        </div>
      </header>
      <div className="bento">
        <div className="bento__6"><SkeletonVehicleCard/></div>
        <div className="bento__6"><SkeletonVehicleCard/></div>
      </div>
    </div>
  );

  return (
    <div>
      <header className="page-head">
        <div>
          <h1>Your garage</h1>
          <p className="u-ink-muted u-text-sm">
            {vehicles.length === 0 ? "Start by adding a vehicle" : `${vehicles.length} vehicle${vehicles.length === 1 ? "" : "s"}`}
          </p>
        </div>
        <div className="page-head__actions">
          <Button variant="primary" onClick={() => setOpen(true)}>
            <Icon name="plus" size="sm"/> Add vehicle
          </Button>
        </div>
      </header>

      {vehicles.length === 0 ? (
        <Card>
          <div className="u-col u-gap-4" style={{ textAlign: "center", padding: "var(--s-7) var(--s-5)" }}>
            <div style={{ fontSize: 56 }}>🏍️</div>
            <h3>No vehicles yet</h3>
            <p className="u-ink-muted u-text-sm">
              Add your first bike or car to start logging fuel and service.
            </p>
            <div><Button onClick={() => setOpen(true)}>Add vehicle</Button></div>
          </div>
        </Card>
      ) : (
        <div className="bento">
          {vehicles.map((v, i) => <VehicleGridCard key={v.id} vehicle={v} style={styleFor(i)} />)}
        </div>
      )}

      {open && <AddVehicleSheet onClose={() => setOpen(false)} onSave={async (f) => {
        const r = await createVehicle(f);
        if (!r.error) setOpen(false);
        return r;
      }}/>}
    </div>
  );
}

/** Picks a visual style per vehicle. The first is accent (hero), the rest
 * are dark, every third is surface. Avoids 6+ identical gradient cards. */
function styleFor(i: number): "accent" | "dark" | "surface" {
  if (i === 0) return "accent";
  if (i % 3 === 2) return "surface";
  return "dark";
}

function VehicleGridCard({ vehicle, style }: { vehicle: Vehicle; style: "accent" | "dark" | "surface" }) {
  const photo = vehicle.photo_url;
  const brand = [vehicle.make, vehicle.model].filter(Boolean).join(" ") || "Vehicle";
  const cls = "vehicle" + (style === "accent" ? " vehicle--accent" : style === "surface" ? " vehicle--surface" : "");
  return (
    <Link to={`/vehicles/${vehicle.id}`} className="bento__6">
      <div className={cls}>
        <div className="u-col u-gap-1">
          <span className="vehicle__brand">{brand}</span>
          <div className="vehicle__name">{vehicle.name}</div>
          <span className="vehicle__meta">
            {vehicle.year ? `${vehicle.year} · ` : ""}{vehicle.registration_number ?? ""}
          </span>
        </div>

        <div className="u-row u-gap-2">
          {vehicle.active_tag_token && <Chip variant={style === "accent" ? "on-accent" : "on-dark"}><Icon name="nfc" size="sm"/>Tag</Chip>}
          {vehicle.fuel_type && <Chip variant={style === "accent" ? "on-accent" : "on-dark"}>{vehicle.fuel_type.toUpperCase()}</Chip>}
        </div>

        {photo
          ? <img className="vehicle__photo" src={photo} alt=""/>
          : <span className="vehicle__photo--placeholder">🏍</span>
        }
      </div>
    </Link>
  );
}

function AddVehicleSheet({ onClose, onSave }: {
  onClose: () => void;
  onSave: (f: Parameters<ReturnType<typeof useVehicles>["createVehicle"]>[0]) => Promise<{ error: string | null }>;
}) {
  const [name, setName] = useState("");
  const [make, setMake] = useState("");
  const [model, setModel] = useState("");
  const [year, setYear] = useState("");
  const [reg, setReg] = useState("");
  const [fuelType, setFuelType] = useState<Vehicle["fuel_type"]>("petrol");
  const [tank, setTank] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async () => {
    if (!name.trim() || saving) return;
    setSaving(true);
    setError(null);
    // If the user filled in a registration, store it in the canonical
    // compact-uppercase form so lookups are consistent. If they left it
    // partial/invalid we keep whatever they typed (the warning is only
    // advisory — the field is optional and some users have odd fleet IDs).
    const regCanonical = reg.trim()
      ? (isValidIndianReg(reg) ? normalizeIndianReg(reg) : reg.trim())
      : null;
    const { error: saveErr } = await onSave({
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
      setName(""); setMake(""); setModel(""); setYear(""); setReg(""); setTank("");
    }
  };

  return (
    <Sheet onClose={onClose}
      title="Add a vehicle"
      subtitle="You can add a photo and NFC tag later from the vehicle screen.">
      <div>
        <label htmlFor="v-name">Nickname</label>
        <input id="v-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Classic 350" autoFocus/>
      </div>

      <div className="u-row u-gap-3">
        <div className="u-grow">
          <label htmlFor="v-make">Make</label>
          <input id="v-make" value={make} onChange={(e) => setMake(e.target.value)} placeholder="Royal Enfield"/>
        </div>
        <div className="u-grow">
          <label htmlFor="v-model">Model</label>
          <input id="v-model" value={model} onChange={(e) => setModel(e.target.value)} placeholder="Classic 350"/>
        </div>
      </div>

      <div className="u-row u-gap-3">
        <div className="u-grow">
          <label htmlFor="v-year">Year</label>
          <input id="v-year" type="number" value={year} onChange={(e) => setYear(e.target.value)} placeholder="2024"/>
        </div>
        <div className="u-grow">
          <label htmlFor="v-reg">Registration</label>
          <input id="v-reg"
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
          <label htmlFor="v-fuel">Fuel type</label>
          <select id="v-fuel" value={fuelType ?? "petrol"} onChange={(e) => setFuelType(e.target.value as Vehicle["fuel_type"])}>
            <option value="petrol">Petrol</option>
            <option value="diesel">Diesel</option>
            <option value="electric">Electric</option>
            <option value="cng">CNG</option>
            <option value="hybrid">Hybrid</option>
          </select>
        </div>
        <div className="u-grow">
          <label htmlFor="v-tank">Tank (L)</label>
          <input id="v-tank" type="number" step="0.1" value={tank} onChange={(e) => setTank(e.target.value)} placeholder="13"/>
        </div>
      </div>

      {error && (
        <p role="alert" className="u-text-sm" style={{ color: "var(--status-crit)" }}>
          Could not save: {error}
        </p>
      )}

      <div className="sheet__actions">
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button variant="primary" onClick={save} disabled={!name.trim() || saving}>
          {saving ? "Saving…" : "Add to garage"}
        </Button>
      </div>
    </Sheet>
  );
}
