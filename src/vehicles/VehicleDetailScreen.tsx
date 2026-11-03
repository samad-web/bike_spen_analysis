import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useVehicles } from "./useVehicles";
import { useExpenses } from "@/expenses/useExpenses";
import { QuickLogForm } from "@/expenses/QuickLogForm";
import { VehiclePhotoSheet } from "./VehiclePhotoSheet";
import { MaintenanceReminders } from "@/maintenance/MaintenanceReminders";
import { DocumentsCard } from "@/documents/DocumentsCard";
import { Button, Card, Chip, Icon, Sheet, StatTile } from "@/app/ui";
import { SkeletonList } from "@/app/Skeleton";
import { formatCurrency } from "@/app/charts";
import { computeMileageSeries, summarizeMileage } from "@/analytics/fuelEconomy";

export function VehicleDetailScreen() {
  const { vehicleId } = useParams<{ vehicleId: string }>();
  const { vehicles } = useVehicles();
  const { expenses, deleteExpense, loading } = useExpenses(vehicleId ?? null);
  const [logOpen, setLogOpen] = useState(false);
  const [photoOpen, setPhotoOpen] = useState(false);

  const vehicle = vehicles.find((v) => v.id === vehicleId);
  const totals = useMemo(() => {
    const total = expenses.reduce((s, e) => s + e.total_amount, 0);
    const fuel = expenses.filter((e) => e.category === "fuel").reduce((s, e) => s + e.total_amount, 0);
    const litres = expenses.reduce((s, e) => s + (e.litres ?? 0), 0);
    const lastOdo = expenses.find((e) => e.odometer_reading != null)?.odometer_reading ?? null;
    return { total, fuel, maint: total - fuel, litres, lastOdo };
  }, [expenses]);

  const mileage = useMemo(() => {
    if (!vehicleId) return null;
    const series = computeMileageSeries(expenses
      .filter((e) => e.category === "fuel")
      .map((e) => ({
        vehicle_id: vehicleId,
        expense_date: e.expense_date,
        litres: e.litres,
        odometer_reading: e.odometer_reading,
      })));
    return summarizeMileage(series)[0] ?? null;
  }, [expenses, vehicleId]);

  if (!vehicle) return <p className="u-ink-muted">Vehicle not found.</p>;

  const brand = [vehicle.make, vehicle.model].filter(Boolean).join(" ") || "Vehicle";

  return (
    <div className="u-col u-gap-5">
      <Link to="/vehicles" className="u-row u-gap-2 u-ink-muted u-text-sm">
        <Icon name="arrow_left" size="sm"/> Back to garage
      </Link>

      <div className="vehicle vehicle--accent" style={{ minHeight: 240 }}>
        <div className="u-col u-gap-1">
          <span className="vehicle__brand">{brand}</span>
          <h2 className="vehicle__name">{vehicle.name}</h2>
          <span className="vehicle__meta">
            {vehicle.year ? `${vehicle.year} · ` : ""}{vehicle.registration_number ?? ""}
          </span>
        </div>

        <div className="u-row u-gap-2">
          <button type="button" className="pill-btn is-active" onClick={() => setPhotoOpen(true)}>
            <Icon name="camera" size="sm"/>{vehicle.photo_url ? "Replace photo" : "Add photo"}
          </button>
          {vehicle.fuel_type && <Chip variant="on-accent">{vehicle.fuel_type.toUpperCase()}</Chip>}
          {vehicle.active_tag_token && <Chip variant="on-accent"><Icon name="nfc" size="sm"/>Tag paired</Chip>}
        </div>

        {vehicle.photo_url
          ? <img className="vehicle__photo" src={vehicle.photo_url} alt=""/>
          : <span className="vehicle__photo--placeholder">🏍</span>
        }
      </div>

      <div className="bento">
        <div className="bento__3"><StatTile label="Total spent" value={formatCurrency(totals.total)}/></div>
        <div className="bento__3"><StatTile label="Fuel"        value={formatCurrency(totals.fuel)}/></div>
        <div className="bento__3"><StatTile label="Litres"      value={totals.litres.toFixed(1) + " L"}/></div>
        <div className="bento__3">
          <StatTile
            label={mileage ? "Avg km / L" : "Service"}
            value={mileage ? mileage.average_kmpl.toFixed(1) : formatCurrency(totals.maint)}
            delta={mileage ? `${mileage.sample_count} samples · best ${mileage.best_kmpl.toFixed(1)}` : undefined}
          />
        </div>
      </div>

      <div className="u-row u-gap-2 u-row-wrap">
        <Button variant="primary" onClick={() => setLogOpen(true)}><Icon name="plus" size="sm"/>Log expense</Button>
        <Link to={`/nfc-tools?vehicle=${vehicle.id}`} className="pill-btn is-active">
          <Icon name="nfc" size="sm"/>NFC tools
        </Link>
      </div>

      <MaintenanceReminders vehicleId={vehicle.id} vehicleName={vehicle.name} lastOdometer={totals.lastOdo}/>

      <DocumentsCard vehicleId={vehicle.id}/>

      <Card>
        <div className="u-row u-row-between">
          <h3>Recent entries</h3>
        </div>
        {loading ? <SkeletonList rows={4}/> : expenses.length === 0 ? (
          <p className="u-ink-muted u-text-sm">No expenses yet. Log your first fill-up to get started.</p>
        ) : (
          <ul className="list">
            {expenses.slice(0, 10).map((e) => (
              <li key={e.id} className="list__row">
                <span className={"list__icon " + (e.category === "fuel" ? "list__icon--fuel" : "list__icon--maint")}>
                  <Icon name={e.category === "fuel" ? "fuel" : "wrench"} size="md"/>
                </span>
                <div>
                  <div className="list__row-title">{e.category === "fuel" ? "Fuel" : "Maintenance"}</div>
                  <div className="list__row-meta">
                    {e.expense_date}
                    {e.litres != null && ` · ${e.litres} L`}
                    {e.price_per_litre != null && ` · ₹${e.price_per_litre}/L`}
                  </div>
                </div>
                <div className="u-row u-gap-2">
                  <strong className="list__row-value">{formatCurrency(e.total_amount)}</strong>
                  <button type="button" onClick={() => void deleteExpense(e.id)}
                    className="btn btn--ghost btn--sm btn--icon" aria-label="Delete">
                    <Icon name="trash" size="sm"/>
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {logOpen && (
        <Sheet onClose={() => setLogOpen(false)}>
          <QuickLogForm vehicleId={vehicle.id} vehicleName={vehicle.name} onDone={() => setLogOpen(false)}/>
        </Sheet>
      )}
      {photoOpen && <VehiclePhotoSheet vehicleId={vehicle.id} vehicleName={vehicle.name} onClose={() => setPhotoOpen(false)}/>}
    </div>
  );
}
