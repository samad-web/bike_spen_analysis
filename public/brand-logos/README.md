# Brand logos

Drop PNG, JPG, SVG, or WebP files here, named by brand slug:

- `royal-enfield.svg` or `royal-enfield.png`
- `triumph.svg` or `triumph.png`
- `honda.svg`
- `bajaj.svg`
- …

The slug is the brand name, lowercased, with spaces → hyphens.

If a file exists at this path (checked in order: `.svg` → `.png` → `.jpg` → `.webp`),
MotoPulse uses it as the center logo on the QR. Otherwise, it falls back to the
bundled initial-based brand mark in `src/vehicles/brandLogo.ts`.

**Why not fetch logos from the internet?** Logos are copyrighted brand assets.
Fetching from Clearbit / Brandfetch at runtime means the end user downloads the
asset, which has caching, CORS, and ToS implications. Bundling them locally is
cleaner, works offline, and is under your control.

Suggested sources (manually download then drop here):
- https://commons.wikimedia.org/ (official brand logos, variable licenses)
- the brand's own press / media kit page
- SeekLogo, WorldVectorLogo, Vecteezy (verify licensing)
