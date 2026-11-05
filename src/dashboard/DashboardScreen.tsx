import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { useVehicles, type Vehicle } from "@/vehicles/useVehicles";
import { useAuth } from "@/auth/AuthContext";
import { Card, Chip, Icon, StatTile } from "@/app/ui";
import { SkeletonCard, SkeletonList, SkeletonStatTile } from "@/app/Skeleton";
import { Donut, GradientBars, TrendLine, formatCurrency } from "@/app/charts";
import {
  spendByMonth,
  litresAndFillUpStats,
  type ExpenseRow,
  type RideLogRow,
} from "@/analytics/computeAnalytics";
import { useDueCount } from "@/notifications/useDueNotifications";
import { getNfcHardwareStatus } from "@/nfc/nfcPlugin";
import { TodayRideWidget } from "@/calendar/RideCalendar";

interface ExpenseWithPayment extends ExpenseRow {
  payment_method: "cash" | "card" | "upi" | "wallet" | "net_banking" | "other";
  id: string;
  cashback_amount?: number;
}

export function DashboardScreen() {
  const { session } = useAuth();
  const navigate = useNavigate();
  const { vehicles } = useVehicles();
  const { count: dueCount } = useDueCount();
  const [nfcDisabled, setNfcDisabled] = useState(false);
  const [expenses, setExpenses] = useState<ExpenseWithPayment[]>([]);
  const [rides, setRides] = useState<RideLogRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getNfcHardwareStatus()
      .then((s) => setNfcDisabled(s === "disabled"))
      .catch(() => setNfcDisabled(false));
  }, []);

  useEffect(() => {
    void (async () => {
      const [exp, ride] = await Promise.all([
        supabase.from("expenses")
          .select("id, vehicle_id, category, total_amount, litres, odometer_reading, expense_date, payment_method, cashback_amount")
          .is("deleted_at", null)
          .order("expense_date", { ascending: false })
          .limit(500),
        supabase.from("ride_logs").select("vehicle_id, ride_date").limit(500),
      ]);
      setExpenses((exp.data ?? []) as ExpenseWithPayment[]);
      setRides(ride.data ?? []);
      setLoading(false);
    })();
  }, []);

  const monthKey = new Date().toISOString().slice(0, 7);
  const prevMonthKey = useMemo(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 1);
    return d.toISOString().slice(0, 7);
  }, []);

  const monthSpend = useMemo(() => expenses
    .filter((e) => e.expense_date.startsWith(monthKey))
    .reduce((s, e) => s + e.total_amount, 0), [expenses, monthKey]);
  const prevMonthSpend = useMemo(() => expenses
    .filter((e) => e.expense_date.startsWith(prevMonthKey))
    .reduce((s, e) => s + e.total_amount, 0), [expenses, prevMonthKey]);

  const totalCashback = useMemo(() => expenses.reduce((s, e) => s + (e.cashback_amount ?? 0), 0), [expenses]);

  const delta = prevMonthSpend > 0 ? ((monthSpend - prevMonthSpend) / prevMonthSpend) * 100 : null;

  const monthlyBars = useMemo(
    () => spendByMonth(expenses).slice(-6).map((m) => ({ label: m.month.slice(5), value: m.total })),
    [expenses]
  );

  const litresTrend = useMemo(
    () => litresAndFillUpStats(expenses).slice(-6).map((f) => f.litres),
    [expenses]
  );

  const paymentDonut = useMemo(() => {
    const buckets: Record<string, number> = {};
    for (const e of expenses) buckets[e.payment_method] = (buckets[e.payment_method] ?? 0) + e.total_amount;
    return Object.entries(buckets).map(([label, value]) => ({ label: paymentLabel(label), value }));
  }, [expenses]);

  const rideDaysThisMonth = useMemo(
    () => new Set(rides.filter((r) => r.ride_date.startsWith(monthKey)).map((r) => r.ride_date)).size,
    [rides, monthKey]
  );

  const recent = expenses.slice(0, 6);

  if (loading) return <DashboardSkeleton name={emailName(session?.user.email)} />;

  return (
    <div className="u-col u-gap-5">
      <header className="page-head">
        <div>
          <p className="u-ink-muted u-text-sm">{greeting()}</p>
          <h1>{emailName(session?.user.email)}</h1>
        </div>
        <div className="page-head__actions">
          <Link to="/vehicles" style={{ textDecoration: "none" }}>
            <Chip variant={dueCount > 0 ? "accent" : "default"}>
              <Icon name="bell" size="sm"/>
              {dueCount} due
            </Chip>
          </Link>
        </div>
      </header>

      {nfcDisabled && (
        <div className="card" style={{ background: "rgba(239, 68, 68, 0.12)", border: "1px solid var(--status-crit)", padding: "var(--s-3) var(--s-4)" }}>
          <div className="u-row u-gap-3">
            <Icon name="nfc" size="md" />
            <div className="u-grow">
              <strong style={{ color: "var(--status-crit)" }}>NFC is turned off</strong>
              <p className="u-text-xs u-ink-muted" style={{ margin: "2px 0 0" }}>
                Enable NFC in your Android settings to tap-to-log at the pump.
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="bento">
        {/* Hero: this month's spend */}
        <Card variant="accent" className="bento__8 u-col u-gap-4">
          <div className="u-row u-row-between">
            <span className="chip chip--on-accent"><Icon name="calendar" size="sm"/>This month</span>
            {delta != null && (
              <span className="chip chip--on-accent">
                <Icon name={delta >= 0 ? "arrow_up" : "arrow_down"} size="sm"/>
                {Math.abs(delta).toFixed(0)}% vs last
              </span>
            )}
          </div>
          <div className="hero-num">{formatCurrency(monthSpend)}</div>
          <p className="u-text-sm" style={{ opacity: 0.8 }}>
            {expenses.filter((e) => e.expense_date.startsWith(monthKey)).length} entries · {rideDaysThisMonth} ride days
          </p>
        </Card>

        {/* Side column: two stacked stats */}
        <div className="bento__4 u-col u-gap-4">
          <StatTile label="Vehicles" value={String(vehicles.length)} />
          {totalCashback > 0 ? (
            <StatTile label="Card Returns" value={formatCurrency(totalCashback)} delta="cashback + waiver" />
          ) : (
            <StatTile label="Fuel entries" value={String(expenses.filter((e) => e.category === "fuel").length)} />
          )}
        </div>

        {/* Today's Ride Planner Widget */}
        <TodayRideWidget onOpenCalendar={() => navigate("/calendar")} />

        {/* Trend row: 6 + 6 */}
        <Card className="bento__6">
          <div className="u-row u-row-between">
            <h4>Spend · last 6 months</h4>
            <Link to="/analytics" className="u-ink-muted u-text-sm">View all</Link>
          </div>
          {monthlyBars.length === 0
            ? <p className="u-ink-muted u-text-sm">Log an expense to see the trend.</p>
            : <GradientBars data={monthlyBars} height={160}/>
          }
        </Card>

        <Card className="bento__6">
          <h4>Litres filled · last 6 months</h4>
          {litresTrend.length >= 2
            ? <TrendLine data={litresTrend} />
            : <p className="u-ink-muted u-text-sm">Log a few fill-ups to see a trend.</p>
          }
        </Card>

        {/* Payment donut — dark surface for emphasis */}
        <Card variant="dark" className="bento__6">
          <div className="u-row u-row-between">
            <h4>Where it goes</h4>
            <span className="chip chip--on-dark">By payment</span>
          </div>
          <div className="u-row u-gap-5">
            <Donut
              data={paymentDonut}
              size={160}
              centerLabel="total"
              centerValue={formatCurrency(paymentDonut.reduce((s, d) => s + d.value, 0))}
            />
            <ul className="list u-grow">
              {paymentDonut.slice(0, 5).map((d, i) => (
                <li key={d.label} className="u-row u-row-between u-text-sm" style={{ padding: "6px 0" }}>
                  <span className="u-row u-gap-2">
                    <span className="dot" style={{ background: `var(--chart-${(i % 6) + 1})` }}/>
                    {d.label}
                  </span>
                  <span className="u-weight-600">{formatCurrency(d.value)}</span>
                </li>
              ))}
              {paymentDonut.length === 0 && <li className="u-ink-muted u-text-sm">No expenses yet.</li>}
            </ul>
          </div>
        </Card>

        {/* Garage preview */}
        <Card className="bento__6">
          <div className="u-row u-row-between">
            <h4>Your garage</h4>
            <Link to="/vehicles" className="u-ink-muted u-text-sm">See all</Link>
          </div>
          {vehicles.length === 0 ? (
            <Link to="/vehicles" className="pill-btn is-active">
              <Icon name="plus" size="sm"/> Add your first vehicle
            </Link>
          ) : (
            <div className="scroll-x">
              {vehicles.map((v) => <VehicleStrip key={v.id} vehicle={v} /> )}
            </div>
          )}
        </Card>

        {/* Recent activity, full width */}
        <Card className="bento__12">
          <div className="u-row u-row-between">
            <h4>Recent activity</h4>
            <Link to="/analytics" className="u-ink-muted u-text-sm">All entries</Link>
          </div>
          {recent.length === 0 ? (
            <p className="u-ink-muted u-text-sm">Nothing logged yet.</p>
          ) : (
            <ul className="list">
              {recent.map((e) => {
                const v = vehicles.find((x) => x.id === e.vehicle_id);
                return (
                  <li key={e.id} className="list__row">
                    <span className={"list__icon " + (e.category === "fuel" ? "list__icon--fuel" : "list__icon--maint")}>
                      <Icon name={e.category === "fuel" ? "fuel" : "wrench"} size="md"/>
                    </span>
                    <div>
                      <div className="list__row-title">{v?.name ?? "Unknown"}</div>
                      <div className="list__row-meta">
                        {e.expense_date} · {paymentLabel(e.payment_method)}
                        {e.cashback_amount != null && e.cashback_amount > 0 && (
                          <span style={{ color: "var(--accent-500, #f5b800)", fontWeight: 600, marginLeft: 6 }}>
                            · ₹{e.cashback_amount.toFixed(2)} saved
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="list__row-value">{formatCurrency(e.total_amount)}</div>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}

function DashboardSkeleton({ name }: { name: string }) {
  return (
    <div className="u-col u-gap-5">
      <header className="page-head">
        <div>
          <p className="u-ink-muted u-text-sm">{greeting()}</p>
          <h1>{name}</h1>
        </div>
      </header>
      <div className="bento">
        <div className="bento__8"><SkeletonCard height={180}/></div>
        <div className="bento__4 u-col u-gap-4"><SkeletonStatTile/><SkeletonStatTile/></div>
        <div className="bento__6"><SkeletonCard height={200}/></div>
        <div className="bento__6"><SkeletonCard height={200}/></div>
        <div className="bento__6"><SkeletonCard height={240}/></div>
        <div className="bento__6"><SkeletonCard height={240}/></div>
        <div className="bento__12"><Card><SkeletonList rows={4}/></Card></div>
      </div>
    </div>
  );
}

function VehicleStrip({ vehicle }: { vehicle: Vehicle }) {
  const photo = vehicle.thumbnail_url ?? vehicle.photo_url;
  const brand = [vehicle.make, vehicle.model].filter(Boolean).join(" ") || "Vehicle";
  return (
    <Link to={`/vehicles/${vehicle.id}`} className="vehicle vehicle--accent" style={{ flex: "0 0 220px", minHeight: 120, padding: "var(--s-4)" }}>
      <div className="u-col u-gap-1">
        <span className="vehicle__brand">{brand}</span>
        <span className="vehicle__name">{vehicle.name}</span>
      </div>
      {photo
        ? <img className="vehicle__photo" src={photo} alt=""/>
        : <span className="vehicle__photo--placeholder">🏍</span>
      }
    </Link>
  );
}

function greeting(): string {
  const h = new Date().getHours();
  if (h < 5) return "Up late,";
  if (h < 12) return "Good morning,";
  if (h < 17) return "Good afternoon,";
  return "Good evening,";
}

function emailName(email?: string | null): string {
  if (!email) return "rider";
  const n = email.split("@")[0];
  return n.charAt(0).toUpperCase() + n.slice(1);
}

function paymentLabel(key: string): string {
  switch (key) {
    case "cash": return "Cash";
    case "card": return "Card";
    case "upi": return "UPI";
    case "wallet": return "Wallet";
    case "net_banking": return "Net banking";
    case "other": return "Other";
    default: return key;
  }
}
