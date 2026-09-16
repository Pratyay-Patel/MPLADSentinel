import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import { useCurrentRole } from '../../auth';
import { useAsyncData, useEscrowService, type FundRequest, type FundRequestStatus } from '../../data';
import { formatDate, formatINRCompact } from '../../format';
import type { Money } from '../../data/types';
import {
  Button,
  Card,
  ConfirmDialog,
  EmptyState,
  ErrorState,
  KeyValueList,
  LoadingState,
  PageHeader,
  RiskLevelBadge,
  SectionHeader,
  StatusBadge,
  Toast,
  ViewProjectLink,
  type StatusTone,
} from '../../ui';
import { CalendarIcon, InfoIcon, RupeeIcon, ShieldIcon } from '../../ui/icons';
import './escrow.css';

const STATUS_TONE: Record<FundRequestStatus, StatusTone> = {
  APPROVED: 'success',
  REJECTED: 'danger',
};

const EVENT_LABEL: Record<FundRequest['history'][number]['eventType'], string> = {
  CREATED: 'Fund request created',
  APPROVED: 'Request approved',
  REJECTED: 'Request rejected',
  RELEASE_NOTICE_SENT: 'Release notice sent to bank',
};

function money(amount: number | null): Money | null {
  return amount == null ? null : { amount, currency: 'INR' };
}

function StatusBadgeFor({ status }: { status: FundRequestStatus }) {
  return (
    <StatusBadge tone={STATUS_TONE[status]} srLabel="Escrow status">
      {status}
    </StatusBadge>
  );
}

/**
 * Fund Request Details (`/escrow/:id`) — the full record for one installment
 * request: the work it's against, its financials, the automatic eligibility
 * decision (D22-style rule engine, no manual approve/reject), and the release
 * notice / history trail. Data comes through `useEscrowService()` → DataProvider.
 */
export function FundRequestDetail() {
  const params = useParams<{ id: string }>();
  const id = params.id ?? '';
  const role = useCurrentRole();
  const service = useEscrowService();
  const [reloadKey, setReloadKey] = useState(0);

  const state = useAsyncData<FundRequest | null>(
    (signal) => (id ? service.get(id, signal) : Promise.resolve(null)),
    [service, id, reloadKey],
    { isEmpty: (data) => data === null },
  );

  const title = state.status === 'success' ? state.data?.id : id || 'Fund request';

  return (
    <div className="ui-stack escrow">
      <PageHeader
        breadcrumbs={[
          { label: 'Home', to: '/' },
          { label: 'Escrow & Fund Control', to: '/escrow' },
          { label: title ?? id },
        ]}
        title={`Fund Request ${title ?? ''}`}
      />

      {state.status === 'loading' && (
        <Card>
          <LoadingState label="Loading fund request" />
        </Card>
      )}

      {state.status === 'empty' && (
        <Card>
          <EmptyState
            title="Fund request not found"
            description={`No fund request with id ${id} is available, or it does not belong to you.`}
            action={
              <Link className="ui-btn ui-btn--secondary ui-btn--sm" to="/escrow">
                Back to Escrow & Fund Control
              </Link>
            }
          />
        </Card>
      )}

      {state.status === 'error' && (
        <Card>
          <ErrorState
            title="Could not load this fund request"
            description={state.error.message}
            onRetry={() => setReloadKey((key) => key + 1)}
          />
        </Card>
      )}

      {state.status === 'success' && state.data && (
        <FundRequestDetailView
          request={state.data}
          canSendReleaseNotice={role === 'MOSPI'}
          onChanged={() => setReloadKey((key) => key + 1)}
        />
      )}
    </div>
  );
}

function FundRequestDetailView({
  request,
  canSendReleaseNotice,
  onChanged,
}: {
  request: FundRequest;
  canSendReleaseNotice: boolean;
  onChanged: () => void;
}) {
  const service = useEscrowService();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function sendReleaseNotice() {
    setError(null);
    setNotice(null);
    try {
      await service.sendReleaseNotice(request.id);
      setNotice(`Release notice sent to the bank for request ${request.id}.`);
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not send the release notice.');
    }
  }

  return (
    <>
      <Card>
        <SectionHeader
          title="Project Details"
          icon={<InfoIcon />}
          tone="info"
          description={`${request.workTitle} · #${request.sourceWorkId}`}
        />
        <KeyValueList
          items={[
            { label: 'Work', value: request.workTitle },
            { label: 'Work ID', value: `#${request.sourceWorkId}` },
            { label: 'District', value: request.district ?? '—' },
            { label: 'Open work record', value: <ViewProjectLink id={request.sourceWorkId} label={request.workTitle} /> },
          ]}
        />
      </Card>

      <Card>
        <SectionHeader title="Financial Details" icon={<RupeeIcon />} tone="warning" />
        <KeyValueList
          items={[
            { label: 'Sanctioned amount', value: formatINRCompact(money(request.sanctionedAmount)) },
            { label: 'Already released', value: formatINRCompact(money(request.alreadyReleased)) },
            { label: 'Remaining before this request', value: formatINRCompact(money(request.remainingBeforeRequest)) },
            { label: 'Requested amount', value: formatINRCompact(money(request.requestedAmount)) },
            { label: 'Remaining after this request', value: formatINRCompact(money(request.remainingAfterRequest)) },
          ]}
        />
      </Card>

      <Card>
        <SectionHeader title="Project / Eligibility Information" icon={<ShieldIcon />} tone="info" />
        <KeyValueList
          items={[
            { label: 'Current risk level', value: <RiskLevelBadge level={request.riskLevel ?? 'UNKNOWN'} /> },
            {
              label: 'Risk reasons',
              value:
                request.riskReasons.length > 0 ? (
                  <ul className="escrow-reasons">
                    {request.riskReasons.map((reason) => (
                      <li key={reason}>{reason}</li>
                    ))}
                  </ul>
                ) : (
                  '—'
                ),
            },
          ]}
        />
      </Card>

      <Card>
        <SectionHeader title="Request Details" icon={<CalendarIcon />} tone="neutral" />
        <KeyValueList
          items={[
            { label: 'Requesting officer', value: request.requestedByName ?? request.requestedByUsername ?? '—' },
            { label: 'Requested on', value: formatDate(request.createdAt) },
            { label: 'Remarks', value: request.remarks ?? '—' },
          ]}
        />
      </Card>

      <Card>
        <SectionHeader title="Escrow Decision" icon={<ShieldIcon />} tone={request.status === 'APPROVED' ? 'success' : 'danger'} />
        <KeyValueList
          items={[
            { label: 'Escrow status', value: <StatusBadgeFor status={request.status} /> },
            { label: 'Decision date', value: formatDate(request.decidedAt) },
            { label: 'Reason', value: request.decisionReason },
          ]}
        />
      </Card>

      <Card>
        <SectionHeader title="Release Notice" icon={<RupeeIcon />} tone="info" />
        {request.status !== 'APPROVED' ? (
          <p className="text-muted">
            Not applicable — this request was rejected, so no release notice can be sent.
          </p>
        ) : request.releaseNoticeSent ? (
          <KeyValueList
            items={[
              { label: 'Status', value: <StatusBadge tone="info" srLabel="Release notice">RELEASE NOTICE SENT</StatusBadge> },
              { label: 'Sent by', value: request.releaseNoticeByName ?? '—' },
              { label: 'Sent on', value: formatDate(request.releaseNoticeAt) },
            ]}
          />
        ) : (
          <>
            <p className="text-muted">
              Not yet sent. {canSendReleaseNotice ? 'You can send a release notice to the bank below.' : 'MoSPI / Ministry Authority can send a release notice from here.'}
            </p>
            {canSendReleaseNotice && (
              <div className="escrow-actions">
                <Button variant="primary" onClick={() => setConfirmOpen(true)}>
                  Send Release Notice
                </Button>
              </div>
            )}
          </>
        )}
        {error && (
          <p className="ui-field__error" role="alert">
            {error}
          </p>
        )}
        {notice && <Toast key={notice} message={notice} onDismiss={() => setNotice(null)} />}
      </Card>

      <Card>
        <SectionHeader title="Request History" icon={<CalendarIcon />} tone="neutral" description="Full chronological trail — kept event-for-event compatible with a future blockchain audit log, not implemented in Round 1." />
        <ol className="escrow-timeline">
          {request.history.map((event, index) => (
            <li className="escrow-timeline__item" key={`${event.eventType}-${event.occurredAt}-${index}`}>
              <span className="escrow-timeline__date">{formatDate(event.occurredAt)}</span>
              <span className="escrow-timeline__label">{EVENT_LABEL[event.eventType]}</span>
              {event.actorName && <span className="escrow-timeline__actor">by {event.actorName}</span>}
              {event.detail && <span className="escrow-timeline__detail">{event.detail}</span>}
            </li>
          ))}
        </ol>
      </Card>

      <ConfirmDialog
        open={confirmOpen}
        title={`Send release notice for request ${request.id}?`}
        description={`This records that a release notice for ${formatINRCompact(money(request.requestedAmount))} for ${request.workTitle} has been sent to the bank. This only updates the status here — no actual bank integration or fund transfer takes place.`}
        confirmWord="SEND"
        confirmLabel="Send Release Notice"
        tone="success"
        onCancel={() => setConfirmOpen(false)}
        onConfirm={() => {
          setConfirmOpen(false);
          void sendReleaseNotice();
        }}
      />
    </>
  );
}
