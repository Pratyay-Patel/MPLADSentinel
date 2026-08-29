import type { CSSProperties } from 'react';

export interface SkeletonProps {
  /** CSS width, e.g. "100%", "8rem". Default "100%". */
  width?: string;
  /** CSS height. Default token line height. */
  height?: string;
}

/** A single shimmer block. Compose several for a loading layout. */
export function Skeleton({ width = '100%', height }: SkeletonProps) {
  const style: CSSProperties = { width, ...(height ? { height } : {}) };
  return <span className="ui-skeleton" style={style} aria-hidden />;
}

export interface LoadingStateProps {
  /** Announced to assistive tech. Default "Loading". */
  label?: string;
}

/** A compact, announced loading indicator for a region. */
export function LoadingState({ label = 'Loading' }: LoadingStateProps) {
  return (
    <div className="ui-loading" role="status">
      <span className="ui-spinner" aria-hidden />
      <span>{label}…</span>
    </div>
  );
}
