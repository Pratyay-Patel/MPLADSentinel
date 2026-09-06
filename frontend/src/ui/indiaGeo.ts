/**
 * Approximate centroid coordinates for Indian states / UTs, and a rough India
 * silhouette — both expressed in the same lon/lat space and projected the same
 * way, so bubbles land in the right place over the outline.
 *
 * This is a schematic map for showing "where the works are", not a survey. The
 * silhouette is a ~20-point polygon through real extreme points; the centroids
 * are eyeballed to ~0.5°. Keys are lower-cased state names — match against
 * `project.state.toLowerCase().trim()`.
 */

// Projection window (a little padding beyond India's extent).
const LON_MIN = 67;
const LON_MAX = 98;
const LAT_MIN = 6;
const LAT_MAX = 38;

/** viewBox is 100 wide; height keeps India's taller-than-wide look. */
export const MAP_VIEW_W = 100;
export const MAP_VIEW_H = 108;

export function projectLon(lon: number): number {
  return ((lon - LON_MIN) / (LON_MAX - LON_MIN)) * MAP_VIEW_W;
}

export function projectLat(lat: number): number {
  return ((LAT_MAX - lat) / (LAT_MAX - LAT_MIN)) * MAP_VIEW_H;
}

export interface StateCoord {
  /** Canonical display name. */
  name: string;
  lon: number;
  lat: number;
}

/** lower-cased name → coordinate. Includes common alternate spellings. */
export const STATE_COORDS: Record<string, StateCoord> = Object.fromEntries(
  (
    [
      ['Andhra Pradesh', 15.9, 79.7],
      ['Arunachal Pradesh', 28.2, 94.7],
      ['Assam', 26.2, 92.9],
      ['Bihar', 25.9, 85.5],
      ['Chhattisgarh', 21.3, 82.0],
      ['Goa', 15.4, 74.0],
      ['Gujarat', 22.7, 71.6],
      ['Haryana', 29.2, 76.3],
      ['Himachal Pradesh', 31.9, 77.2],
      ['Jharkhand', 23.6, 85.3],
      ['Karnataka', 15.3, 75.7],
      ['Kerala', 10.5, 76.3],
      ['Madhya Pradesh', 23.5, 78.3],
      ['Maharashtra', 19.7, 75.7],
      ['Manipur', 24.7, 93.9],
      ['Meghalaya', 25.5, 91.4],
      ['Mizoram', 23.3, 92.8],
      ['Nagaland', 26.1, 94.5],
      ['Odisha', 20.5, 84.8],
      ['Punjab', 31.1, 75.4],
      ['Rajasthan', 27.0, 74.2],
      ['Sikkim', 27.5, 88.5],
      ['Tamil Nadu', 11.1, 78.7],
      ['Telangana', 17.9, 79.1],
      ['Tripura', 23.8, 91.7],
      ['Uttar Pradesh', 27.0, 80.9],
      ['Uttarakhand', 30.1, 79.3],
      ['West Bengal', 22.9, 87.9],
      ['Delhi', 28.7, 77.1],
      ['Jammu and Kashmir', 33.6, 75.1],
      ['Ladakh', 34.5, 77.6],
      ['Puducherry', 11.9, 79.8],
      ['Chandigarh', 30.7, 76.8],
      ['Andaman and Nicobar Islands', 11.7, 92.7],
      ['Dadra and Nagar Haveli and Daman and Diu', 20.3, 73.0],
      ['Lakshadweep', 10.6, 72.6],
    ] as [string, number, number][]
  ).flatMap(([name, lat, lon]) => {
    const coord: StateCoord = { name, lat, lon };
    const entries: [string, StateCoord][] = [[name.toLowerCase(), coord]];
    // alternate spellings seen in source data
    if (name === 'Jammu and Kashmir') entries.push(['jammu & kashmir', coord]);
    if (name === 'Andaman and Nicobar Islands') entries.push(['andaman & nicobar islands', coord]);
    if (name === 'Dadra and Nagar Haveli and Daman and Diu') {
      entries.push(['dadra and nagar haveli', coord], ['daman and diu', coord]);
    }
    return entries;
  }),
);

export function coordForState(state: string | null | undefined): StateCoord | null {
  if (!state) return null;
  return STATE_COORDS[state.toLowerCase().trim()] ?? null;
}

/**
 * Rough India outline as [lon, lat] pairs, clockwise from the north. Passes
 * through real extreme points (Kashmir, Kutch, Kanyakumari, the NE arm, Bengal).
 */
const INDIA_OUTLINE_LONLAT: [number, number][] = [
  [74.4, 36.9],
  [78.0, 35.5],
  [79.5, 33.0],
  [81.5, 30.4],
  [88.2, 27.9],
  [89.0, 26.8],
  [92.5, 27.8],
  [95.2, 27.1],
  [97.2, 28.2],
  [96.5, 25.0],
  [94.2, 23.9],
  [93.4, 24.0],
  [92.4, 21.9],
  [91.0, 22.9],
  [89.7, 21.8],
  [88.1, 21.6],
  [86.9, 20.2],
  [85.0, 19.5],
  [82.2, 16.9],
  [80.3, 15.9],
  [80.1, 13.5],
  [79.9, 11.8],
  [77.5, 8.1],
  [76.2, 9.9],
  [75.0, 12.3],
  [74.0, 14.8],
  [73.1, 17.9],
  [72.6, 20.8],
  [72.8, 22.4],
  [69.1, 22.4],
  [68.2, 23.7],
  [70.0, 24.3],
  [71.0, 27.7],
  [73.9, 30.1],
  [74.6, 32.5],
  [73.9, 34.6],
];

/** SVG `points` attribute for the outline polygon, in viewBox units. */
export const INDIA_OUTLINE_POINTS = INDIA_OUTLINE_LONLAT.map(
  ([lon, lat]) => `${projectLon(lon).toFixed(2)},${projectLat(lat).toFixed(2)}`,
).join(' ');
