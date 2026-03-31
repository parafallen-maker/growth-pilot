/**
 * Skeleton UI components for loading states (FI-01).
 * Uses animate-pulse with gray blocks matching existing card dimensions.
 */

export function SkeletonCard({ lines = 3 }: { lines?: number }) {
  return (
    <div className="panel stack" aria-hidden="true" style={{ opacity: 0.6 }}>
      <div className="skeleton-block" style={{ height: 20, width: '60%' }} />
      <div className="skeleton-block" style={{ height: 36, width: '80%' }} />
      {Array.from({ length: lines }, (_, i) => (
        <div key={i} className="skeleton-line" />
      ))}
    </div>
  );
}

export function SkeletonMetric({ count = 4 }: { count?: number }) {
  return (
    <div className="metric-grid" aria-hidden="true" style={{ opacity: 0.6 }}>
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="panel stack" style={{ padding: '16px' }}>
          <div className="skeleton-line" style={{ width: '50%' }} />
          <div className="skeleton-block" style={{ height: 28, width: '40%', marginTop: 8 }} />
        </div>
      ))}
    </div>
  );
}

export function SkeletonTable({ rows = 5, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <div className="panel stack" aria-hidden="true" style={{ opacity: 0.6 }}>
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: 8 }}>
        {Array.from({ length: rows }, (_, r) =>
          Array.from({ length: cols }, (_, c) => (
            <div key={`${r}-${c}`} className="skeleton-block" style={{ height: 16 }} />
          )),
        )}
      </div>
    </div>
  );
}

export function SkeletonChart() {
  return (
    <div className="panel stack" aria-hidden="true" style={{ opacity: 0.6 }}>
      <div className="skeleton-block" style={{ height: 20, width: '40%' }} />
      <div className="skeleton-line" style={{ width: '60%' }} />
      <div className="skeleton-block" style={{ height: 160, marginTop: 16 }} />
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <div className="stack" aria-busy="true" aria-live="polite">
      <SkeletonMetric count={4} />
      <div className="grid-2">
        <SkeletonChart />
        <SkeletonChart />
      </div>
      <div className="grid-2">
        <SkeletonCard lines={4} />
        <SkeletonCard lines={4} />
      </div>
    </div>
  );
}
