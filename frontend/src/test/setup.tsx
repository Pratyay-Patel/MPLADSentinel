import '@testing-library/jest-dom/vitest';
import type { ReactNode } from 'react';
import { vi } from 'vitest';

/**
 * jsdom has no real layout engine, so Leaflet's renderer-picking logic throws
 * (`Cannot use 'in' operator to search for '_leaflet_id' in null`) as soon as a
 * vector layer (e.g. CircleMarker) mounts. No test here exercises actual map
 * behaviour, so react-leaflet is replaced with plain passthrough elements.
 */
vi.mock('react-leaflet', () => ({
  MapContainer: ({ children, ...rest }: { children?: ReactNode }) => (
    <div data-testid="mock-map-container" {...rest}>
      {children}
    </div>
  ),
  TileLayer: () => null,
  CircleMarker: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
  Tooltip: ({ children }: { children?: ReactNode }) => <span>{children}</span>,
}));
