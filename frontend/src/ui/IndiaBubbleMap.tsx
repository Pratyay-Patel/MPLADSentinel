import { useRef, useState, type KeyboardEvent, type MouseEvent } from 'react';

import {
  coordForState,
  INDIA_OUTLINE_POINTS,
  MAP_VIEW_H,
  MAP_VIEW_W,
  projectLat,
  projectLon,
} from './indiaGeo';

export interface MapRegion {
  /** State/UT name as it appears in the data. */
  state: string;
  works: number;
  high: number;
  medium: number;
  low: number;
}

export interface IndiaBubbleMapProps {
  regions: MapRegion[];
  /** Click a bubble → this state (or `null` to toggle off). */
  onSelect?: (state: string | null) => void;
  selected?: string | null;
  /** Accessible summary of what the map shows. */
  ariaLabel: string;
}

interface Hover {
  region: MapRegion;
  displayName: string;
  x: number;
  y: number;
}

/**
 * A schematic India map: one bubble per state, area proportional to the number
 * of works. Magnitude is size (single hue); the outline and centroids are
 * approximate — this locates activity, it is not a survey map. Bubbles are
 * keyboard-focusable when `onSelect` is provided.
 */
export function IndiaBubbleMap({ regions, onSelect, selected, ariaLabel }: IndiaBubbleMapProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [hover, setHover] = useState<Hover | null>(null);

  const placed = regions
    .map((region) => ({ region, coord: coordForState(region.state) }))
    .filter((entry): entry is { region: MapRegion; coord: NonNullable<typeof entry.coord> } =>
      Boolean(entry.coord),
    )
    .sort((a, b) => b.region.works - a.region.works);

  const maxWorks = Math.max(1, ...placed.map((entry) => entry.region.works));
  const radius = (works: number) => 1.4 + Math.sqrt(works / maxWorks) * 6.2;

  const moveHover = (event: MouseEvent, region: MapRegion, displayName: string) => {
    const rect = wrapRef.current?.getBoundingClientRect();
    if (!rect) return;
    setHover({
      region,
      displayName,
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    });
  };

  const activate = (region: MapRegion) => {
    if (!onSelect) return;
    onSelect(selected === region.state ? null : region.state);
  };

  const onKey = (event: KeyboardEvent, region: MapRegion) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      activate(region);
    }
  };

  return (
    <div className="india-map" ref={wrapRef}>
      <svg
        className="india-map__svg"
        viewBox={`0 0 ${MAP_VIEW_W} ${MAP_VIEW_H}`}
        role="img"
        aria-label={ariaLabel}
        preserveAspectRatio="xMidYMid meet"
      >
        <polygon className="india-map__land" points={INDIA_OUTLINE_POINTS} />
        {placed.map(({ region, coord }) => {
          const isSelected = selected === region.state;
          return (
            <circle
              key={region.state}
              className="india-map__bubble"
              data-selected={isSelected || undefined}
              data-dim={selected && !isSelected ? true : undefined}
              cx={projectLon(coord.lon)}
              cy={projectLat(coord.lat)}
              r={radius(region.works)}
              tabIndex={onSelect ? 0 : undefined}
              role={onSelect ? 'button' : undefined}
              aria-label={`${coord.name}: ${region.works} works`}
              onMouseMove={(event) => moveHover(event, region, coord.name)}
              onMouseLeave={() => setHover(null)}
              onFocus={() =>
                setHover({ region, displayName: coord.name, x: projectLon(coord.lon), y: projectLat(coord.lat) })
              }
              onBlur={() => setHover(null)}
              onClick={() => activate(region)}
              onKeyDown={(event) => onKey(event, region)}
            />
          );
        })}
      </svg>

      {hover ? (
        <div
          className="india-map__tip"
          style={{ left: hover.x, top: hover.y }}
          role="status"
        >
          <span className="india-map__tip-name">{hover.displayName}</span>
          <span className="india-map__tip-total">{hover.region.works} works</span>
          <span className="india-map__tip-mix">
            <b>{hover.region.high}</b> high · <b>{hover.region.medium}</b> medium ·{' '}
            <b>{hover.region.low}</b> low
          </span>
        </div>
      ) : null}

      <p className="india-map__caption">Bubble size = number of works. Positions are approximate.</p>
    </div>
  );
}
