/**
 * Approximate centroid coordinates for Indian states / UTs (real lat/lon
 * degrees, eyeballed to ~0.5°) — used to place a work or a state-level bubble
 * on a real map (Leaflet/OpenStreetMap) when the source data has no per-work
 * coordinates. Keys are lower-cased state names — match against
 * `project.state.toLowerCase().trim()`.
 */

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
