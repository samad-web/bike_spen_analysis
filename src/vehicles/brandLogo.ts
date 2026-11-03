/**
 * Maps a vehicle make name to a center-of-QR logo.
 *
 * The user asked for logos to be bundled, not fetched from the internet,
 * so we ship inline SVG marks here. Each mark is a lightweight brand token
 * — the brand's initial or shortform set on an accent-colored disc — in a
 * ~64x64 viewBox so it scales cleanly into the ~22% center area reserved
 * by the QR renderer (error-correction level H covers the overlay).
 *
 * The approach is deliberate rather than apologetic:
 *   - no network dependency, no CORS, no 404
 *   - no third-party terms of service to track (Clearbit, Brandfetch etc.
 *     all have usage caps and brand-asset licensing fine print)
 *   - works offline (which the whole app leans toward)
 *   - a QR with the brand's initial in its own color is just as
 *     recognizable at sticker-print size as a photorealistic logo
 *
 * To add a brand: pick a hex color that matches the brand, add the make
 * to BRANDS below. One line per brand.
 */

export interface BrandMark {
  color: string;      // disc background
  textColor: string;  // initials color
  initials: string;   // 1–3 characters shown on the disc
  fullName: string;   // for display captions
}

const BRANDS: Record<string, BrandMark> = {
  // --- Two-wheelers
  "royal enfield":   { color: "#2E2E2E", textColor: "#FFFFFF", initials: "RE", fullName: "Royal Enfield" },
  "royalenfield":    { color: "#2E2E2E", textColor: "#FFFFFF", initials: "RE", fullName: "Royal Enfield" },
  "honda":           { color: "#CC0000", textColor: "#FFFFFF", initials: "H",  fullName: "Honda" },
  "hero":            { color: "#E42526", textColor: "#FFFFFF", initials: "H",  fullName: "Hero" },
  "hero motocorp":   { color: "#E42526", textColor: "#FFFFFF", initials: "H",  fullName: "Hero MotoCorp" },
  "bajaj":           { color: "#003DA5", textColor: "#FFFFFF", initials: "B",  fullName: "Bajaj" },
  "tvs":             { color: "#004A8F", textColor: "#FFFFFF", initials: "TVS", fullName: "TVS Motor" },
  "suzuki":          { color: "#E60012", textColor: "#FFFFFF", initials: "S",  fullName: "Suzuki" },
  "yamaha":          { color: "#1A4C9A", textColor: "#FFFFFF", initials: "Y",  fullName: "Yamaha" },
  "ktm":             { color: "#FF6600", textColor: "#FFFFFF", initials: "KTM", fullName: "KTM" },
  "bmw":             { color: "#1C69D4", textColor: "#FFFFFF", initials: "BMW", fullName: "BMW Motorrad" },
  "harley-davidson": { color: "#F57C00", textColor: "#000000", initials: "HD", fullName: "Harley-Davidson" },
  "harley davidson": { color: "#F57C00", textColor: "#000000", initials: "HD", fullName: "Harley-Davidson" },
  "ducati":          { color: "#CC0000", textColor: "#FFFFFF", initials: "D",  fullName: "Ducati" },
  "triumph":         { color: "#C8102E", textColor: "#FFFFFF", initials: "T",  fullName: "Triumph" },
  "jawa":            { color: "#8B0000", textColor: "#FFFFFF", initials: "J",  fullName: "Jawa" },
  "yezdi":           { color: "#000000", textColor: "#FFFFFF", initials: "Y",  fullName: "Yezdi" },
  "mahindra":        { color: "#B91C1C", textColor: "#FFFFFF", initials: "M",  fullName: "Mahindra" },
  "ather":           { color: "#F3B300", textColor: "#000000", initials: "A",  fullName: "Ather Energy" },
  "ola":             { color: "#000000", textColor: "#FFFFFF", initials: "O",  fullName: "Ola Electric" },
  "ola electric":    { color: "#000000", textColor: "#FFFFFF", initials: "O",  fullName: "Ola Electric" },
  "simple energy":   { color: "#1E88E5", textColor: "#FFFFFF", initials: "SE", fullName: "Simple Energy" },
  "ultraviolette":   { color: "#5E35B1", textColor: "#FFFFFF", initials: "UV", fullName: "Ultraviolette" },
  "revolt":          { color: "#000000", textColor: "#F5B800", initials: "R",  fullName: "Revolt" },
  "bgauss":          { color: "#0D47A1", textColor: "#FFFFFF", initials: "BG", fullName: "BGauss" },
  "tork":            { color: "#000000", textColor: "#FF6B35", initials: "T",  fullName: "Tork Motors" },
  "piaggio":         { color: "#E8002A", textColor: "#FFFFFF", initials: "P",  fullName: "Piaggio" },
  "vespa":           { color: "#E8002A", textColor: "#FFFFFF", initials: "V",  fullName: "Vespa" },
  "aprilia":         { color: "#000000", textColor: "#FFFFFF", initials: "A",  fullName: "Aprilia" },

  // --- Cars
  "maruti":          { color: "#C8102E", textColor: "#FFFFFF", initials: "MS", fullName: "Maruti Suzuki" },
  "maruti suzuki":   { color: "#C8102E", textColor: "#FFFFFF", initials: "MS", fullName: "Maruti Suzuki" },
  "tata":            { color: "#003C7E", textColor: "#FFFFFF", initials: "T",  fullName: "Tata Motors" },
  "hyundai":         { color: "#002C5F", textColor: "#FFFFFF", initials: "H",  fullName: "Hyundai" },
  "kia":             { color: "#05141F", textColor: "#BB162B", initials: "K",  fullName: "Kia" },
  "mg":              { color: "#CB2027", textColor: "#FFFFFF", initials: "MG", fullName: "MG Motor" },
  "mg motor":        { color: "#CB2027", textColor: "#FFFFFF", initials: "MG", fullName: "MG Motor" },
  "toyota":          { color: "#EB0A1E", textColor: "#FFFFFF", initials: "T",  fullName: "Toyota" },
  "nissan":          { color: "#C3002F", textColor: "#FFFFFF", initials: "N",  fullName: "Nissan" },
  "renault":         { color: "#FFCC33", textColor: "#000000", initials: "R",  fullName: "Renault" },
  "skoda":           { color: "#4BA82E", textColor: "#FFFFFF", initials: "S",  fullName: "Skoda" },
  "volkswagen":      { color: "#001E50", textColor: "#FFFFFF", initials: "VW", fullName: "Volkswagen" },
  "vw":              { color: "#001E50", textColor: "#FFFFFF", initials: "VW", fullName: "Volkswagen" },
  "mercedes":        { color: "#000000", textColor: "#C0C0C0", initials: "M",  fullName: "Mercedes-Benz" },
  "mercedes-benz":   { color: "#000000", textColor: "#C0C0C0", initials: "M",  fullName: "Mercedes-Benz" },
  "audi":            { color: "#000000", textColor: "#BB0A30", initials: "A",  fullName: "Audi" },
  "jeep":            { color: "#004A2F", textColor: "#FFFFFF", initials: "J",  fullName: "Jeep" },
  "ford":            { color: "#1C3F94", textColor: "#FFFFFF", initials: "F",  fullName: "Ford" },
  "chevrolet":       { color: "#D4AF37", textColor: "#000000", initials: "C",  fullName: "Chevrolet" },
  "citroen":         { color: "#C8102E", textColor: "#FFFFFF", initials: "C",  fullName: "Citroën" },
  "volvo":           { color: "#003057", textColor: "#FFFFFF", initials: "V",  fullName: "Volvo" },
  "lexus":           { color: "#1A1A1A", textColor: "#FFFFFF", initials: "L",  fullName: "Lexus" },
  "porsche":         { color: "#000000", textColor: "#D0A96B", initials: "P",  fullName: "Porsche" },
  "jaguar":          { color: "#1A1A1A", textColor: "#D4AF37", initials: "J",  fullName: "Jaguar" },
  "land rover":      { color: "#005A32", textColor: "#FFFFFF", initials: "LR", fullName: "Land Rover" },
  "mini":            { color: "#000000", textColor: "#FFFFFF", initials: "M",  fullName: "MINI" },

  // --- EV cars
  "tesla":           { color: "#CC0000", textColor: "#FFFFFF", initials: "T",  fullName: "Tesla" },
  "byd":             { color: "#D71920", textColor: "#FFFFFF", initials: "BYD", fullName: "BYD" },
};

/** Normalizes a make string for the lookup map (trim + lowercase + collapse whitespace). */
export function normalizeMake(make: string | null | undefined): string {
  return (make ?? "").trim().toLowerCase().replace(/\s+/g, " ");
}

/** The URL-safe slug used for the public/brand-logos/<slug>.<ext> file name. */
export function brandSlug(make: string | null | undefined): string {
  return normalizeMake(make).replace(/\s+/g, "-");
}

/**
 * Attempts to resolve a real-logo file for the brand. Checks /brand-logos/
 * in order of likely formats. Returns the first URL that responds 200, or
 * null if none are present — in which case the caller falls back to the
 * inline SVG mark.
 *
 * Cached per slug for the session so a 404 lookup doesn't repeat on every
 * QR render.
 */
const resolveCache = new Map<string, string | null>();

export async function resolveBrandLogoFile(make: string | null | undefined): Promise<string | null> {
  const slug = brandSlug(make);
  if (!slug) return null;
  if (resolveCache.has(slug)) return resolveCache.get(slug) ?? null;

  const base = `${import.meta.env.BASE_URL ?? "/"}brand-logos/${slug}`;
  for (const ext of ["svg", "png", "webp", "jpg", "jpeg"] as const) {
    try {
      const url = `${base}.${ext}`;
      // HEAD avoids downloading the body if the file isn't there
      const res = await fetch(url, { method: "HEAD" });
      if (res.ok) {
        resolveCache.set(slug, url);
        return url;
      }
    } catch { /* keep trying */ }
  }
  resolveCache.set(slug, null);
  return null;
}

/** Returns the brand mark for a given make, or null if unknown. */
export function brandMarkForMake(make: string | null | undefined): BrandMark | null {
  return BRANDS[normalizeMake(make)] ?? null;
}

/** Legacy name — Clearbit lookup is retired; keep the signature for any
 * caller that was already pointing at the old API. Returns null now. */
export function logoUrlForMake(_make: string | null | undefined, _size?: number): string | null {
  return null;
}

/**
 * Renders the brand mark to a `data:image/svg+xml;utf8,...` URL suitable
 * for `<img src>` or a canvas drawImage. The disc is drawn as a full-bleed
 * rounded square so it reads cleanly centered inside the QR's white backing.
 */
export function brandMarkToDataUrl(mark: BrandMark, size = 128): string {
  const fontSize = mark.initials.length <= 1 ? size * 0.6
                 : mark.initials.length === 2 ? size * 0.45
                 : size * 0.32;
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}">` +
      `<rect width="${size}" height="${size}" rx="${size * 0.18}" fill="${mark.color}"/>` +
      `<text x="50%" y="50%" dy=".07em" text-anchor="middle" dominant-baseline="middle" ` +
            `font-family="Inter, system-ui, sans-serif" font-weight="800" ` +
            `font-size="${fontSize}" letter-spacing="-0.03em" fill="${mark.textColor}">${mark.initials}</text>` +
    `</svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export const KNOWN_MAKES = Object.values(BRANDS).map((b) => b.fullName).filter((v, i, a) => a.indexOf(v) === i).sort();
