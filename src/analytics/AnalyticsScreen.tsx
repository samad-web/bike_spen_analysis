import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useVehicles } from "@/vehicles/useVehicles";
import { Button, Card, Icon, StatTile } from "@/app/ui";
import { SkeletonCard, SkeletonStatTile } from "@/app/Skeleton";
import { Donut, GradientBars, TrendLine, formatCurrency } from "@/app/charts";
import {
  costPerKm,
  fleetShare,
  fuelPriceTrend,
  litresAndFillUpStats,
  rideDaySpend,
  spendByMonth,
  type ExpenseRow,
  type RideLogRow,
} from "./computeAnalytics";
import { computeMileageSeries, summarizeMileage } from "./fuelEconomy";
import { downloadCsv, downloadPdfReport, expensesToCsv, type ExportableExpense } from "./exportReports";
import { RideCalendar } from "@/calendar/RideCalendar";

interface AnalyticsExpense extends ExpenseRow {
  payment_method: "cash" | "card" | "upi" | "wallet" | "net_banking" | "other";
}

type Range = "6m" | "ytd" | "12m" | "all";

export function AnalyticsScreen() {
  const { vehicles } = useVehicles();
  const [expenses, setExpenses] = useState<AnalyticsExpense[]>([]);
  const [rides, setRides] = useState<RideLogRow[]>([]);
  const [range, setRange] = useState<Range>("6m");
  const [vehicleFilter, setVehicleFilter] = useState<string | "all">("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      const [exp, ride] = await Promise.all([
        supabase.from("expenses")
          .select("vehicle_id, category, total_amount, litres, odometer_reading, expense_date, payment_method")
          .is("deleted_at", null),
        supabase.from("ride_logs").select("vehicle_id, ride_date"),
      ]);
      setExpenses((exp.data ?? []) as AnalyticsExpense[]);
      setRides(ride.data ?? []);
      setLoading(false);
    })();
  }, []);

  const filtered = useMemo(() => {
    const now = new Date();
    const since = range === "6m" ? subMonths(now, 6)
                : range === "12m" ? subMonths(now, 12)
                : range === "ytd" ? new Date(now.getFullYear(), 0, 1)
                : null;
    return expenses.filter((e) => {
      if (vehicleFilter !== "all" && e.vehicle_id !== vehicleFilter) return false;
      if (since && new Date(e.expense_date) < since) return false;
      return true;
    });
  }, [expenses, range, vehicleFilter]);

  const monthly = useMemo(() => spendByMonth(filtered), [filtered]);
  const yearly = useMemo(() => rollupYearly(filtered), [filtered]);
  const share = useMemo(() => fleetShare(filtered), [filtered]);
  const trend = useMemo(() => fuelPriceTrend(filtered), [filtered]);
  const fuel = useMemo(() => litresAndFillUpStats(filtered), [filtered]);
  const ridesStats = useMemo(() => rideDaySpend(filtered, rides), [filtered, rides]);
  const kmCost = useMemo(() => costPerKm(filtered), [filtered]);

  const totalSpend = filtered.reduce((s, e) => s + e.total_amount, 0);
  const totalLitres = filtered.reduce((s, e) => s + (e.litres ?? 0), 0);
  const fuelSpend = filtered.filter((e) => e.category === "fuel").reduce((s, e) => s + e.total_amount, 0);

  const paymentBreakdown = useMemo(() => {
    const buckets: Record<string, number> = {};
    for (const e of filtered) buckets[e.payment_method] = (buckets[e.payment_method] ?? 0) + e.total_amount;
    return Object.entries(buckets)
      .map(([k, v]) => ({ label: paymentLabel(k), value: v, key: k }))
      .sort((a, b) => b.value - a.value);
  }, [filtered]);

  const nameFor = (id: string) => vehicles.find((v) => v.id === id)?.name ?? id;

  const mileageSeries = useMemo(() => computeMileageSeries(filtered.filter((e) => e.category === "fuel")), [filtered]);
  const mileageSummaries = useMemo(() => summarizeMileage(mileageSeries), [mileageSeries]);

  const rangeLabel = range === "6m" ? "Last 6 months"
                   : range === "ytd" ? "Year to date"
                   : range === "12m" ? "Last 12 months"
                   : "All time";

  const exportableRows = (): ExportableExpense[] => filtered.map((e) => ({
    expense_date: e.expense_date,
    vehicle_name: nameFor(e.vehicle_id),
    category: e.category,
    total_amount: e.total_amount,
    litres: e.litres,
    price_per_litre: e.litres && e.litres > 0 ? e.total_amount / e.litres : null,
    odometer_reading: e.odometer_reading,
    payment_method: e.payment_method,
    notes: null,
  }));

  const handleExportCsv = () => {
    const csv = expensesToCsv(exportableRows());
    const stamp = new Date().toISOString().slice(0, 10);
    downloadCsv(`motopulse-${stamp}.csv`, csv);
  };

  const handleExportPdf = async () => {
    await downloadPdfReport({
      title: `MotoPulse spend report`,
      subtitle: rangeLabel,
      rangeLabel,
      rows: exportableRows(),
      summary: [
        { label: "Total",  value: formatCurrency(totalSpend) },
        { label: "Fuel",   value: formatCurrency(fuelSpend) },
        { label: "Litres", value: totalLitres.toFixed(1) + " L" },
        { label: "Avg ₹/L", value: totalLitres > 0 ? formatCurrency(fuelSpend / totalLitres) : "—" },
      ],
    });
  };

  if (loading) return (
    <div className="u-col" style={{ gap: 20 }}>
      <h1>Analytics</h1>
      <div className="bento">
        {[0,1,2,3].map((i) => <div key={i} className="bento__3"><SkeletonStatTile/></div>)}
      </div>
      <div className="bento">
        <div className="bento__8"><SkeletonCard height={240}/></div>
        <div className="bento__4"><SkeletonCard height={240}/></div>
      </div>
    </div>
  );

  return (
    <div className="u-col" style={{ gap: 20 }}>
      <div className="u-row u-row-between" style={{ flexWrap: "wrap", gap: 12 }}>
        <h1>Analytics</h1>
        <div className="u-row" style={{ gap: 8, flexWrap: "wrap" }}>
          {(["6m", "ytd", "12m", "all"] as const).map((r) => (
            <button key={r} type="button" onClick={() => setRange(r)}
              className={"pill" + (range === r ? " pill--dark" : "")}
              style={{ cursor: "pointer" }}>
              {r === "6m" ? "6 months" : r === "ytd" ? "This year" : r === "12m" ? "12 months" : "All time"}
            </button>
          ))}
          {vehicles.length > 1 && (
            <select value={vehicleFilter} onChange={(e) => setVehicleFilter(e.target.value as "all" | string)}
              style={{ minHeight: 40, width: "auto" }}>
              <option value="all">All vehicles</option>
              {vehicles.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
            </select>
          )}
          <Button size="sm" variant="ghost" onClick={handleExportCsv} className="btn--sm">
            <Icon name="download" size={14}/> CSV
          </Button>
          <Button size="sm" variant="dark" onClick={() => void handleExportPdf()} className="btn--sm">
            <Icon name="download" size={14}/> PDF
          </Button>
        </div>
      </div>

      {/* Headline stats */}
      <div className="bento">
        <div className="bento__3"><StatTile label="Total spend" value={formatCurrency(totalSpend)} variant="accent"/></div>
        <div className="bento__3"><StatTile label="Fuel spend"  value={formatCurrency(fuelSpend)}/></div>
        <div className="bento__3"><StatTile label="Litres"      value={totalLitres.toFixed(1) + " L"}/></div>
        <div className="bento__3"><StatTile
          label="Avg ₹/L"
          value={totalLitres > 0 ? formatCurrency(fuelSpend / totalLitres) : "—"}/></div>
      </div>

      {filtered.length === 0 ? (
        <Card  style={{ textAlign: "center", padding: 48 }}>
          <p className="u-ink-muted">No data in this range. Log an expense to see analytics.</p>
        </Card>
      ) : (
        <div className="bento">
          <Card className="bento__8">
            <div className="u-row u-row-between" style={{ marginBottom: 12 }}>
              <h3>Monthly spend</h3>
              <span className="chip">Last {monthly.length} months</span>
            </div>
            <GradientBars data={monthly.map((m) => ({ label: m.month.slice(5), value: m.total }))} height={200}/>
          </Card>

          <Card className="bento__4" variant="dark">
            <h3 className="u-on-dark" style={{ marginBottom: 12 }}>By payment</h3>
            <Donut data={paymentBreakdown} size={160}
              centerLabel="total" centerValue={formatCurrency(totalSpend)}/>
            <div className="u-col" style={{ gap: 8, marginTop: 12 }}>
              {paymentBreakdown.slice(0, 4).map((d, i) => (
                <div key={d.key} className="row row--between text-sm">
                  <span className="u-row">
                    <span style={{
                      width: 10, height: 10, borderRadius: 10,
                      background: `var(--chart-${(i % 6) + 1})`,
                    }}/>
                    {d.label}
                  </span>
                  <span style={{ fontWeight: 600 }}>{formatCurrency(d.value)}</span>
                </div>
              ))}
            </div>
          </Card>

          <Card className="bento__6">
            <h3 style={{ marginBottom: 12 }}>Fuel price trend</h3>
            {trend.length === 0 ? <p className="u-ink-muted u-text-sm">Log litres to see this.</p>
              : <TrendLine data={trend.map((t) => t.avgPricePerLitre)} color="--chart-1"/>
            }
          </Card>

          <Card className="bento__6">
            <h3 style={{ marginBottom: 12 }}>Avg spend per fill-up</h3>
            {fuel.length === 0 ? <p className="u-ink-muted u-text-sm">No fuel entries yet.</p>
              : <TrendLine data={fuel.map((f) => f.averageSpendPerFillUp)} color="--chart-2"/>
            }
          </Card>

          <Card className="bento__6">
            <h3 style={{ marginBottom: 12 }}>Yearly</h3>
            <GradientBars data={yearly.map((y) => ({ label: y.year, value: y.total }))} height={160}/>
          </Card>

          <Card className="bento__6">
            <h3 style={{ marginBottom: 12 }}>Ride days vs spend</h3>
            <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
              {ridesStats.slice(-6).map((r) => (
                <li key={r.month} className="u-row u-row-between" style={{ padding: "8px 0", borderBottom: "1px solid var(--divider)" }}>
                  <span>{r.month}</span>
                  <span>{r.rideDays} days</span>
                  <span style={{ fontWeight: 600 }}>{r.spendPerRideDay != null ? formatCurrency(r.spendPerRideDay) + "/day" : "—"}</span>
                </li>
              ))}
            </ul>
          </Card>

          <div className="bento__12">
            <RideCalendar />
          </div>

          {vehicles.length > 1 && (
            <Card className="bento__6">
              <h3 style={{ marginBottom: 12 }}>Fleet share</h3>
              <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                {Object.entries(share).map(([vid, s]) => (
                  <li key={vid} className="u-row u-row-between" style={{ padding: "8px 0" }}>
                    <span>{nameFor(vid)}</span>
                    <span style={{ fontWeight: 600 }}>{(s * 100).toFixed(1)}%</span>
                  </li>
                ))}
              </ul>
            </Card>
          )}

          {kmCost.length > 0 && (
            <Card className="bento__6">
              <h3 style={{ marginBottom: 12 }}>Cost per km (odometer-based)</h3>
              <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                {kmCost.slice(-6).map((k, i) => (
                  <li key={`${k.vehicleId}-${i}`} className="u-row u-row-between" style={{ padding: "8px 0" }}>
                    <span className="u-text-sm">{nameFor(k.vehicleId)}: {k.from} → {k.to}</span>
                    <span style={{ fontWeight: 600 }}>{formatCurrency(k.costPerKm)}/km</span>
                  </li>
                ))}
              </ul>
            </Card>
          )}

          {mileageSummaries.length > 0 && (
            <Card className="bento__12">
              <div className="u-row u-row-between" style={{ marginBottom: 12 }}>
                <h3>Fuel economy (km / L)</h3>
                <span className="chip">Tank-to-tank, odometer-based</span>
              </div>
              <div className="bento">
                {mileageSummaries.map((m) => {
                  const points = mileageSeries.filter((p) => p.vehicle_id === m.vehicle_id).slice(-8).map((p) => p.km_per_litre);
                  return (
                    <Card key={m.vehicle_id} className="bento__6">
                      <div className="u-row u-row-between" style={{ marginBottom: 6 }}>
                        <strong>{nameFor(m.vehicle_id)}</strong>
                        <span className="chip">{m.sample_count} samples</span>
                      </div>
                      <div className="hero-num" style={{ fontSize: 36 }}>{m.average_kmpl.toFixed(1)}</div>
                      <p className="u-ink-muted u-text-xs" style={{ marginBottom: 8 }}>
                        avg km/L · best {m.best_kmpl.toFixed(1)} · worst {m.worst_kmpl.toFixed(1)} · latest {m.latest_kmpl.toFixed(1)}
                      </p>
                      {points.length >= 2 && <TrendLine data={points} height={120} color="--chart-3"/>}
                    </Card>
                  );
                })}
              </div>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}

function subMonths(d: Date, n: number): Date {
  const r = new Date(d);
  r.setMonth(r.getMonth() - n);
  return r;
}

function rollupYearly(expenses: ExpenseRow[]) {
  const byYear = new Map<string, number>();
  for (const e of expenses) {
    const y = e.expense_date.slice(0, 4);
    byYear.set(y, (byYear.get(y) ?? 0) + e.total_amount);
  }
  return [...byYear.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([year, total]) => ({ year, total }));
}

function paymentLabel(k: string): string {
  switch (k) {
    case "cash": return "Cash";
    case "card": return "Card";
    case "upi": return "UPI";
    case "wallet": return "Wallet";
    case "net_banking": return "Net banking";
    case "other": return "Other";
    default: return k;
  }
}
