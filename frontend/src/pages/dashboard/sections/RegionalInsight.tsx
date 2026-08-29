import type { StateWorkCount } from '../../../data';
import { BarList, Card, SectionHeader } from '../../../ui';
import { formatCount } from '../../../format';

/**
 * Section 6 — one lightweight, defensible aggregate: number of works per state.
 * No map, no geospatial clustering, no geographic intelligence beyond grouping.
 * Visually secondary to Projects Requiring Attention.
 */
export function RegionalInsight({ topStates }: { topStates: StateWorkCount[] }) {
  return (
    <Card>
      <SectionHeader
        title="Top states by number of works"
        description="Simple count of works per state in the current dataset."
      />
      {topStates.length === 0 ? (
        <p className="dash-note">No state information available.</p>
      ) : (
        <BarList
          caption="Number of works per state"
          items={topStates.map((entry) => ({
            label: entry.state,
            value: entry.works,
            valueLabel: formatCount(entry.works),
            tone: 'brand',
          }))}
        />
      )}
    </Card>
  );
}
