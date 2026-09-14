import { CircleMarker, MapContainer, TileLayer, Tooltip } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

import { coordForState } from './indiaGeo';

export interface MapRegion {
  /** State/UT name as it appears in the data. */
  state: string;
  works: number;
  high: number;
  medium: number;
  low: number;
}

export interface IndiaLeafletMapProps {
  regions: MapRegion[];
  /** Accessible summary of what the map shows. */
  ariaLabel: string;
}

/** Single hue throughout — magnitude is carried by bubble size, not colour. */
const BUBBLE_COLOR = '#2f74a8'; // --color-brand-500

/**
 * A real Leaflet/OpenStreetMap map, one bubble per state sized by work count.
 * Same information as the previous schematic SVG bubble map (IndiaBubbleMap) —
 * hover a bubble for the risk-level breakdown — but on a real, pannable/
 * zoomable map. Positions are state centroids (see indiaGeo.ts), not exact
 * work sites.
 */
export function IndiaLeafletMap({ regions, ariaLabel }: IndiaLeafletMapProps) {
  const placed = regions
    .map((region) => ({ region, coord: coordForState(region.state) }))
    .filter((entry): entry is { region: MapRegion; coord: NonNullable<typeof entry.coord> } =>
      Boolean(entry.coord),
    )
    .sort((a, b) => b.region.works - a.region.works);

  const maxWorks = Math.max(1, ...placed.map((entry) => entry.region.works));
  const radius = (works: number) => 6 + Math.sqrt(works / maxWorks) * 26;

  return (
    <div className="india-leaflet-map">
      <MapContainer
        className="india-leaflet-map__container"
        center={[22.9, 80]}
        zoom={4}
        minZoom={4}
        scrollWheelZoom
        aria-label={ariaLabel}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />
        {placed.map(({ region, coord }) => (
          <CircleMarker
            key={region.state}
            center={[coord.lat, coord.lon]}
            radius={radius(region.works)}
            pathOptions={{
              color: BUBBLE_COLOR,
              fillColor: BUBBLE_COLOR,
              fillOpacity: 0.45,
              weight: 1.5,
            }}
          >
            <Tooltip direction="top" offset={[0, -radius(region.works)]}>
              <span className="india-map__tip-body">
                <span className="india-map__tip-name">{coord.name}</span>
                <span className="india-map__tip-total">{region.works} works</span>
                <span className="india-map__tip-mix">
                  <b>{region.high}</b> high · <b>{region.medium}</b> medium · <b>{region.low}</b> low
                </span>
              </span>
            </Tooltip>
          </CircleMarker>
        ))}
      </MapContainer>
      <p className="india-map__caption">Bubble size = number of works. Positions are state-level, not exact sites.</p>
    </div>
  );
}
