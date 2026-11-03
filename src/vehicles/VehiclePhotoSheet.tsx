import { useRef, useState } from "react";
import { errorMessage } from "@/lib/errors";
import { Button, Icon, Sheet } from "@/app/ui";
import { useAuth } from "@/auth/AuthContext";
import { useVehicles } from "./useVehicles";
import { uploadVehiclePhoto } from "./photoUpload";

interface Props {
  vehicleId: string;
  vehicleName: string;
  onClose: () => void;
}

/**
 * Photo upload sheet with client-side background removal.
 *
 * UX: pick a photo, preview, choose remove-bg (default on), see progress,
 * get it saved to the vehicle. The @imgly WASM model is lazy-loaded by
 * photoUpload.ts so the main bundle stays slim.
 */
export function VehiclePhotoSheet({ vehicleId, vehicleName, onClose }: Props) {
  const { session } = useAuth();
  const { updateVehicle } = useVehicles();
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [removeBg, setRemoveBg] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [phase, setPhase] = useState<string>("");
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const handlePick = (f: File | null) => {
    setError(null);
    setFile(f);
    if (f) {
      const url = URL.createObjectURL(f);
      setPreview(url);
    } else {
      setPreview(null);
    }
  };

  const handleUpload = async () => {
    if (!file || !session?.user.id) return;
    setUploading(true);
    setError(null);
    try {
      const { photoUrl, thumbnailUrl } = await uploadVehiclePhoto({
        file,
        userId: session.user.id,
        vehicleId,
        removeBackground: removeBg,
        onProgress: (p, pct) => {
          setPhase(p === "loading-model" ? "Loading AI model…"
                  : p === "removing-bg"  ? "Removing background…"
                  : "Uploading…");
          setProgress(pct);
        },
      });
      await updateVehicle(vehicleId, {
        photo_url: photoUrl,
        thumbnail_url: thumbnailUrl,
      });
      onClose();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setUploading(false);
    }
  };

  return (
    <Sheet onClose={onClose}>
      <h3 style={{ marginBottom: 4 }}>Photo for {vehicleName}</h3>
      <p className="u-ink-muted u-text-sm" style={{ marginBottom: 20 }}>
        A clear side-on photo looks best. We can cut out the background for you so the bike floats on the card.
      </p>

      <div style={{
        aspectRatio: "4/3",
        borderRadius: 20,
        border: "2px dashed var(--border)",
        display: "flex", alignItems: "center", justifyContent: "center",
        position: "relative", overflow: "hidden",
        background: preview ? "transparent" : "var(--surface-alt)",
      }}>
        {preview
          ? <img src={preview} alt="" style={{ width: "100%", height: "100%", objectFit: "contain" }}/>
          : (
            <div style={{ textAlign: "center", color: "var(--ink-muted)" }}>
              <Icon name="camera" size={28} />
              <p className="u-text-sm" style={{ marginTop: 8 }}>Pick a photo</p>
            </div>
          )
        }
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={(e) => handlePick(e.target.files?.[0] ?? null)}
          style={{ position: "absolute", inset: 0, opacity: 0, cursor: "pointer" }}
          aria-label="Choose photo"
        />
      </div>

      <label className="u-row" style={{ gap: 10, marginTop: 20, alignItems: "center" }}>
        <input type="checkbox" checked={removeBg} onChange={(e) => setRemoveBg(e.target.checked)}
          style={{ width: 18, height: 18, minHeight: 0, margin: 0 }}/>
        <span>Remove background (runs locally on your device)</span>
      </label>

      {uploading && (
        <div style={{ marginTop: 20 }}>
          <p className="u-text-sm" style={{ marginBottom: 6 }}>{phase}</p>
          <div style={{ height: 6, background: "var(--surface-alt)", borderRadius: 3, overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${progress}%`, background: "var(--accent-500)", transition: "width 0.3s" }}/>
          </div>
        </div>
      )}

      {error && <p role="alert" style={{ marginTop: 16 }}>{error}</p>}

      <div className="u-row" style={{ marginTop: 24, gap: 10 }}>
        <Button variant="ghost" onClick={onClose} className="btn--sm">Cancel</Button>
        <Button onClick={handleUpload} disabled={!file || uploading}>
          {uploading ? "Working…" : "Save photo"}
          <Icon name="check" size={16}/>
        </Button>
      </div>
    </Sheet>
  );
}
