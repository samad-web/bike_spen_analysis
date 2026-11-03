import { useState } from "react";
import { Button, Card, Icon, Sheet } from "@/app/ui";
import { computeReminderStatus, useMaintenanceReminders, type MaintenanceReminder, type ScheduleType } from "./useMaintenanceReminders";

const COMMON_PRESETS = [
  { label: "Oil change", schedule_type: "both" as ScheduleType, interval_km: 3000, interval_days: 180 },
  { label: "Chain lube", schedule_type: "odometer" as ScheduleType, interval_km: 500 },
  { label: "Air filter", schedule_type: "odometer" as ScheduleType, interval_km: 10000 },
  { label: "Brake pads", schedule_type: "odometer" as ScheduleType, interval_km: 15000 },
  { label: "Insurance", schedule_type: "date" as ScheduleType, interval_days: 365 },
  { label: "PUC",       schedule_type: "date" as ScheduleType, interval_days: 180 },
];

interface Props {
  vehicleId: string;
  /** Not shown — kept so the caller can pass the vehicle context in case
   * future reminder rows want to say "oil change for Classic 350". */
  vehicleName?: string;
  lastOdometer: number | null;
}

export function MaintenanceReminders({ vehicleId, lastOdometer }: Props) {
  const { reminders, loading, create, markDone, remove } = useMaintenanceReminders(vehicleId);
  const [open, setOpen] = useState(false);

  return (
    <Card >
      <div className="u-row u-row-between" style={{ marginBottom: 12 }}>
        <h3>Maintenance schedule</h3>
        <Button variant="ghost" className="btn--sm" onClick={() => setOpen(true)}>
          <Icon name="plus" size={14}/> Add
        </Button>
      </div>
      {loading ? <p className="u-ink-muted u-text-sm">Loading…</p> : reminders.length === 0 ? (
        <div style={{ textAlign: "center", padding: "16px 0" }}>
          <p className="u-ink-muted u-text-sm" style={{ marginBottom: 12 }}>
            No reminders yet. Add oil changes, insurance renewal, PUC, and MotoPulse will tell you when they're due.
          </p>
          <Button variant="ghost" className="btn--sm" onClick={() => setOpen(true)}>Set up reminders</Button>
        </div>
      ) : (
        <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
          {reminders.map((r) => <ReminderRow key={r.id} r={r} currentOdometer={lastOdometer}
            onDone={() => void markDone(r.id, lastOdometer)}
            onDelete={() => void remove(r.id)}
          />)}
        </ul>
      )}

      {open && <AddReminderSheet onClose={() => setOpen(false)}
        onSave={async (r) => { const res = await create(r); if (!res.error) setOpen(false); return res; }}/>}
    </Card>
  );
}

function ReminderRow({ r, currentOdometer, onDone, onDelete }: {
  r: MaintenanceReminder;
  currentOdometer: number | null;
  onDone: () => void;
  onDelete: () => void;
}) {
  const s = computeReminderStatus(r, currentOdometer);
  const color = s.status === "overdue" ? "var(--status-crit)"
              : s.status === "due_soon" ? "var(--status-warn)"
              : s.status === "ok" ? "var(--status-good)"
              : "var(--ink-muted)";
  const pct = Math.min(100, s.progress * 100);

  return (
    <li style={{ padding: "14px 0", borderBottom: "1px solid var(--divider)" }}>
      <div className="u-row u-row-between" style={{ marginBottom: 8 }}>
        <div>
          <div style={{ fontWeight: 600 }}>{r.label}</div>
          <div className="u-ink-muted u-text-xs">{s.dueText}</div>
        </div>
        <div className="u-row" style={{ gap: 6 }}>
          <span className="chip" style={{ background: `${color}22`, color }}>
            {s.status === "overdue" ? "Overdue" : s.status === "due_soon" ? "Due soon" : s.status === "ok" ? "On track" : "Not set"}
          </span>
          <button type="button" onClick={onDone} className="btn btn--ghost btn--sm" title="Mark done today">
            <Icon name="check" size={14}/>
          </button>
          <button type="button" onClick={onDelete} className="btn btn--ghost btn--sm" title="Remove">
            <Icon name="trash" size={14}/>
          </button>
        </div>
      </div>
      <div style={{ height: 4, background: "var(--surface-alt)", borderRadius: 999, overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${pct}%`, background: color, transition: "width 0.3s" }}/>
      </div>
    </li>
  );
}

function AddReminderSheet({ onClose, onSave }: {
  onClose: () => void;
  onSave: (r: Omit<MaintenanceReminder, "id" | "vehicle_id">) => Promise<{ error: string | null }>;
}) {
  const [label, setLabel] = useState("");
  const [schedule, setSchedule] = useState<ScheduleType>("odometer");
  const [km, setKm] = useState("");
  const [days, setDays] = useState("");
  const [lastKm, setLastKm] = useState("");
  const [lastDate, setLastDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [saving, setSaving] = useState(false);

  const applyPreset = (p: typeof COMMON_PRESETS[number]) => {
    setLabel(p.label);
    setSchedule(p.schedule_type);
    if (p.interval_km) setKm(String(p.interval_km));
    if (p.interval_days) setDays(String(p.interval_days));
  };

  const save = async () => {
    if (!label || saving) return;
    setSaving(true);
    await onSave({
      label,
      schedule_type: schedule,
      interval_km: schedule !== "date" && km ? Number(km) : null,
      interval_days: schedule !== "odometer" && days ? Number(days) : null,
      last_done_odometer: schedule !== "date" && lastKm ? Number(lastKm) : null,
      last_done_date: schedule !== "odometer" ? lastDate : null,
      notes: null,
    });
    setSaving(false);
  };

  return (
    <Sheet onClose={onClose}>
      <h3 style={{ marginBottom: 4 }}>Add reminder</h3>
      <p className="u-ink-muted u-text-sm" style={{ marginBottom: 20 }}>Pick a common one or roll your own.</p>

      <div className="scroll-x" style={{ marginBottom: 20 }}>
        {COMMON_PRESETS.map((p) => (
          <button key={p.label} type="button" onClick={() => applyPreset(p)}
            className="chip" style={{ cursor: "pointer", padding: "8px 14px", fontSize: 13 }}>
            {p.label}
          </button>
        ))}
      </div>

      <label htmlFor="r-label">What are you tracking?</label>
      <input id="r-label" value={label} onChange={(e) => setLabel(e.target.value)} placeholder="e.g. Oil change"/>

      <label htmlFor="r-schedule">Scheduled by</label>
      <select id="r-schedule" value={schedule} onChange={(e) => setSchedule(e.target.value as ScheduleType)}>
        <option value="odometer">Odometer (every N km)</option>
        <option value="date">Date (every N days)</option>
        <option value="both">Both (whichever comes first)</option>
      </select>

      {schedule !== "date" && (
        <div className="u-row" style={{ gap: 12 }}>
          <div style={{ flex: 1 }}>
            <label htmlFor="r-km">Every (km)</label>
            <input id="r-km" type="number" value={km} onChange={(e) => setKm(e.target.value)} placeholder="3000"/>
          </div>
          <div style={{ flex: 1 }}>
            <label htmlFor="r-lkm">Last done at (km)</label>
            <input id="r-lkm" type="number" value={lastKm} onChange={(e) => setLastKm(e.target.value)} placeholder="12000"/>
          </div>
        </div>
      )}
      {schedule !== "odometer" && (
        <div className="u-row" style={{ gap: 12 }}>
          <div style={{ flex: 1 }}>
            <label htmlFor="r-days">Every (days)</label>
            <input id="r-days" type="number" value={days} onChange={(e) => setDays(e.target.value)} placeholder="180"/>
          </div>
          <div style={{ flex: 1 }}>
            <label htmlFor="r-ld">Last done on</label>
            <input id="r-ld" type="date" value={lastDate} onChange={(e) => setLastDate(e.target.value)}/>
          </div>
        </div>
      )}

      <div className="u-row" style={{ marginTop: 24, gap: 10 }}>
        <Button variant="ghost" onClick={onClose} className="btn--sm">Cancel</Button>
        <Button onClick={save} disabled={!label || saving}>
          {saving ? "Saving…" : "Add reminder"}
        </Button>
      </div>
    </Sheet>
  );
}
