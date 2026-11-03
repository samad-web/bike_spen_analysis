import { useEffect, useState } from "react";
import { errorMessage } from "@/lib/errors";
import { fetchTagEvents, type TagEventRow } from "./useTagEvents";

interface Props {
  vehicleId: string;
  vehicleName: string;
}

/** Audit log for a vehicle's NFC tag history (build-docs/features/nfc-tools.md
 * TagHistoryScreen). Read-only. */
export function TagHistoryScreen({ vehicleId, vehicleName }: Props) {
  const [events, setEvents] = useState<TagEventRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const rows = await fetchTagEvents(vehicleId);
        if (!cancelled) setEvents(rows);
      } catch (err) {
        if (!cancelled) setError(errorMessage(err));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [vehicleId]);

  if (loading) return <p>Loading history...</p>;
  if (error) return <p role="alert">{error}</p>;
  if (events.length === 0) return <p>No NFC events for {vehicleName} yet.</p>;

  return (
    <div className="tag-history">
      <h2>NFC history for {vehicleName}</h2>
      <ol>
        {events.map((e) => (
          <li key={e.id}>
            <time dateTime={e.created_at}>{new Date(e.created_at).toLocaleString()}</time>
            {" — "}
            <strong>{labelFor(e.event_type)}</strong>
            {e.tag_token && <span> (token …{e.tag_token.slice(-6)})</span>}
            {e.tag_uid && <span> UID {e.tag_uid}</span>}
          </li>
        ))}
      </ol>
    </div>
  );
}

function labelFor(type: TagEventRow["event_type"]): string {
  switch (type) {
    case "scanned":
      return "Scanned";
    case "written":
      return "Tag written";
    case "erased":
      return "Tag erased";
    case "formatted":
      return "Tag formatted";
    case "replaced":
      return "Tag replaced";
    case "locked":
      return "Tag locked (permanent)";
    case "password_set":
      return "Password set";
    case "password_removed":
      return "Password removed";
    case "write_failed":
      return "Write failed";
  }
}
