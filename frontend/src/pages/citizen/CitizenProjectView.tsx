import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import {
  useAsyncData,
  useCitizenService,
  type LifecycleState,
  type PublicProject,
} from '../../data';
import { formatDate, formatINRExact, workTitle } from '../../format';
import {
  Card,
  EmptyState,
  ErrorState,
  KeyValueList,
  LoadingState,
  PageHeader,
  SectionHeader,
  StatusBadge,
  type StatusTone,
} from '../../ui';

const HOUSE_LABEL: Record<string, string> = {
  LOK_SABHA: 'Lok Sabha',
  RAJYA_SABHA: 'Rajya Sabha',
};
const STATUS_TONE: Record<LifecycleState, StatusTone> = {
  RECOMMENDED: 'info',
  COMPLETED: 'success',
  RECOMMENDED_AND_COMPLETED: 'normal',
};
const STATUS_LABEL: Record<LifecycleState, string> = {
  RECOMMENDED: 'Recommended',
  COMPLETED: 'Completed',
  RECOMMENDED_AND_COMPLETED: 'Recommended + completed',
};

const dash = (value: string | number | null | undefined) =>
  value === null || value === undefined || value === '' ? '—' : String(value);

/**
 * Public work view (`/citizen/:id`) — the publicly releasable summary for one
 * MPLADS work. Renders a {@link PublicProject}: no risk assessment, no
 * data-quality flags, no payment-retrieval internals or provenance framing.
 */
export function CitizenProjectView() {
  const params = useParams<{ id: string }>();
  const reference = Number(params.id);
  const validId = Number.isFinite(reference) && reference > 0;

  const service = useCitizenService();
  const [reloadKey, setReloadKey] = useState(0);

  const state = useAsyncData<PublicProject | null>(
    (signal) => (validId ? service.get(reference, signal) : Promise.resolve(null)),
    [service, reference, validId, reloadKey],
    { isEmpty: (data) => data === null },
  );

  const project = state.status === 'success' ? state.data : undefined;
  const title = project
    ? workTitle(project.workDescription, reference)
    : validId
      ? `Work #${reference}`
      : 'Work';

  return (
    <div className="ui-stack cit">
      <PageHeader
        breadcrumbs={[{ label: 'Citizen Portal', to: '/citizen' }, { label: title }]}
        title={title}
        description={
          project
            ? [project.category, project.state].filter(Boolean).join(' · ') || undefined
            : undefined
        }
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
            description="No MPLADS work is available for that link."
            action={
              <Link className="ui-btn ui-btn--secondary ui-btn--sm" to="/citizen">
                Back to Citizen Portal
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

      {state.status === 'success' && project && <PublicView project={project} />}
    </div>
  );
}

function PublicView({ project }: { project: PublicProject }) {
  return (
    <>
      <Card>
        <SectionHeader
          title="Overview"
          actions={
            <StatusBadge tone={STATUS_TONE[project.status]} srLabel="Status">
              {STATUS_LABEL[project.status]}
            </StatusBadge>
          }
        />
        <KeyValueList
          items={[
            { label: 'Work', value: dash(project.workDescription) },
            { label: 'Category', value: dash(project.category) },
            { label: 'Expected beneficiaries', value: dash(project.expectedBeneficiaries) },
          ]}
        />
      </Card>

      <Card>
        <SectionHeader title="Representation" />
        <KeyValueList
          items={[
            { label: 'Member of Parliament', value: dash(project.memberOfParliament) },
            { label: 'Constituency', value: dash(project.constituency) },
            {
              label: 'House',
              value: project.house ? (HOUSE_LABEL[project.house] ?? project.house) : '—',
            },
            { label: 'Lok Sabha term', value: dash(project.lsTerm) },
          ]}
        />
      </Card>

      <Card>
        <SectionHeader title="Location" />
        <KeyValueList
          items={[
            { label: 'State', value: dash(project.state) },
            { label: 'District', value: dash(project.district) },
            { label: 'Location', value: dash(project.location) },
          ]}
        />
      </Card>

      <Card>
        <SectionHeader
          title="Funding"
          description="Estimated and final cost are separate figures."
        />
        <KeyValueList
          items={[
            { label: 'Estimated cost (recommended)', value: formatINRExact(project.estimatedCost) },
            { label: 'Final cost (completed)', value: formatINRExact(project.finalCost) },
          ]}
        />
      </Card>

      <Card>
        <SectionHeader
          title="Dates"
          description="Source-reported dates only — not a verified project lifecycle."
        />
        <KeyValueList
          items={[
            { label: 'Recommended on', value: formatDate(project.recommendedOn) },
            { label: 'Recommended year', value: dash(project.recommendedYear) },
            { label: 'Completed on', value: formatDate(project.completedOn) },
            { label: 'Completion year', value: dash(project.completionYear) },
          ]}
        />
      </Card>

      <p className="detail-note">
        This is publicly released summary information compiled from an MPLADS transparency data
        source. It is not an official government record.
      </p>
    </>
  );
}
