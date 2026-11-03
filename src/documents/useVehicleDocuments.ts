import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export type DocType = "insurance" | "puc" | "rc" | "service_invoice" | "warranty" | "other";

export interface VehicleDocument {
  id: string;
  vehicle_id: string;
  doc_type: DocType;
  label: string | null;
  storage_path: string;
  mime_type: string | null;
  file_size_bytes: number | null;
  expires_on: string | null;
  issued_on: string | null;
  created_at: string;
}

export function useVehicleDocuments(vehicleId: string | null) {
  const [documents, setDocuments] = useState<VehicleDocument[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!vehicleId) { setDocuments([]); setLoading(false); return; }
    setLoading(true);
    const { data } = await supabase
      .from("vehicle_documents")
      .select("id, vehicle_id, doc_type, label, storage_path, mime_type, file_size_bytes, expires_on, issued_on, created_at")
      .eq("vehicle_id", vehicleId)
      .is("deleted_at", null)
      .order("created_at", { ascending: false });
    setDocuments((data ?? []) as VehicleDocument[]);
    setLoading(false);
  }, [vehicleId]);

  useEffect(() => { void refresh(); }, [refresh]);

  const upload = useCallback(async (opts: {
    userId: string;
    file: File;
    docType: DocType;
    label?: string;
    issuedOn?: string | null;
    expiresOn?: string | null;
  }) => {
    if (!vehicleId) return { error: "no vehicle" };
    const ext = fileExt(opts.file.name) || "pdf";
    const path = `${opts.userId}/${vehicleId}/${opts.docType}-${Date.now()}.${ext}`;
    const { error: upErr } = await supabase.storage.from("vehicle-docs").upload(path, opts.file, {
      contentType: opts.file.type || "application/octet-stream",
      upsert: false,
    });
    if (upErr) return { error: upErr.message };

    // vehicle_documents.user_id is NOT NULL + RLS insert check requires it
    const { error: dbErr } = await supabase.from("vehicle_documents").insert({
      vehicle_id: vehicleId,
      user_id: opts.userId,
      doc_type: opts.docType,
      label: opts.label ?? null,
      storage_path: path,
      mime_type: opts.file.type || null,
      file_size_bytes: opts.file.size,
      expires_on: opts.expiresOn ?? null,
      issued_on: opts.issuedOn ?? null,
    });
    if (dbErr) {
      // Roll back the object we just uploaded so no orphaned storage object remains.
      await supabase.storage.from("vehicle-docs").remove([path]);
      return { error: dbErr.message };
    }
    await refresh();
    return { error: null };
  }, [vehicleId, refresh]);

  const remove = useCallback(async (doc: VehicleDocument) => {
    await supabase.from("vehicle_documents").update({ deleted_at: new Date().toISOString() }).eq("id", doc.id);
    // Soft-delete only for the DB row; the storage object stays until a scheduled sweep.
    await refresh();
  }, [refresh]);

  const signedUrl = useCallback(async (doc: VehicleDocument): Promise<string | null> => {
    const { data } = await supabase.storage.from("vehicle-docs").createSignedUrl(doc.storage_path, 300);
    return data?.signedUrl ?? null;
  }, []);

  return { documents, loading, upload, remove, signedUrl };
}

function fileExt(name: string): string {
  const i = name.lastIndexOf(".");
  return i >= 0 ? name.slice(i + 1).toLowerCase() : "";
}

/** Days until an expiry (negative = overdue). null when no expiry set. */
export function daysUntilExpiry(expiresOn: string | null, today = new Date()): number | null {
  if (!expiresOn) return null;
  const t = new Date(expiresOn);
  return Math.floor((t.getTime() - startOfDay(today).getTime()) / 86400000);
}

function startOfDay(d: Date): Date {
  const r = new Date(d);
  r.setHours(0, 0, 0, 0);
  return r;
}
