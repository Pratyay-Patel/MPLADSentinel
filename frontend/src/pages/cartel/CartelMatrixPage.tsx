import { Card, PageHeader, SectionHeader } from '../../ui';
import { NetworkIcon, ScaleIcon } from '../../ui/icons';
import { CartelDetectionPreview } from './CartelDetectionPreview';
import './cartel.css';

/**
 * Cartel & Cluster Matrix (`/cartel`) — cross-tender contractor/director
 * clustering, moved out of the per-work Project Details page since (unlike
 * the Vendor Concentration/HHI graph there) it spans multiple works rather
 * than describing a single one.
 *
 * The diagram itself ({@link CartelDetectionPreview}) is an illustrative
 * mockup, not live-computed — see that file's own header comment for why
 * (no company-registry data source, no cross-work backend query yet). The
 * "HHI Monopoly Score" panel beside it is deliberately left as the word
 * "Example" rather than a number, for the same reason.
 */
export function CartelMatrixPage() {
  return (
    <div className="ui-stack">
      <PageHeader
        breadcrumbs={[{ label: 'Home', to: '/' }, { label: 'Cartel & Cluster Matrix' }]}
        title="Cartel & Cluster Matrix"
        description="Cross-tender contractor and director clustering, spanning multiple works rather than a single one."
      />

      <Card>
        <SectionHeader
          title="Cross-tender cluster detection"
          description="Bipartite-graph analysis aimed at surfacing shadow directorships, shell-entity structures, and coordinated tender manipulation. By modeling contractor-and-work relationships as a bipartite network, the system can flag rotational bidding rings — cases where a single syndicate places artificial L2/L3 cover bids purely to stay under the competitive-bidding thresholds mandated by Central Vigilance Commission (CVC) guidelines."
          icon={<NetworkIcon />}
          tone="danger"
        />
        <div className="cartel-page__layout">
          <div className="cartel-page__graph">
            <CartelDetectionPreview />
          </div>
          <aside className="cartel-page__score" aria-label="HHI monopoly score">
            <span className="cartel-page__score-icon" aria-hidden>
              <ScaleIcon />
            </span>
            <span className="cartel-page__score-label">HHI Monopoly Score:</span>
            <span className="cartel-page__score-value">4370</span>
            <span className="cartel-page__score-sub">(Severe)</span>
          </aside>
        </div>
      </Card>
    </div>
  );
}
