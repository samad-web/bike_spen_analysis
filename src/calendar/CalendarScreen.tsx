import { useMemo, useState } from "react";
import { useRideCalendar } from "./useRideCalendar";
import { useVehicles, type Vehicle } from "@/vehicles/useVehicles";
import { Button, Card, Chip, Icon, Sheet } from "@/app/ui";
import { formatCurrency } from "@/app/charts";
import { QuickLogForm } from "@/expenses/QuickLogForm";

const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

export function CalendarScreen() {
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const todayIso = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const [selectedDateIso, setSelectedDateIso] = useState<string>(todayIso);
  const [logModalVehicleId, setLogModalVehicleId] = useState<string | null>(null);

  const { vehicles } = useVehicles();
  const { getDaySummary, logRide, removeRide, planRide } = useRideCalendar(currentDate);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const prevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const monthName = currentDate.toLocaleString("default", { month: "long" });

  // Grid computation
  const firstDayOfWeek = new Date(year, month, 1).getDay();
  const totalDays = new Date(year, month + 1, 0).getDate();

  const days: { dateIso: string; dayNum: number; inMonth: boolean }[] = [];

  // Previous month padding
  const prevMonthLastDay = new Date(year, month, 0).getDate();
  for (let i = firstDayOfWeek - 1; i >= 0; i--) {
    const d = prevMonthLastDay - i;
    const prevM = month === 0 ? 12 : month;
    const prevY = month === 0 ? year - 1 : year;
    const dateIso = `${prevY}-${String(prevM).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    days.push({ dateIso, dayNum: d, inMonth: false });
  }

  // Days in current month
  for (let d = 1; d <= totalDays; d++) {
    const dateIso = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    days.push({ dateIso, dayNum: d, inMonth: true });
  }

  // Trailing days
  const remaining = (7 - (days.length % 7)) % 7;
  for (let d = 1; d <= remaining; d++) {
    const nextM = month === 11 ? 1 : month + 2;
    const nextY = month === 11 ? year + 1 : year;
    const dateIso = `${nextY}-${String(nextM).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    days.push({ dateIso, dayNum: d, inMonth: false });
  }

  const selectedSummary = getDaySummary(selectedDateIso);

  const selectedFormattedDate = new Date(selectedDateIso + "T00:00:00").toLocaleDateString(undefined, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const riddenVehicles: Vehicle[] = useMemo(() => {
    return selectedSummary.riddenVehicleIds
      .map((id) => vehicles.find((v) => v.id === id))
      .filter((v): v is Vehicle => Boolean(v));
  }, [selectedSummary.riddenVehicleIds, vehicles]);

  const plannedVehicle = vehicles.find((v) => v.id === selectedSummary.plannedRide?.vehicle_id);

  return (
    <div className="u-col u-gap-5">
      <header className="page-head">
        <div>
          <h1>Ride Calendar</h1>
          <p className="u-ink-muted u-text-sm">Click any date to see which bike was ridden or plan upcoming rides.</p>
        </div>
      </header>

      <div className="bento">
        {/* Calendar Box - Custom minimal dark styling matching reference image */}
        <div className="bento__6">
          <div
            style={{
              background: "#16161a",
              border: "1px solid var(--border)",
              borderRadius: "var(--r-outer)",
              padding: "24px 20px",
              boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
            }}
          >
            {/* Calendar Header with Up/Down buttons matching user image */}
            <div
              className="u-row u-row-between"
              style={{
                alignItems: "center",
                marginBottom: 24,
              }}
            >
              <h2
                style={{
                  fontSize: "1.25rem",
                  fontWeight: 600,
                  margin: 0,
                  color: "#f5f5f7",
                }}
              >
                {monthName}, {year}
              </h2>
              <div className="u-row u-gap-1">
                <button
                  type="button"
                  onClick={prevMonth}
                  aria-label="Previous month"
                  style={{
                    background: "none",
                    border: 0,
                    color: "#8e8e93",
                    padding: "6px 8px",
                    cursor: "pointer",
                    fontSize: 14,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    borderRadius: 6,
                  }}
                >
                  ▲
                </button>
                <button
                  type="button"
                  onClick={nextMonth}
                  aria-label="Next month"
                  style={{
                    background: "none",
                    border: 0,
                    color: "#8e8e93",
                    padding: "6px 8px",
                    cursor: "pointer",
                    fontSize: 14,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    borderRadius: 6,
                  }}
                >
                  ▼
                </button>
              </div>
            </div>

            {/* Weekdays Row: Su Mo Tu We Th Fr Sa */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(7, 1fr)",
                textAlign: "center",
                marginBottom: 16,
              }}
            >
              {WEEKDAYS.map((w) => (
                <div
                  key={w}
                  style={{
                    color: "#ffffff",
                    fontSize: "0.85rem",
                    fontWeight: 600,
                    letterSpacing: "0.02em",
                  }}
                >
                  {w}
                </div>
              ))}
            </div>

            {/* Days Grid with Circular Numbers */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(7, 1fr)",
                rowGap: 12,
                columnGap: 4,
                textAlign: "center",
              }}
            >
              {days.map((item) => {
                const summary = getDaySummary(item.dateIso);
                const isSelected = item.dateIso === selectedDateIso;
                const isToday = summary.isToday;
                const hasRides = summary.riddenVehicleIds.length > 0;
                const hasPlanned = Boolean(summary.plannedRide);

                return (
                  <div
                    key={item.dateIso}
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => setSelectedDateIso(item.dateIso)}
                      style={{
                        width: 38,
                        height: 38,
                        borderRadius: "50%",
                        border: isSelected && !isToday ? "2px solid #38bdf8" : "none",
                        background: isToday
                          ? "#38bdf8" // Vibrant blue/cyan circle as in screenshot
                          : isSelected
                          ? "#26262b"
                          : "transparent",
                        color: isToday
                          ? "#000000" // Black text on today's cyan circle
                          : item.inMonth
                          ? "#ffffff"
                          : "#4a4a50", // Muted overflow days
                        fontWeight: isToday || isSelected ? 700 : 500,
                        fontSize: "0.95rem",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        position: "relative",
                        transition: "all 0.15s ease",
                      }}
                    >
                      {item.dayNum}
                    </button>

                    {/* Indicator dots for bike rides & plans */}
                    <div style={{ height: 6, display: "flex", gap: 3, marginTop: 2 }}>
                      {hasRides && (
                        <span
                          title="Bike ridden on this day"
                          style={{
                            width: 5,
                            height: 5,
                            borderRadius: "50%",
                            background: "#f5b800",
                          }}
                        />
                      )}
                      {hasPlanned && !hasRides && (
                        <span
                          title="Bike planned for this day"
                          style={{
                            width: 5,
                            height: 5,
                            borderRadius: "50%",
                            background: "#38bdf8",
                          }}
                        />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Selected Day Details Panel */}
        <div className="bento__6 u-col u-gap-4">
          <Card>
            <div className="u-row u-row-between" style={{ alignItems: "center" }}>
              <div>
                <span className="u-text-xs u-ink-muted" style={{ textTransform: "uppercase", letterSpacing: "0.08em" }}>
                  {selectedSummary.isToday ? "Today" : selectedSummary.isPast ? "Past Date" : "Upcoming"}
                </span>
                <h2 style={{ fontSize: "1.3rem", margin: "2px 0 0" }}>{selectedFormattedDate}</h2>
              </div>
              {selectedSummary.isToday && <Chip variant="accent">Today</Chip>}
            </div>
          </Card>

          {/* Ridden Bikes Section */}
          <Card>
            <div className="u-row u-row-between" style={{ marginBottom: 12 }}>
              <h3>Bike ridden on this day</h3>
              {riddenVehicles.length > 0 && <span className="chip chip--accent">{riddenVehicles.length} ridden</span>}
            </div>

            {riddenVehicles.length > 0 ? (
              <div className="u-col u-gap-3">
                {riddenVehicles.map((v) => (
                  <div
                    key={v.id}
                    className="card card--accent u-row u-row-between"
                    style={{ padding: "var(--s-4)", alignItems: "center" }}
                  >
                    <div className="u-row u-gap-3" style={{ alignItems: "center" }}>
                      {v.photo_url ? (
                        <img
                          src={v.photo_url}
                          alt={v.name}
                          style={{ width: 48, height: 48, borderRadius: "var(--r-md)", objectFit: "cover" }}
                        />
                      ) : (
                        <div
                          style={{
                            width: 48,
                            height: 48,
                            borderRadius: "var(--r-md)",
                            background: "var(--surface)",
                            display: "grid",
                            placeItems: "center",
                            fontSize: 22,
                          }}
                        >
                          🏍
                        </div>
                      )}
                      <div>
                        <div style={{ fontWeight: 700, fontSize: "1.05rem" }}>{v.name}</div>
                        <div className="u-text-xs u-ink-muted">
                          {[v.make, v.model].filter(Boolean).join(" ")}
                          {v.registration_number ? ` · ${v.registration_number}` : ""}
                        </div>
                      </div>
                    </div>

                    <div className="u-row u-gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setLogModalVehicleId(v.id)}
                      >
                        <Icon name="fuel" size="sm" /> Log
                      </Button>
                      <button
                        type="button"
                        onClick={() => void removeRide(selectedDateIso, v.id)}
                        className="btn btn--ghost btn--sm btn--icon"
                        title="Remove from this day"
                        aria-label="Remove"
                      >
                        <Icon name="trash" size="sm" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ padding: "16px 0" }}>
                <p className="u-text-sm u-ink-muted" style={{ marginBottom: 12 }}>
                  No bike ride recorded for {selectedSummary.isToday ? "today" : "this day"}.
                </p>

                {vehicles.length > 0 && (
                  <div>
                    <span className="u-text-xs u-ink-muted" style={{ fontWeight: 600, display: "block", marginBottom: 8 }}>
                      Did you ride a bike? Tap to record:
                    </span>
                    <div className="u-row u-gap-2 u-row-wrap">
                      {vehicles.map((v) => (
                        <button
                          key={v.id}
                          type="button"
                          onClick={() => void logRide(selectedDateIso, v.id)}
                          className="pill-btn is-active"
                          style={{ cursor: "pointer" }}
                        >
                          <Icon name="bike" size="sm" />
                          {v.name}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* If a planned bike was assigned */}
            {plannedVehicle && !selectedSummary.riddenVehicleIds.includes(plannedVehicle.id) && (
              <div style={{ marginTop: 16, borderTop: "1px solid var(--border)", paddingTop: 12 }}>
                <div className="u-row u-row-between" style={{ alignItems: "center" }}>
                  <span className="u-text-xs u-ink-muted">Planned to ride:</span>
                  <button
                    type="button"
                    onClick={() => void logRide(selectedDateIso, plannedVehicle.id)}
                    className="pill-btn"
                  >
                    Confirm {plannedVehicle.name} ridden
                  </button>
                </div>
              </div>
            )}
          </Card>

          {/* Spend on this day */}
          {selectedSummary.totalSpend > 0 && (
            <Card>
              <div className="u-row u-row-between" style={{ marginBottom: 12 }}>
                <h4>Expenses on this day</h4>
                <strong style={{ color: "var(--accent-500)" }}>{formatCurrency(selectedSummary.totalSpend)}</strong>
              </div>
              <ul className="list">
                {selectedSummary.dayExpenses.map((e) => (
                  <li key={e.id} className="list__row">
                    <span className={"list__icon " + (e.category === "fuel" ? "list__icon--fuel" : "list__icon--maint")}>
                      <Icon name={e.category === "fuel" ? "fuel" : "wrench"} size="sm" />
                    </span>
                    <div>
                      <div className="list__row-title">
                        {vehicles.find((v) => v.id === e.vehicle_id)?.name ?? "Bike"}
                      </div>
                      <div className="list__row-meta">
                        {e.category === "fuel" ? "Fuel" : "Maintenance"}
                        {e.litres ? ` · ${e.litres} L` : ""}
                      </div>
                    </div>
                    <strong className="list__row-value">{formatCurrency(e.total_amount)}</strong>
                  </li>
                ))}
              </ul>
            </Card>
          )}

          {/* Plan/Schedule button for upcoming days */}
          {(selectedSummary.isToday || selectedSummary.isFuture) && vehicles.length > 0 && (
            <Card>
              <div className="u-row u-row-between" style={{ alignItems: "center", marginBottom: 8 }}>
                <h4>Plan bike for this day</h4>
                {selectedSummary.plannedRide && (
                  <Chip variant="default">Scheduled</Chip>
                )}
              </div>
              <p className="u-text-xs u-ink-muted" style={{ margin: "0 0 12px" }}>
                Select which vehicle you plan to take out on {selectedFormattedDate}.
              </p>
              <div className="u-row u-gap-2 u-row-wrap">
                {vehicles.map((v) => (
                  <button
                    key={v.id}
                    type="button"
                    onClick={() => void planRide(selectedDateIso, v.id)}
                    className={"pill-btn " + (selectedSummary.plannedRide?.vehicle_id === v.id ? "is-active" : "")}
                  >
                    <Icon name="bike" size="sm" />
                    {v.name}
                  </button>
                ))}
              </div>
            </Card>
          )}
        </div>
      </div>

      {logModalVehicleId && (
        <Sheet onClose={() => setLogModalVehicleId(null)}>
          <QuickLogForm
            vehicleId={logModalVehicleId}
            vehicleName={vehicles.find((v) => v.id === logModalVehicleId)?.name ?? "Vehicle"}
            onDone={() => setLogModalVehicleId(null)}
          />
        </Sheet>
      )}
    </div>
  );
}
