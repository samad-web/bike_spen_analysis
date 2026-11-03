/**
 * Pull a human-readable string out of ANY thrown value.
 *
 * The naive `errorMessage(err)` returns
 * `"[object Object]"` for Supabase PostgrestError payloads, which are plain
 * objects with `.message`, `.details`, `.hint`, `.code` fields — not Error
 * instances. We also want to flatten AggregateError, drill into nested
 * `.error`, and preserve the Postgres hint when present.
 */
export function errorMessage(err: unknown): string {
  if (err == null) return "Unknown error";
  if (typeof err === "string") return err;
  if (err instanceof Error) return err.message;

  const obj = err as Record<string, unknown>;
  const parts: string[] = [];
  if (typeof obj.message === "string") parts.push(obj.message);
  if (typeof obj.details === "string" && obj.details !== obj.message) parts.push(obj.details);
  if (typeof obj.hint === "string") parts.push(`(hint: ${obj.hint})`);
  if (parts.length > 0) return parts.join(" · ");

  // Drill one level into { error: ... } wrappers.
  if (obj.error && typeof obj.error === "object") return errorMessage(obj.error);

  try {
    return JSON.stringify(obj);
  } catch {
    return String(err);
  }
}
