import { useState } from "react";
import { useRideCalendar, type CalendarDaySummary } from "./useRideCalendar";
import { useVehicles, type Vehicle } from "@/vehicles/useVehicles";
import { Button, Card, Chip, Icon, Sheet } from "@/app/ui";
import { formatCurrency } from "@/app/charts";

interface Props {
  initialDate?: Date;
}

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function RideCalendar({ initialDate = new Date() }: Props) {
  const [currentDate, setCurrentDate] = useState<Date>(initialDate);
  const [selectedDay, setSelectedDay] = useState<CalendarDaySummary | null>(null);
  const { vehicles } = useVehicles();
  const { getDaySummary, planRide, clearPlan } = useRideCalendar(currentDate);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const prevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
    setSelectedDay(null);
  };

  const nextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
    setSelectedDay(null);
  };

  const monthName = currentDate.toLocaleString("default", { month: "long" });

  // Compute days in month and padding
  const firstDayOfWeek = new Date(year, month, 1).getDay();
  const totalDays = new Date(year, month + 1, 0).getDate();

  const days: { dateIso: string; dayNum: number; inMonth: boolean }[] = [];

  // Padding from previous month
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

  // Trailing padding to fill 35 or 42 cells
  const remaining = (7 - (days.length % 7)) % 7;
  for (let d = 1; d <= remaining; d++) {
    const nextM = month === 11 ? 1 : month + 2;
    const nextY = month === 11 ? year + 1 : year;
    const dateIso = `${nextY}-${String(nextM).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    days.push({ dateIso, dayNum: d, inMonth: false });
  }

  const vehicleName = (id?: string | null) => vehicles.find((v) => v.id === id)?.name ?? null;

  return (
    <Card className="calendar-card" style={{ padding: "var(--s-4)" }}>
      {/* Calendar Header */}
      <div className="u-row u-row-between" style={{ marginBottom: "var(--s-4)", flexWrap: "wrap", gap: 8 }}>
        <div>
          <h3 style={{ margin: 0 }}>Ride Calendar</h3>
          <p className="u-ink-muted u-text-xs" style={{ margin: "2px 0 0" }}>
            Plan which bike to use and review daily rides
          </p>
        </div>
        <div className="u-row u-gap-2">
          <button type="button" onClick={prevMonth} className="btn btn--ghost btn--sm btn--icon" aria-label="Previous month">
            <Icon name="arrow_left" size="sm" />
          </button>
          <span style={{ fontWeight: 600, minWidth: 120, textAlign: "center" }}>
            {monthName} {year}
          </span>
          <button type="button" onClick={nextMonth} className="btn btn--ghost btn--sm btn--icon" aria-label="Next month">
            <Icon name="arrow_right" size="sm" />
          </button>
        </div>
      </div>

      {/* Weekdays Header */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(7, 1fr)",
          textAlign: "center",
          gap: 4,
          marginBottom: 6,
        }}
      >
        {WEEKDAYS.map((w) => (
          <span key={w} className="u-ink-muted u-text-xs" style={{ fontWeight: 600 }}>
            {w}
          </span>
        ))}
      </div>

      {/* Calendar Days Grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(7, 1fr)",
          gap: 6,
        }}
      >
        {days.map((item) => {
          const summary = getDaySummary(item.dateIso);
          const plannedBike = vehicleName(summary.plannedRide?.vehicle_id);

          return (
            <button
              key={item.dateIso}
              type="button"
              onClick={() => setSelectedDay(summary)}
              style={{
                aspectRatio: "1",
                minHeight: 52,
                borderRadius: "var(--r-md)",
                border: summary.isToday ? "2px solid var(--accent-500)" : "1px solid var(--border)",
                background: summary.isToday
                  ? "var(--surface-raised)"
                  : item.inMonth
                  ? "var(--surface-alt)"
                  : "transparent",
                opacity: item.inMonth ? 1 : 0.35,
                padding: 4,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "space-between",
                cursor: "pointer",
                position: "relative",
              }}
            >
              <div className="u-row u-row-between" style={{ width: "100%", lineHeight: 1 }}>
                <span
                  style={{
                    fontSize: "var(--t-xs)",
                    fontWeight: summary.isToday ? 700 : 500,
                    color: summary.isToday ? "var(--accent-500)" : "inherit",
                  }}
                >
                  {item.dayNum}
                </span>
                {summary.plannedRide && (
                  <span
                    title={`Planned: ${plannedBike}`}
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: "50%",
                      background: "var(--accent-500)",
                    }}
                  />
                )}
              </div>

              {/* Badges on cell */}
              <div style={{ width: "100%", overflow: "hidden", display: "flex", flexDirection: "column", gap: 2 }}>
                {plannedBike && (
                  <span
                    style={{
                      fontSize: 9,
                      fontWeight: 600,
                      background: "rgba(245, 184, 0, 0.15)",
                      color: "var(--accent-500)",
                      borderRadius: 4,
                      padding: "1px 3px",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      display: "block",
                      textAlign: "center",
                    }}
                  >
                    {plannedBike}
                  </span>
                )}
                {summary.totalSpend > 0 && (
                  <span
                    style={{
                      fontSize: 9,
                      fontWeight: 600,
                      color: "var(--ink-muted)",
                      display: "block",
                      textAlign: "center",
                    }}
                  >
                    {formatCurrency(summary.totalSpend)}
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Day Details / Plan Modal */}
      {selectedDay && (
        <DayPlanSheet
          summary={selectedDay}
          vehicles={vehicles}
          onClose={() => setSelectedDay(null)}
          onPlan={async (vehicleId, notes) => {
            await planRide(selectedDay.date, vehicleId, notes);
            setSelectedDay(getDaySummary(selectedDay.date));
          }}
          onClear={async () => {
            await clearPlan(selectedDay.date);
            setSelectedDay(getDaySummary(selectedDay.date));
          }}
        />
      )}
    </Card>
  );
}

function DayPlanSheet({
  summary,
  vehicles,
  onClose,
  onPlan,
  onClear,
}: {
  summary: CalendarDaySummary;
  vehicles: Vehicle[];
  onClose: () => void;
  onPlan: (vehicleId: string, notes?: string) => Promise<void>;
  onClear: () => Promise<void>;
}) {
  const [selectedVehicle, setSelectedVehicle] = useState<string>(
    summary.plannedRide?.vehicle_id ?? vehicles[0]?.id ?? ""
  );
  const [notes, setNotes] = useState<string>(summary.plannedRide?.notes ?? "");
  const [saving, setSaving] = useState(false);

  const formattedDate = new Date(summary.date + "T00:00:00").toLocaleDateString(undefined, {
    weekday: "long",
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  const save = async () => {
    if (!selectedVehicle) return;
    setSaving(true);
    await onPlan(selectedVehicle, notes);
    setSaving(false);
    onClose();
  };

  const remove = async () => {
    setSaving(true);
    await onClear();
    setSaving(false);
    onClose();
  };

  return (
    <Sheet
      onClose={onClose}
      title={summary.isToday ? `Today's Ride · ${formattedDate}` : formattedDate}
      subtitle={summary.isFuture || summary.isToday ? "Choose which bike you will ride on this day." : "Day summary & bike assignment"}
    >
      <div className="u-col u-gap-4">
        {vehicles.length === 0 ? (
          <p className="u-text-sm u-ink-muted">Add a vehicle to your garage to plan rides.</p>
        ) : (
          <div>
            <label htmlFor="plan-vehicle">Planned bike</label>
            <div className="u-row u-gap-2 u-row-wrap" style={{ marginTop: 6 }}>
              {vehicles.map((v) => (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => setSelectedVehicle(v.id)}
                  className={"pill-btn " + (selectedVehicle === v.id ? "is-active" : "")}
                >
                  <Icon name="bike" size="sm" />
                  {v.name}
                </button>
              ))}
            </div>
          </div>
        )}

        <div>
          <label htmlFor="plan-notes">Notes (optional)</label>
          <input
            id="plan-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g. Office commute, highway trip, tyre check"
          />
        </div>

        {summary.totalSpend > 0 && (
          <div className="card card--surface" style={{ padding: "var(--s-3)" }}>
            <div className="u-row u-row-between">
              <span className="u-text-sm">Expenses logged:</span>
              <strong>{formatCurrency(summary.totalSpend)} ({summary.expenseCount} entries)</strong>
            </div>
          </div>
        )}

        <div className="sheet__actions u-row u-row-between">
          <div>
            {summary.plannedRide && (
              <Button variant="danger" size="sm" onClick={remove} disabled={saving}>
                Remove plan
              </Button>
            )}
          </div>
          <div className="u-row u-gap-2">
            <Button variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button variant="primary" onClick={save} disabled={saving || !selectedVehicle}>
              {saving ? "Saving…" : summary.isToday ? "Set as today's bike" : "Save plan"}
            </Button>
          </div>
        </div>
      </div>
    </Sheet>
  );
}

/**
 * Compact widget for Dashboard showing today's planned or active bike.
 */
export function TodayRideWidget({ onOpenCalendar }: { onOpenCalendar?: () => void }) {
  const { vehicles } = useVehicles();
  const { todayPlan, getDaySummary, planRide } = useRideCalendar();
  const [sheetOpen, setSheetOpen] = useState(false);

  const todayIso = new Date().toISOString().slice(0, 10);
  const todaySummary = getDaySummary(todayIso);
  const activeVehicleId = todayPlan?.vehicle_id ?? todaySummary.riddenVehicleIds[0] ?? null;
  const currentVehicle = vehicles.find((v) => v.id === activeVehicleId);

  return (
    <>
      <Card variant={currentVehicle ? "accent" : "default"} className="bento__6">
        <div className="u-row u-row-between" style={{ marginBottom: 8 }}>
          <div className="u-row u-gap-2">
            <Icon name="calendar" size="sm" />
            <h4 style={{ margin: 0 }}>Today's ride</h4>
          </div>
          {onOpenCalendar && (
            <button
              type="button"
              onClick={onOpenCalendar}
              className="u-ink-muted u-text-xs"
              style={{ background: "none", border: 0, padding: 0, cursor: "pointer", textDecoration: "underline" }}
            >
              Open calendar
            </button>
          )}
        </div>

        {currentVehicle ? (
          <div className="u-row u-row-between" style={{ alignItems: "center", gap: 12 }}>
            <div className="u-col u-gap-1">
              <span className="u-text-xs u-ink-muted">You are riding:</span>
              <strong style={{ fontSize: "var(--t-md)" }}>{currentVehicle.name}</strong>
              {todayPlan?.notes && <span className="u-text-xs u-ink-muted">"{todayPlan.notes}"</span>}
            </div>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setSheetOpen(true)}
            >
              Switch bike
            </Button>
          </div>
        ) : (
          <div className="u-row u-row-between" style={{ alignItems: "center" }}>
            <div className="u-col u-gap-1">
              <span className="u-text-sm u-ink-muted">No bike scheduled for today</span>
            </div>
            <Button size="sm" variant="primary" onClick={() => setSheetOpen(true)}>
              <Icon name="plus" size="sm" /> Choose bike
            </Button>
          </div>
        )}
      </Card>

      {sheetOpen && (
        <Sheet
          onClose={() => setSheetOpen(false)}
          title="Select today's bike"
          subtitle="Choose the bike you are riding today. This syncs with NFC and fuel logs."
        >
          <div className="u-col u-gap-3">
            {vehicles.map((v) => (
              <button
                key={v.id}
                type="button"
                className={"card u-row u-row-between " + (v.id === currentVehicle?.id ? "card--accent" : "")}
                style={{ textAlign: "left", cursor: "pointer", padding: "var(--s-3) var(--s-4)" }}
                onClick={async () => {
                  const todayIso = new Date().toISOString().slice(0, 10);
                  await planRide(todayIso, v.id);
                  setSheetOpen(false);
                }}
              >
                <div>
                  <strong>{v.name}</strong>
                  <div className="u-text-xs u-ink-muted">{[v.make, v.model].filter(Boolean).join(" ")}</div>
                </div>
                {v.id === currentVehicle?.id && <Chip variant="on-accent">Current</Chip>}
              </button>
            ))}
          </div>
        </Sheet>
      )}
    </>
  );
}
