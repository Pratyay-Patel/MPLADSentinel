import { useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';

import { useAsyncData, useProjectDetailService, type ProjectDetailData } from '../../data';
import { formatINRExact, tidyDescription, workTitle } from '../../format';
import {
  Badge,
  Card,
  EmptyState,
  ErrorState,
  KeyValueList,
  LoadingState,
  PageHeader,
  ProjectLocationMap,
  SectionHeader,
  StatusBadge,
} from '../../ui';
import { CalendarIcon, InfoIcon, MapPinIcon, NetworkIcon, RupeeIcon, ShieldIcon } from '../../ui/icons';
import { CartelDetectionPreview } from './CartelDetectionPreview';
import { DetailTimeline } from './DetailTimeline';
import { flagLabel, houseLabel, LIFECYCLE_LABEL, LIFECYCLE_TONE } from './labels';
import { PaymentsSection } from './PaymentsSection';
import { RiskInsights } from './RiskInsights';
import { computeVendorConcentration } from './vendorConcentration';
import { VendorConcentrationGraph } from './VendorConcentrationGraph';

/**
 * Project Details (`/projects/:id`) — the full record for a single MPLADS work,
 * built entirely from fields the verified source provides. No sanctioned amount,
 * physical-progress %, geo coordinates or delay prediction (they do not exist in
 * the source). Risk indicators are added with the Risk & Alerts feature.
 *
 * Data comes through {@link useProjectDetailService} → DataProvider; a missing id
 * resolves to the "work not found" state (not an error).
 */
export function ProjectDetail() {
  const params = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  // `?section=record` (set by the Project Register's "View" link) renders the
  // plain record without the risk-assessment section — risk already has its own
  // column there, and the deep-dive belongs to Risk & Alerts / the Overview.
  const showRisk = searchParams.get('section') !== 'record';
  const workId = Number(params.id);
  const validId = Number.isFinite(workId) && workId > 0;

  const service = useProjectDetailService();
  const [reloadKey, setReloadKey] = useState(0);

  const state = useAsyncData<ProjectDetailData | null>(
    (signal) => (validId ? service.load(workId, signal) : Promise.resolve(null)),
    [service, workId, validId, reloadKey],
    { isEmpty: (data) => data === null },
  );

  const project = state.status === 'success' ? state.data?.project : undefined;
  const title = project
    ? workTitle(project.workDescription, workId)
    : validId
      ? `Work #${workId}`
      : 'Project details';
  const subtitle = project
    ? [project.category, project.state].filter(Boolean).join(' · ')
    : undefined;

  return (
    <div className="ui-stack detail">
      <PageHeader
        breadcrumbs={[
          { label: 'Home', to: '/' },
          { label: 'Projects', to: '/projects' },
          { label: title },
        ]}
        title={title}
        description={subtitle || undefined}
      />

      {state.status === 'loading' && (
        <Card>
          <LoadingState label="Loading work" />
        </Card>
      )}

      {state.status === 'empty' && (
        <Card>
          <EmptyState
            title="Work not found"
            description={
              validId
                ? `No MPLADS work with id ${workId} is available.`
                : 'That project id is not valid.'
            }
            action={
              <Link className="ui-btn ui-btn--secondary ui-btn--sm" to="/dashboard">
                Back to dashboard
              </Link>
            }
          />
        </Card>
      )}

      {state.status === 'error' && (
        <Card>
          <ErrorState
            title="Could not load this work"
            description={state.error.message}
            onRetry={() => setReloadKey((key) => key + 1)}
          />
        </Card>
      )}

      {state.status === 'success' && state.data && (
        <ProjectDetailView data={state.data} showRisk={showRisk} />
      )}
    </div>
  );
}

function ProjectDetailView({ data, showRisk }: { data: ProjectDetailData; showRisk: boolean }) {
  const { project, payments, risk } = data;
  const vendorConcentration = computeVendorConcentration(payments);

  return (
    <>
      <Card>
        <SectionHeader title="Overview" icon={<InfoIcon />} tone="info" />
        <KeyValueList
          items={[
            {
              label: 'Work description',
              value: tidyDescription(project.workDescription) ?? 'Not recorded',
            },
            { label: 'Category', value: project.category ?? '—' },
            {
              label: 'Lifecycle',
              value: (
                <StatusBadge tone={LIFECYCLE_TONE[project.lifecycleState]} srLabel="Lifecycle">
                  {LIFECYCLE_LABEL[project.lifecycleState]}
                </StatusBadge>
              ),
            },
            { label: 'Status detail', value: project.sourceStatusRaw ?? '—' },
            { label: 'House', value: houseLabel(project.house) },
            { label: 'Lok Sabha term', value: project.lsTerm ?? '—' },
            { label: 'Member of Parliament', value: project.mpName ?? '—' },
            { label: 'Constituency', value: project.constituency ?? '—' },
          ]}
        />
      </Card>

      <Card>
        <SectionHeader title="Location" icon={<MapPinIcon />} tone="warning" />
        <KeyValueList
          items={[
            { label: 'State', value: project.state ?? '—' },
            { label: 'District', value: project.district ?? '—' },
            { label: 'Location', value: project.locationRaw ?? '—' },
          ]}
        />
        <ProjectLocationMap
          state={project.state}
          district={project.district}
          riskLevel={showRisk ? risk?.level : undefined}
        />
      </Card>

      <Card>
        <SectionHeader
          title="Financials"
          description="The recommended estimate and the final cost are separate figures; they are never merged."
          icon={<RupeeIcon />}
          tone="success"
        />
        <KeyValueList
          items={[
            { label: 'Estimated cost (recommended)', value: formatINRExact(project.estimatedCost) },
            { label: 'Final cost (completed)', value: formatINRExact(project.finalCost) },
          ]}
        />
      </Card>

      {showRisk && <RiskInsights risk={risk} />}

      <PaymentsSection project={project} payments={payments} />

      {showRisk && vendorConcentration && (
        <Card>
          <SectionHeader
            title="Vendor concentration (HHI)"
            description="How this work's recorded payments are split across vendors — computed live from the payment installments above."
            icon={<NetworkIcon />}
            tone={vendorConcentration.concentrationLabel === 'Highly concentrated' ? 'danger' : 'warning'}
          />
          <VendorConcentrationGraph
            data={vendorConcentration}
            workTitle={workTitle(project.workDescription, project.sourceWorkId)}
            riskScore={risk?.score}
          />
        </Card>
      )}

      {showRisk && vendorConcentration && (
        <Card>
          <SectionHeader
            title="Cross-tender cluster detection"
            description={
              'Bipartite-graph analysis aimed at surfacing shadow directorships, shell-entity structures, and coordinated tender manipulation. By modeling contractor-and-work relationships as a bipartite network, the system can flag rotational bidding rings — cases where a single syndicate places artificial L2/L3 cover bids purely to stay under the competitive-bidding thresholds mandated by Central Vigilance Commission (CVC) guidelines.'
            }
            icon={<NetworkIcon />}
            tone="neutral"
          />
          <CartelDetectionPreview />
        </Card>
      )}

      <Card>
        <SectionHeader
          title="Timeline"
          description="Key dates recorded for this work, in chronological order."
          icon={<CalendarIcon />}
          tone="neutral"
        />
        <DetailTimeline project={project} payments={payments} />
      </Card>

      <Card>
        <SectionHeader title="Data source & quality" icon={<ShieldIcon />} tone="neutral" />
        <KeyValueList
          items={[
            { label: 'Data source', value: 'MPLADS works data' },
            { label: 'Work ID', value: String(project.sourceWorkId) },
          ]}
        />
        <div className="detail-flags">
          {project.dataQualityFlags.length === 0 ? (
            <p className="detail-note" style={{ marginTop: 0 }}>
              No data-quality flags for this work.
            </p>
          ) : (
            project.dataQualityFlags.map((flag) => <Badge key={flag}>{flagLabel(flag)}</Badge>)
          )}
        </div>
        <p className="detail-note">
          Data-quality flags mark fields that are incomplete or formatted unexpectedly in the
          underlying data, so the figures above can be read with the right context.
        </p>
      </Card>
    </>
  );
}
