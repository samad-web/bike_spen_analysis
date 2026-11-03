/**
 * CSV + PDF report generation. Both run entirely in the browser — no server,
 * no download of the user's data to a third party.
 *
 * CSV: Spreadsheet-compatible, RFC-4180 quoting. Works in Excel/Numbers/Sheets.
 * PDF: jsPDF, lazy-imported so the ~140KB library only loads when a user
 *      actually clicks "Download PDF" — not in the main bundle.
 */

export interface ExportableExpense {
  expense_date: string;
  vehicle_name: string;
  category: "fuel" | "maintenance";
  total_amount: number;
  litres: number | null;
  price_per_litre: number | null;
  odometer_reading: number | null;
  payment_method: string;
  notes: string | null;
}

/* ---------------------------------------------------------------- CSV */

/** Properly quotes a field per RFC 4180. */
function csvCell(v: unknown): string {
  if (v == null) return "";
  const s = String(v);
  // Quote if it contains comma, double-quote, or newline; escape embedded " as ""
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function expensesToCsv(rows: ExportableExpense[]): string {
  const header = [
    "Date", "Vehicle", "Category", "Amount", "Litres", "Price per litre",
    "Odometer", "Payment", "Notes",
  ];
  const lines = [header.join(",")];
  for (const r of rows) {
    lines.push([
      csvCell(r.expense_date),
      csvCell(r.vehicle_name),
      csvCell(r.category),
      csvCell(r.total_amount.toFixed(2)),
      csvCell(r.litres ?? ""),
      csvCell(r.price_per_litre ?? ""),
      csvCell(r.odometer_reading ?? ""),
      csvCell(r.payment_method),
      csvCell(r.notes ?? ""),
    ].join(","));
  }
  // UTF-8 BOM so Excel on Windows picks up unicode (e.g. ₹) correctly
  return "﻿" + lines.join("\r\n");
}

export function downloadCsv(filename: string, csv: string): void {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  triggerDownload(blob, filename);
}

/* ---------------------------------------------------------------- PDF */

export interface PdfReportOptions {
  title: string;
  subtitle?: string;
  rangeLabel?: string;
  rows: ExportableExpense[];
  summary?: { label: string; value: string }[];
  currency?: "INR" | "USD";
}

export async function downloadPdfReport(opts: PdfReportOptions): Promise<void> {
  // Lazy import — keep the 140KB jsPDF out of the main bundle.
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "pt", format: "a4" });

  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 40;
  let y = margin;

  // Header band
  doc.setFillColor(245, 184, 0);
  doc.rect(0, 0, pageW, 60, "F");
  doc.setTextColor(26, 26, 26);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text("MotoPulse", margin, 38);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(opts.rangeLabel ?? "Spend report", pageW - margin, 38, { align: "right" });

  y = 90;
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text(opts.title, margin, y);
  if (opts.subtitle) {
    y += 18;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(opts.subtitle, margin, y);
  }
  y += 24;

  // Summary pills
  if (opts.summary && opts.summary.length > 0) {
    const colW = (pageW - margin * 2) / Math.min(opts.summary.length, 4);
    opts.summary.slice(0, 4).forEach((s, i) => {
      const x = margin + i * colW;
      doc.setDrawColor(220);
      doc.setFillColor(248, 247, 244);
      doc.roundedRect(x, y, colW - 8, 54, 8, 8, "FD");
      doc.setFontSize(8);
      doc.setTextColor(120);
      doc.text(s.label.toUpperCase(), x + 10, y + 16);
      doc.setFontSize(14);
      doc.setTextColor(26, 26, 26);
      doc.setFont("helvetica", "bold");
      doc.text(s.value, x + 10, y + 38);
      doc.setFont("helvetica", "normal");
    });
    y += 72;
  }

  // Table
  const colX = [margin, margin + 70, margin + 170, margin + 260, margin + 330, margin + 400, margin + 470];
  const headers = ["Date", "Vehicle", "Category", "Amount", "Litres", "₹/L", "Payment"];
  doc.setFillColor(26, 26, 26);
  doc.rect(margin, y, pageW - margin * 2, 24, "F");
  doc.setTextColor(240);
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  headers.forEach((h, i) => doc.text(h, colX[i] + 4, y + 16));
  y += 24;

  doc.setFont("helvetica", "normal");
  doc.setTextColor(26, 26, 26);
  doc.setFontSize(9);

  for (const r of opts.rows) {
    if (y > pageH - margin - 20) {
      doc.addPage();
      y = margin;
    }
    doc.setDrawColor(240);
    doc.line(margin, y + 20, pageW - margin, y + 20);
    const cells = [
      r.expense_date,
      truncate(r.vehicle_name, 14),
      r.category,
      formatAmount(r.total_amount, opts.currency ?? "INR"),
      r.litres != null ? r.litres.toFixed(2) : "—",
      r.price_per_litre != null ? r.price_per_litre.toFixed(2) : "—",
      r.payment_method,
    ];
    cells.forEach((c, i) => doc.text(String(c), colX[i] + 4, y + 14));
    y += 20;
  }

  // Footer
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(140);
    doc.text(`MotoPulse · Generated ${new Date().toLocaleDateString()}`, margin, pageH - 20);
    doc.text(`Page ${i} / ${pageCount}`, pageW - margin, pageH - 20, { align: "right" });
  }

  const stamp = new Date().toISOString().slice(0, 10);
  doc.save(`motopulse-report-${stamp}.pdf`);
}

/* ---------------------------------------------------------------- helpers */

function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.style.display = "none";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  // Give the browser a tick before releasing the blob — Safari needs this.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function truncate(s: string, n: number): string {
  return s.length > n ? s.slice(0, n - 1) + "…" : s;
}

function formatAmount(n: number, cur: "INR" | "USD"): string {
  const sym = cur === "INR" ? "₹" : "$";
  return sym + n.toLocaleString(undefined, { maximumFractionDigits: 2 });
}
