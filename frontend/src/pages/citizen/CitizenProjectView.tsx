import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import {
  useAsyncData,
  useCitizenService,
  type AsyncState,
  type LifecycleState,
  type PaymentInstallment,
  type PublicProject,
} from '../../data';
import { formatDate, formatINRExact, workTitle } from '../../format';
import {
  Card,
  DataTable,
  EmptyState,
  ErrorState,
  KeyValueList,
  LoadingState,
  PageHeader,
  ProjectLocationMap,
  SectionHeader,
  StatusBadge,
  type Column,
  type StatusTone,
} from '../../ui';
import { CalendarIcon, InfoIcon, MapPinIcon, RupeeIcon, UsersIcon } from '../../ui/icons';
import { PAYMENT_STATE_LABEL, PAYMENT_STATE_NOTE, PAYMENT_STATE_TONE } from '../project-detail/labels';

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
 * data-quality flags, no provenance framing. It does show the recorded
 * payment installments — public expenditure data, not a risk signal — via the
 * separate public payments call.
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

  const paymentsState = useAsyncData<PaymentInstallment[]>(
    (signal) => (validId ? service.getPayments(reference, signal) : Promise.resolve([])),
    [service, reference, validId, reloadKey],
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
        breadcrumbs={[
          { label: 'Home', to: '/' },
          { label: 'Citizen Portal', to: '/citizen' },
          { label: title },
        ]}
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

      {state.status === 'success' && project && (
        <PublicView project={project} paymentsState={paymentsState} />
      )}
    </div>
  );
}

function PublicView({
  project,
  paymentsState,
}: {
  project: PublicProject;
  paymentsState: AsyncState<PaymentInstallment[]>;
}) {
  return (
    <>
      <Card>
        <SectionHeader
          title="Overview"
          icon={<InfoIcon />}
          tone="info"
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
        <SectionHeader title="Representation" icon={<UsersIcon />} tone="success" />
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
        <SectionHeader title="Location" icon={<MapPinIcon />} tone="warning" />
        <KeyValueList
          items={[
            { label: 'State', value: dash(project.state) },
            { label: 'District', value: dash(project.district) },
            { label: 'Location', value: dash(project.location) },
          ]}
        />
        <ProjectLocationMap state={project.state} district={project.district} />
      </Card>

      <Card>
        <SectionHeader
          title="Funding"
          description="Estimated and final cost are separate figures."
          icon={<RupeeIcon />}
          tone="neutral"
        />
        <KeyValueList
          items={[
            { label: 'Estimated cost (recommended)', value: formatINRExact(project.estimatedCost) },
            { label: 'Final cost (completed)', value: formatINRExact(project.finalCost) },
          ]}
        />
      </Card>

      <PublicPaymentsSection project={project} paymentsState={paymentsState} />

      <Card>
        <SectionHeader
          title="Dates"
          description="Key dates recorded for this work."
          icon={<CalendarIcon />}
          tone="info"
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
        This page presents publicly available information about the work — what was sanctioned,
        where, under which representative, and its current status.
      </p>
    </>
  );
}

const paymentColumns: Column<PaymentInstallment>[] = [
  { key: 'ordinal', header: '#', render: (row) => row.ordinal + 1 },
  { key: 'amount', header: 'Amount', align: 'right', render: (row) => formatINRExact(row.amount) },
  { key: 'paidOn', header: 'Paid on', render: (row) => formatDate(row.paidOn) },
  { key: 'vendor', header: 'Vendor', render: (row) => row.vendorName ?? '—' },
];

function PublicPaymentsSection({
  project,
  paymentsState,
}: {
  project: PublicProject;
  paymentsState: AsyncState<PaymentInstallment[]>;
}) {
  const dataState = project.paymentDataState;

  return (
    <Card>
      <SectionHeader
        title="Recorded payments"
        description="Which vendor was paid, how much, and when — from the same recorded-payment source as the estimated/final cost above."
        icon={<RupeeIcon />}
        tone="success"
        actions={
          <StatusBadge tone={PAYMENT_STATE_TONE[dataState]} srLabel="Payment data state">
            {PAYMENT_STATE_LABEL[dataState]}
          </StatusBadge>
        }
      />
      <p className="detail-note" style={{ marginTop: 0 }}>
        {PAYMENT_STATE_NOTE[dataState]}
      </p>

      {dataState === 'FETCHED_PRESENT' && (
        <>
          <div style={{ marginTop: 'var(--space-4)' }}>
            <KeyValueList
              items={[
                { label: 'Total recorded payments', value: formatINRExact(project.recordedPayments) },
                { label: 'Installments', value: project.paymentInstallments ?? '—' },
              ]}
            />
          </div>
          <div style={{ marginTop: 'var(--space-4)' }}>
            {paymentsState.status === 'loading' && <LoadingState label="Loading payment installments" />}
            {paymentsState.status === 'error' && (
              <p className="detail-note">Payment installment rows could not be loaded right now.</p>
            )}
            {paymentsState.status === 'success' && (
              <DataTable
                caption="Payment installments"
                columns={paymentColumns}
                rows={paymentsState.data}
                getRowKey={(row) => row.ordinal}
                emptyState={
                  <EmptyState
                    title="No installment rows"
                    description="The summary reports payments but no installment rows were returned."
                  />
                }
              />
            )}
          </div>
        </>
      )}
    </Card>
  );
}
