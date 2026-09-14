import type { RegionStat } from '../../../data';
import { BarList, Card, IndiaBubbleMap, SectionHeader } from '../../../ui';
import { MapPinIcon } from '../../../ui/icons';
import { formatCount } from '../../../format';

const TOP_LIST_LIMIT = 8;

/**
 * Regional distribution — a schematic bubble map of works per state, plus a
 * short ranked list. Locations are approximate; this is "where the works are",
 * not geospatial analysis.
 */
export function RegionalInsight({ regions }: { regions: RegionStat[] }) {
  const topList = [...regions].slice(0, TOP_LIST_LIMIT);

  return (
    <Card>
      <SectionHeader
        title="Works across India"
        description="Number of works per state in the current dataset, with the assessed risk split. Hover a bubble for detail."
        icon={<MapPinIcon />}
        tone="info"
      />
      {regions.length === 0 ? (
        <p className="risk-signals__note">No state information available.</p>
      ) : (
        <div className="dash-region">
          <div className="dash-region__map">
            <IndiaBubbleMap
              regions={regions.map((r) => ({
                state: r.state,
                works: r.works,
                high: r.high,
                medium: r.medium,
                low: r.low,
              }))}
              ariaLabel="Bubble map of MPLADS works per Indian state"
            />
          </div>
          <div className="dash-region__list">
            <h3 className="risk-signals__subtitle">Top states by number of works</h3>
            <BarList
              caption="Number of works per state"
              items={topList.map((entry) => ({
                label: entry.state,
                value: entry.works,
                valueLabel: formatCount(entry.works),
                tone: 'brand',
              }))}
            />
          </div>
        </div>
      )}
    </Card>
  );
}
