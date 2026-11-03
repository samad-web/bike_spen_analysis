import { supabase } from "@/lib/supabase";

/**
 * Uploads a vehicle photo to the `vehicle-photos` Supabase storage bucket.
 *
 * The bucket is public-read (so <img src=> works without signing); writes
 * are gated by RLS so a user can only write to objects under their own
 * uid folder (`<user_id>/<vehicle_id>.<ext>`).
 *
 * Background removal is applied CLIENT-SIDE via `@imgly/background-removal`
 * before upload — a ~5MB WASM/ONNX model runs in a Web Worker, so no API
 * call, no vendor cost, no server round-trip. We import it lazily (dynamic
 * import) so the ~5MB model only downloads when the user actually opens
 * the photo upload sheet.
 */
export interface UploadResult {
  photoUrl: string;
  thumbnailUrl: string;
}

export async function uploadVehiclePhoto(opts: {
  file: File;
  userId: string;
  vehicleId: string;
  removeBackground: boolean;
  onProgress?: (phase: "loading-model" | "removing-bg" | "uploading", pct: number) => void;
}): Promise<UploadResult> {
  const { file, userId, vehicleId, removeBackground, onProgress } = opts;

  let bodyBlob: Blob = file;
  if (removeBackground) {
    onProgress?.("loading-model", 0);
    // Lazy import — avoids pulling the 5MB WASM into the main bundle.
    const bg = await import("@imgly/background-removal");
    onProgress?.("removing-bg", 10);
    bodyBlob = await bg.removeBackground(file, {
      output: { format: "image/png", quality: 0.9 },
      progress: (_, done, total) => {
        if (total > 0) onProgress?.("removing-bg", Math.min(90, 10 + (done / total) * 80));
      },
    });
  }

  const ext = removeBackground ? "png" : fileExt(file.name) || "jpg";
  const path = `${userId}/${vehicleId}.${ext}`;

  onProgress?.("uploading", 95);
  const { error: upErr } = await supabase.storage.from("vehicle-photos").upload(path, bodyBlob, {
    cacheControl: "3600",
    upsert: true,
    contentType: removeBackground ? "image/png" : (file.type || "image/jpeg"),
  });
  if (upErr) throw upErr;

  const { data } = supabase.storage.from("vehicle-photos").getPublicUrl(path);
  const cacheBust = `?v=${Date.now()}`;
  const photoUrl = data.publicUrl + cacheBust;

  // We don't server-side resize for the thumbnail — Supabase's image transform
  // addon would be ideal but requires a paid plan. The dashboard just reuses
  // the same URL at a smaller rendered size for now; a future pass can
  // generate a 256px thumbnail client-side.
  return { photoUrl, thumbnailUrl: photoUrl };
}

function fileExt(name: string): string {
  const i = name.lastIndexOf(".");
  return i >= 0 ? name.slice(i + 1).toLowerCase() : "";
}
