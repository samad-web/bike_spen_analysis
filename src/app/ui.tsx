import { type ReactNode, type SVGProps, useEffect } from "react";

/* ============================================================================
   Primitives — thin wrappers over the CSS classes in app.css.
   No inline styles here. If a visual decision belongs anywhere, it belongs
   in app.css so the design system shows through, not in the component.
   ============================================================================ */

type Variant = "default" | "dark" | "accent";

export function Card({ children, variant = "default", className = "", flush, ...rest }: {
  children: ReactNode;
  variant?: Variant;
  flush?: boolean;
  className?: string;
  [k: string]: unknown;
}) {
  const cls = [
    "card",
    variant === "dark" ? "card--dark" : "",
    variant === "accent" ? "card--accent" : "",
    flush ? "card--flush" : "",
    className,
  ].filter(Boolean).join(" ");
  return <div className={cls} {...rest}>{children}</div>;
}

export function Glass({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`glass ${className}`}>{children}</div>;
}

export function StatTile({ label, value, delta, variant = "default" }: {
  label: string;
  value: string | number;
  delta?: string;
  variant?: Variant;
}) {
  const cls = ["stat", variant === "accent" ? "stat--accent" : "", variant === "dark" ? "stat--dark" : ""].filter(Boolean).join(" ");
  return (
    <div className={cls}>
      <div className="stat__label">{label}</div>
      <div className="stat__value">{value}</div>
      {delta && <div className="stat__delta">{delta}</div>}
    </div>
  );
}

type ChipVariant = "default" | "ink" | "accent" | "on-dark" | "on-accent" | "good" | "warn" | "crit";
export function Chip({ children, variant = "default" }: { children: ReactNode; variant?: ChipVariant }) {
  const cls = `chip${variant === "default" ? "" : ` chip--${variant}`}`;
  return <span className={cls}>{children}</span>;
}

export function Button({
  children,
  variant = "primary",
  size = "md",
  onClick,
  type = "button",
  disabled,
  className = "",
  iconOnly,
}: {
  children: ReactNode;
  variant?: "primary" | "ghost" | "dark" | "danger";
  size?: "md" | "sm";
  onClick?: () => void;
  type?: "button" | "submit";
  disabled?: boolean;
  className?: string;
  iconOnly?: boolean;
}) {
  const cls = [
    "btn",
    variant === "primary" ? "btn--primary" : "",
    variant === "ghost"   ? "btn--ghost"   : "",
    variant === "danger"  ? "btn--danger"  : "",
    size === "sm" ? "btn--sm" : "",
    iconOnly ? "btn--icon" : "",
    className,
  ].filter(Boolean).join(" ");
  return <button type={type} className={cls} onClick={onClick} disabled={disabled}>{children}</button>;
}

export function PillBtn({ children, active, accent, onClick, as, href }: {
  children: ReactNode;
  active?: boolean;
  accent?: boolean;
  onClick?: () => void;
  as?: "button" | "a" | "span";
  href?: string;
}) {
  const cls = ["pill-btn", accent ? "pill-btn--accent" : "", active ? "is-active" : ""].filter(Boolean).join(" ");
  if (as === "a") return <a className={cls} href={href}>{children}</a>;
  if (as === "span") return <span className={cls}>{children}</span>;
  return <button type="button" className={cls} onClick={onClick}>{children}</button>;
}

/**
 * Pill — backwards-compat alias used by screens still on the old API.
 * Maps `variant="dark"|"accent"` to the right PillBtn/Chip semantics.
 * New code should use <Chip> for read-only status pills or <PillBtn> for
 * clickable toggles.
 */
export function Pill({ children, variant, onClick, as, href }: {
  children: ReactNode;
  variant?: "default" | "accent" | "dark";
  onClick?: () => void;
  as?: "button" | "a" | "span";
  href?: string;
}) {
  // Read-only chip when rendered as span
  if (as === "span") {
    const cv: ChipVariant =
      variant === "accent" ? "accent" :
      variant === "dark"   ? "ink"    : "default";
    return <Chip variant={cv}>{children}</Chip>;
  }
  const accent = variant === "accent";
  const active = variant === "accent" || variant === "dark";
  return <PillBtn active={active} accent={accent} onClick={onClick} as={as} href={href}>{children}</PillBtn>;
}

export function Sheet({ children, onClose, title, subtitle }: {
  children: ReactNode;
  onClose: () => void;
  title?: string;
  subtitle?: string;
}) {
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => { document.body.style.overflow = prev; window.removeEventListener("keydown", onKey); };
  }, [onClose]);
  return (
    <div className="sheet-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <div className="sheet__handle" aria-hidden="true" />
        {title && <h3 className="sheet__title">{title}</h3>}
        {subtitle && <p className="sheet__subtitle">{subtitle}</p>}
        {children}
      </div>
    </div>
  );
}

export function Toast({ children, action }: { children: ReactNode; action?: { label: string; onClick: () => void } }) {
  return (
    <div className="toast" role="status">
      <span>{children}</span>
      {action && <button type="button" className="toast__action" onClick={action.onClick}>{action.label}</button>}
    </div>
  );
}

/* ------------------------------- icons ---------------------------------- */

/**
 * Icon sizing is LOCKED to the system:
 *   - "sm" = 14 (inline with text)
 *   - "md" = 18 (list rows, chip pairs, button leading)
 *   - "lg" = 22 (nav, large buttons)
 * No arbitrary numeric sizes allowed — picks a 3-point scale that
 * covers every usage and prevents the "icons at random sizes" smell.
 */
type IconSize = "sm" | "md" | "lg";
const ICON_PX: Record<IconSize, number> = { sm: 14, md: 18, lg: 22 };

/**
 * Icon accepts a semantic size ("sm"|"md"|"lg") or a legacy numeric value
 * (14..26 maps to sm/md/lg nearest). The numeric path is a bridge for
 * screens still being migrated to the semantic scale; new code should pass
 * "sm"/"md"/"lg".
 */
export function Icon({ name, size = "md", ...rest }: {
  name: IconName;
  size?: IconSize | number;
} & Omit<SVGProps<SVGSVGElement>, "size">) {
  const px = typeof size === "number"
    ? (size <= 14 ? 14 : size <= 18 ? 18 : 22)
    : ICON_PX[size];
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={px} height={px} viewBox="0 0 24 24"
      fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" {...rest}>
      {ICONS[name]}
    </svg>
  );
}

export type IconName = keyof typeof ICONS;
const ICONS = {
  home:        <><path d="M3 11.5 12 4l9 7.5V20a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1Z"/></>,
  garage:      <><path d="M3 11 12 4l9 7v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1Z"/><path d="M7 13h10M7 17h10"/></>,
  bike:        <><circle cx="5.5" cy="17.5" r="3.5"/><circle cx="18.5" cy="17.5" r="3.5"/><path d="M5.5 17.5 12 7l4 10.5"/><path d="M10 7h4"/></>,
  chart:       <><path d="M3 20V8M9 20v-6M15 20V4M21 20V12"/></>,
  nfc:         <><path d="M4 8a8 8 0 0 1 8-4"/><path d="M8 12a4 4 0 0 1 4-2"/><circle cx="12" cy="12" r="1.5"/><path d="M20 16a8 8 0 0 1-8 4"/><path d="M16 12a4 4 0 0 1-4 2"/></>,
  settings:    <><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06A2 2 0 1 1 4.37 16.9l.06-.06A1.65 1.65 0 0 0 4.76 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06A2 2 0 1 1 7.04 3.29l.06.06A1.65 1.65 0 0 0 9 3.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9c0 .67.39 1.27 1 1.51H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z"/></>,
  fuel:        <><rect x="3" y="4" width="10" height="16" rx="2"/><path d="M13 10h3a2 2 0 0 1 2 2v3"/><path d="M18 15a2 2 0 0 0 4 0v-3l-3-4"/></>,
  wrench:      <><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94L5.5 20.5a2.12 2.12 0 1 1-3-3l6.63-6.63a6 6 0 0 1 7.94-7.94l-3.76 3.76Z"/></>,
  plus:        <><path d="M12 5v14M5 12h14"/></>,
  arrow_right: <><path d="M5 12h14M13 5l7 7-7 7"/></>,
  arrow_left:  <><path d="M19 12H5M12 19l-7-7 7-7"/></>,
  check:       <><path d="M20 6 9 17l-5-5"/></>,
  camera:      <><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></>,
  calendar:    <><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></>,
  cash:        <><rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="2.5"/><path d="M6 10v4M18 10v4"/></>,
  card:        <><rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/></>,
  trash:       <><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></>,
  edit:        <><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5Z"/></>,
  bell:        <><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10 21a2 2 0 0 0 4 0"/></>,
  logout:      <><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="M16 17l5-5-5-5M21 12H9"/></>,
  search:      <><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></>,
  menu:        <><path d="M4 6h16M4 12h16M4 18h16"/></>,
  close:       <><path d="M18 6 6 18M6 6l12 12"/></>,
  download:    <><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="M7 10l5 5 5-5M12 15V3"/></>,
  share:       <><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="m8.59 13.51 6.83 3.98M15.41 6.51l-6.82 3.98"/></>,
  arrow_up:    <><path d="M12 19V5M5 12l7-7 7 7"/></>,
  arrow_down:  <><path d="M12 5v14M19 12l-7 7-7-7"/></>,
};
