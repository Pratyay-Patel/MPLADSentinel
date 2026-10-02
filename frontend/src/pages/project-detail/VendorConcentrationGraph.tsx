import { formatINRExact } from '../../format';
import { StatusBadge, type StatusTone } from '../../ui';
import type { VendorConcentration } from './vendorConcentration';

const LABEL_TONE: Record<VendorConcentration['concentrationLabel'], StatusTone> = {
  'Highly concentrated': 'danger',
  'Moderately concentrated': 'warning',
  'Not concentrated': 'success',
};

/**
 * Renders a work's real, live-computed vendor payment concentration as a
 * hub-and-spoke layout: this work in the centre, its vendors as spoke cards
 * sized/coloured by share of the total recorded payment amount. Every number
 * here comes from {@link computeVendorConcentration} over this work's own
 * already-loaded payments — nothing is fabricated or looked up elsewhere.
 */
export function VendorConcentrationGraph({
  data,
  workTitle,
  riskScore,
}: {
  data: VendorConcentration;
  workTitle: string;
  /** This work's own real risk score (0-100), already computed elsewhere on
   * the page — shown here too, not recomputed. */
  riskScore?: number | null;
}) {
  return (
    <div className="vendor-graph">
      <div className="vendor-graph__hub">
        <span className="vendor-graph__hub-title">{workTitle}</span>
        <span className="vendor-graph__hub-sub">
          {formatINRExact({ amount: data.totalAmount, currency: 'INR' })} across {data.vendorCount}{' '}
          {data.vendorCount === 1 ? 'vendor' : 'vendors'}
        </span>
        <span className="vendor-graph__hub-badges">
          <StatusBadge tone={LABEL_TONE[data.concentrationLabel]} srLabel="Vendor concentration">
            HHI {data.hhi} · {data.concentrationLabel}
          </StatusBadge>
          {riskScore != null && (
            <StatusBadge tone="neutral" srLabel="Work risk score">
              Risk score {riskScore}/100
            </StatusBadge>
          )}
        </span>
      </div>

      <div className="vendor-graph__connector" aria-hidden />

      <ul className="vendor-graph__spokes">
        {data.vendors.map((vendor) => (
          <li key={vendor.name} className="vendor-node" data-tone={vendor.tone}>
            <span className="vendor-node__name">{vendor.name}</span>
            <span className="vendor-node__share">{vendor.sharePct.toFixed(1)}%</span>
            <span className="vendor-node__amount">
              {formatINRExact({ amount: vendor.amount, currency: 'INR' })}
            </span>
          </li>
        ))}
        {data.otherCount > 0 && (
          <li className="vendor-node" data-tone="neutral">
            <span className="vendor-node__name">+{data.otherCount} more</span>
            <span className="vendor-node__share">{data.otherSharePct.toFixed(1)}%</span>
            <span className="vendor-node__amount">combined</span>
          </li>
        )}
      </ul>

      <p className="vendor-graph__note">
        A work-vendor bipartite graph: this work on one side, its vendors on the other, edges
        weighted by each vendor's share of the recorded payments. The Herfindahl-Hirschman Index
        above is computed live from the payment installments, using the standard DOJ/FTC
        concentration thresholds. A concentrated vendor share is an indicator for review, not
        proof of collusion or wrongdoing.
      </p>
    </div>
  );
}
