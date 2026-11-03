import type { CSSProperties, ReactNode } from "react";

/**
 * Shimmer skeleton — matches card radii/colors so a page swapping real content
 * in doesn't flicker. Keep aspect ratios the same as the real block.
 *
 * The animation is a diagonal highlight sweep, kept slow (1.6s) so it reads as
 * "loading" rather than "distracting." Reduced motion disables the sweep.
 */
export function Skeleton({ height, width, radius, style, className }: {
  height?: number | string;
  width?: number | string;
  radius?: number | string;
  style?: CSSProperties;
  className?: string;
}) {
  return (
    <span
      aria-hidden="true"
      className={"skeleton " + (className ?? "")}
      style={{ width: width ?? "100%", height: height ?? 16, borderRadius: radius ?? 8, ...style }}
    />
  );
}

/** Wrap a block in Skeleton while loading, otherwise render children. */
export function SkeletonWhen({ loading, children, fallback }: {
  loading: boolean;
  children: ReactNode;
  fallback: ReactNode;
}) {
  return <>{loading ? fallback : children}</>;
}

/** Prebuilt skeletons for common layouts. */
export function SkeletonStatTile() {
  return (
    <div className="card" style={{ minHeight: 92 }}>
      <Skeleton height={10} width="40%" />
      <div style={{ height: 10 }}/>
      <Skeleton height={28} width="60%" />
    </div>
  );
}

export function SkeletonCard({ height = 160 }: { height?: number }) {
  return <div className="card card--bendy" style={{ minHeight: height }}>
    <Skeleton height={16} width="40%" />
    <div style={{ height: 12 }}/>
    <Skeleton height={height - 60} />
  </div>;
}

export function SkeletonList({ rows = 5 }: { rows?: number }) {
  return (
    <div className="col" style={{ gap: 12 }}>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="row row--between">
          <div className="row" style={{ gap: 12 }}>
            <Skeleton width={36} height={36} radius={12} />
            <div>
              <Skeleton height={12} width={120} />
              <div style={{ height: 6 }}/>
              <Skeleton height={10} width={80} />
            </div>
          </div>
          <Skeleton height={14} width={60} />
        </div>
      ))}
    </div>
  );
}

export function SkeletonVehicleCard() {
  return (
    <div className="vehicle-card vehicle-card--dark" style={{ background: "var(--surface-alt)" }}>
      <div>
        <Skeleton height={10} width={80} />
        <div style={{ height: 8 }}/>
        <Skeleton height={20} width={160} />
      </div>
      <Skeleton height={28} width={100} radius={999} />
    </div>
  );
}
