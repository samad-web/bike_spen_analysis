import { useState } from "react";
import { Button, Card, Icon, Sheet } from "@/app/ui";
import { useAuth } from "@/auth/AuthContext";
import { daysUntilExpiry, useVehicleDocuments, type DocType, type VehicleDocument } from "./useVehicleDocuments";

const DOC_TYPES: { key: DocType; label: string }[] = [
  { key: "insurance",       label: "Insurance" },
  { key: "puc",             label: "PUC certificate" },
  { key: "rc",              label: "Registration (RC)" },
  { key: "service_invoice", label: "Service invoice" },
  { key: "warranty",        label: "Warranty" },
  { key: "other",           label: "Other" },
];

interface Props { vehicleId: string }

export function DocumentsCard({ vehicleId }: Props) {
  const { documents, loading, upload, remove, signedUrl } = useVehicleDocuments(vehicleId);
  const [addOpen, setAddOpen] = useState(false);

  return (
    <Card >
      <div className="u-row u-row-between" style={{ marginBottom: 12 }}>
        <h3>Documents</h3>
        <Button variant="ghost" className="btn--sm" onClick={() => setAddOpen(true)}>
          <Icon name="plus" size={14}/> Add
        </Button>
      </div>
      {loading ? <p className="u-ink-muted u-text-sm">Loading…</p> : documents.length === 0 ? (
        <p className="u-ink-muted u-text-sm">
          Keep insurance, PUC, RC, and service invoices here. We'll remind you before expiry.
        </p>
      ) : (
        <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
          {documents.map((d) => <DocRow key={d.id} doc={d} signedUrl={signedUrl} onDelete={() => void remove(d)}/>)}
        </ul>
      )}
      {addOpen && <AddDocumentSheet
        vehicleId={vehicleId}
        upload={upload}
        onClose={() => setAddOpen(false)}/>
      }
    </Card>
  );
}

function DocRow({ doc, signedUrl, onDelete }: {
  doc: VehicleDocument;
  signedUrl: (d: VehicleDocument) => Promise<string | null>;
  onDelete: () => void;
}) {
  const d = daysUntilExpiry(doc.expires_on);
  const status: { label: string; color: string } =
    d == null ? { label: "No expiry", color: "var(--ink-muted)" }
    : d < 0   ? { label: `Expired ${-d}d ago`, color: "var(--status-crit)" }
    : d <= 30 ? { label: `Expires in ${d}d`,   color: "var(--status-warn)" }
    :           { label: `Expires in ${d}d`,   color: "var(--status-good)" };

  const open = async () => {
    const url = await signedUrl(doc);
    if (url) window.open(url, "_blank", "noopener");
  };

  return (
    <li style={{ padding: "14px 0", borderBottom: "1px solid var(--divider)" }}>
      <div className="u-row u-row-between" style={{ marginBottom: 4 }}>
        <div className="u-row" style={{ gap: 12 }}>
          <span style={{
            width: 36, height: 36, borderRadius: 12,
            background: "var(--surface-alt)",
            display: "inline-flex", alignItems: "center", justifyContent: "center",
          }}>
            <Icon name={doc.mime_type?.startsWith("image/") ? "camera" : "download"} size={16}/>
          </span>
          <div>
            <div style={{ fontWeight: 600 }}>
              {DOC_TYPES.find((t) => t.key === doc.doc_type)?.label ?? doc.doc_type}
            </div>
            <div className="u-ink-muted u-text-xs">{doc.label ?? doc.storage_path.split("/").pop()}</div>
          </div>
        </div>
        <div className="u-row" style={{ gap: 6 }}>
          <span className="chip" style={{ background: `${status.color}22`, color: status.color }}>
            {status.label}
          </span>
          <button type="button" onClick={() => void open()} className="btn btn--ghost btn--sm" title="Open">
            <Icon name="download" size={14}/>
          </button>
          <button type="button" onClick={onDelete} className="btn btn--ghost btn--sm" title="Remove">
            <Icon name="trash" size={14}/>
          </button>
        </div>
      </div>
    </li>
  );
}

function AddDocumentSheet({ vehicleId, upload, onClose }: {
  vehicleId: string;
  upload: ReturnType<typeof useVehicleDocuments>["upload"];
  onClose: () => void;
}) {
  const { session } = useAuth();
  const [docType, setDocType] = useState<DocType>("insurance");
  const [label, setLabel] = useState("");
  const [issuedOn, setIssuedOn] = useState("");
  const [expiresOn, setExpiresOn] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Guard against vehicleId mismatches at render time — the hook keys off the
  // id it was created with, which is this vehicle's id by construction here.
  void vehicleId;

  const save = async () => {
    if (!file || !session?.user.id) return;
    setUploading(true);
    setError(null);
    const { error: upErr } = await upload({
      userId: session.user.id,
      file,
      docType,
      label: label || undefined,
      issuedOn: issuedOn || null,
      expiresOn: expiresOn || null,
    });
    setUploading(false);
    if (upErr) setError(upErr); else onClose();
  };

  return (
    <Sheet onClose={onClose}>
      <h3 style={{ marginBottom: 4 }}>Add a document</h3>
      <p className="u-ink-muted u-text-sm" style={{ marginBottom: 20 }}>
        PDFs or photos — up to 10MB. Stored privately in your Supabase account.
      </p>

      <label htmlFor="d-type">Type</label>
      <select id="d-type" value={docType} onChange={(e) => setDocType(e.target.value as DocType)}>
        {DOC_TYPES.map((t) => <option key={t.key} value={t.key}>{t.label}</option>)}
      </select>

      <label htmlFor="d-label">Label (optional)</label>
      <input id="d-label" value={label} onChange={(e) => setLabel(e.target.value)}
        placeholder="e.g. Policy #12345 · HDFC Ergo"/>

      <div className="u-row" style={{ gap: 12 }}>
        <div style={{ flex: 1 }}>
          <label htmlFor="d-issued">Issued on</label>
          <input id="d-issued" type="date" value={issuedOn} onChange={(e) => setIssuedOn(e.target.value)}/>
        </div>
        <div style={{ flex: 1 }}>
          <label htmlFor="d-exp">Expires on</label>
          <input id="d-exp" type="date" value={expiresOn} onChange={(e) => setExpiresOn(e.target.value)}/>
        </div>
      </div>

      <label htmlFor="d-file">File</label>
      <div style={{
        aspectRatio: "16/8",
        borderRadius: 20,
        border: "2px dashed var(--border)",
        display: "flex", alignItems: "center", justifyContent: "center",
        position: "relative", overflow: "hidden",
        background: "var(--surface-alt)",
      }}>
        <div style={{ textAlign: "center", color: "var(--ink-muted)" }}>
          <Icon name="download" size={24}/>
          <p className="u-text-sm" style={{ marginTop: 8 }}>
            {file ? file.name : "Tap to choose a PDF or photo"}
          </p>
        </div>
        <input
          id="d-file"
          type="file"
          accept="application/pdf,image/*"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          style={{ position: "absolute", inset: 0, opacity: 0, cursor: "pointer" }}
        />
      </div>

      {error && <p role="alert" style={{ marginTop: 12 }}>{error}</p>}

      <div className="u-row" style={{ marginTop: 24, gap: 10 }}>
        <Button variant="ghost" onClick={onClose} className="btn--sm">Cancel</Button>
        <Button onClick={save} disabled={!file || uploading}>
          {uploading ? "Uploading…" : "Save document"}
          <Icon name="check" size={16}/>
        </Button>
      </div>
    </Sheet>
  );
}
