import { CircleMarker, MapContainer, TileLayer, Tooltip } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

import type { RiskLevelValue } from './RiskLevelBadge';
import { RISK_LEVEL_COLOR } from './riskColors';
import { coordForState } from './indiaGeo';

export interface ProjectLocationMapProps {
  /** State/UT name as it appears in the data. */
  state: string | null | undefined;
  district?: string | null;
  /** When provided, the pin is coloured by risk level (only pass this where the
   * viewer's role is already permitted to see risk — the map does not enforce
   * that itself). */
  riskLevel?: RiskLevelValue;
}

const DEFAULT_PIN_COLOR = '#2f74a8'; // brand-500 — matches tokens.css

/**
 * State-level approximate location map for a single work. The source data has
 * no per-work coordinates (docs/data-source.md §13.11), so this centres on the
 * work's *state* only — a real, honestly-labelled approximation, never a claim
 * about the exact site.
 */
export function ProjectLocationMap({ state, district, riskLevel }: ProjectLocationMapProps) {
  const coord = coordForState(state);
  if (!coord) return null;

  const center: [number, number] = [coord.lat, coord.lon];
  const color = riskLevel ? RISK_LEVEL_COLOR[riskLevel] : DEFAULT_PIN_COLOR;

  return (
    <div className="ui-project-map">
      <MapContainer
        className="ui-project-map__container"
        center={center}
        zoom={6}
        scrollWheelZoom
        aria-label={`Map centred on ${coord.name}`}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />
        <CircleMarker
          center={center}
          radius={11}
          pathOptions={{ color, fillColor: color, fillOpacity: 0.55, weight: 2 }}
        >
          <Tooltip permanent direction="top" offset={[0, -10]}>
            {coord.name}
            {district ? ` · ${district}` : ''}
          </Tooltip>
        </CircleMarker>
      </MapContainer>
      <p className="ui-project-map__note">
        Approximate — centred on {coord.name}. Exact work-site coordinates are not available in
        the source data.
      </p>
    </div>
  );
}
