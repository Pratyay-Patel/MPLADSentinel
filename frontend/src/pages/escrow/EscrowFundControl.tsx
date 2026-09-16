import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';

import { useCurrentRole } from '../../auth';
import {
  evaluateFundEligibility,
  pickRiskBalancedSample,
  remainingFunds,
  useAsyncData,
  useEscrowService,
  type EscrowData,
  type EscrowWorkOption,
  type FundRequest,
  type FundRequestStatus,
} from '../../data';
import { formatCount, formatDate, formatINRCompact, workTitle } from '../../format';
import type { Money } from '../../data/types';
import {
  Button,
  Card,
  ConfirmDialog,
  DataTable,
  EmptyState,
  ErrorState,
  Input,
  KeyValueList,
  LoadingState,
  MetricCard,
  PageHeader,
  RiskLevelBadge,
  SearchInput,
  SectionHeader,
  Select,
  StatusBadge,
  Textarea,
  Toast,
  ViewProjectLink,
  type Column,
  type StatusTone,
} from '../../ui';
import { CircleCheckIcon, ClipboardListIcon, RupeeIcon, SendIcon } from '../../ui/icons';
import './escrow.css';

const STATUS_TONE: Record<FundRequestStatus, StatusTone> = {
  APPROVED: 'success',
  REJECTED: 'danger',
};

/** Works shown per risk level in the picker's default (no search) view. */
const WORKS_PER_RISK_LEVEL = 15;

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

function ReleaseNoticeCell({ request }: { request: FundRequest }) {
  if (request.status !== 'APPROVED') return <span className="text-muted">—</span>;
  return request.releaseNoticeSent ? (
    <StatusBadge tone="info" srLabel="Release notice">
      RELEASE NOTICE SENT
    </StatusBadge>
  ) : (
    <span className="text-muted">Not sent</span>
  );
}

/**
 * Escrow & Fund Control (`/escrow`). District Officer requests an installment
 * for a work; a rule-based eligibility engine (funds sufficiency + current
 * risk, decision D22) decides APPROVED/REJECTED immediately — there is no
 * manual approve/reject step. MoSPI sees every request and can record a
 * "release notice to bank" for an approved one — a database flag only, never
 * a real bank call or fund transfer. Data comes via `useEscrowService()` →
 * DataProvider.
 */
export function EscrowFundControl() {
  const role = useCurrentRole();
  const service = useEscrowService();
  const [reloadKey, setReloadKey] = useState(0);

  const state = useAsyncData<EscrowData>((signal) => service.load(signal), [service, reloadKey]);

  return (
    <div className="ui-stack escrow">
      <PageHeader
        breadcrumbs={[{ label: 'Home', to: '/' }, { label: 'Escrow & Fund Control' }]}
        title="Escrow & Fund Control"
        description={
          role === 'DISTRICT'
            ? 'Request an installment for a work. Requests are approved or rejected immediately by an automatic eligibility check against the work’s remaining sanctioned funds and current risk assessment — there is no manual review.'
            : 'Every fund request across all districts. Approved requests are decided automatically; send a release notice to the bank once you have reviewed one. This only sets a status in the database — no bank integration or fund transfer happens.'
        }
      />

      {state.status === 'loading' && (
        <Card>
          <LoadingState label="Loading fund requests" />
        </Card>
      )}

      {state.status === 'error' && (
        <Card>
          <ErrorState
            title="Could not load fund requests"
            description={state.error.message}
            onRetry={() => setReloadKey((key) => key + 1)}
          />
        </Card>
      )}

      {state.status === 'success' && role === 'DISTRICT' && (
        <DistrictView data={state.data} onChanged={() => setReloadKey((key) => key + 1)} />
      )}
      {state.status === 'success' && role !== 'DISTRICT' && (
        <MinistryView data={state.data} onChanged={() => setReloadKey((key) => key + 1)} />
      )}
    </div>
  );
}

function SummaryCards({ data, showAll }: { data: EscrowData; showAll: boolean }) {
  return (
    <div className="ui-metric-grid">
      <MetricCard
        label={showAll ? 'All requests' : 'Total requests'}
        value={formatCount(data.summary.totalRequests)}
        icon={<ClipboardListIcon />}
      />
      <MetricCard label="Approved" value={formatCount(data.summary.approved)} tone="success" />
      <MetricCard label="Rejected" value={formatCount(data.summary.rejected)} tone="danger" />
      {showAll && (
        <MetricCard label="Release notices sent" value={formatCount(data.summary.releaseNoticesSent)} tone="info" />
      )}
      <MetricCard label="Total requested" value={formatINRCompact(money(data.summary.totalRequestedAmount))} icon={<RupeeIcon />} />
      <MetricCard label="Total approved" value={formatINRCompact(money(data.summary.totalApprovedAmount))} tone="success" />
    </div>
  );
}

function WorkCell({ request }: { request: FundRequest }) {
  return (
    <div className="escrow-cell">
      <span className="escrow-cell__title">{request.workTitle}</span>
      <span className="escrow-cell__sub">
        #{request.sourceWorkId} · {request.district ?? '—'}
      </span>
      <ViewProjectLink id={request.sourceWorkId} label={request.workTitle} />
    </div>
  );
}

function DistrictView({ data, onChanged }: { data: EscrowData; onChanged: () => void }) {
  const [showForm, setShowForm] = useState(false);

  const columns: Column<FundRequest>[] = [
    { key: 'id', header: 'Request ID', render: (r) => r.id },
    { key: 'work', header: 'Work', render: (r) => <WorkCell request={r} /> },
    { key: 'amount', header: 'Requested', align: 'right', render: (r) => formatINRCompact(money(r.requestedAmount)) },
    { key: 'date', header: 'Request date', render: (r) => formatDate(r.createdAt) },
    { key: 'status', header: 'Escrow status', render: (r) => <StatusBadgeFor status={r.status} /> },
    { key: 'reason', header: 'Reason', render: (r) => <span className="escrow-reason">{r.decisionReason}</span> },
    { key: 'release', header: 'Release notice', render: (r) => <ReleaseNoticeCell request={r} /> },
    {
      key: 'action',
      header: 'Details',
      render: (r) => (
        <Link className="ui-btn ui-btn--ghost ui-btn--sm" to={`/escrow/${r.id}`}>
          View <span aria-hidden>→</span>
        </Link>
      ),
    },
  ];

  return (
    <>
      <SummaryCards data={data} showAll={false} />

      <Card>
        <SectionHeader
          title="My fund requests"
          icon={<RupeeIcon />}
          tone="info"
          description="Track every installment request you have submitted and its outcome."
        />
        <div className="escrow-actions">
          <Button variant="primary" icon={<SendIcon />} onClick={() => setShowForm((s) => !s)}>
            {showForm ? 'Close' : 'Request Installment'}
          </Button>
        </div>

        {showForm && (
          <CreateFundRequestForm
            onCreated={() => {
              setShowForm(false);
              onChanged();
            }}
            onCancel={() => setShowForm(false)}
          />
        )}

        <DataTable
          caption="My fund requests"
          columns={columns}
          rows={data.requests}
          getRowKey={(r) => r.id}
          emptyState={
            <EmptyState
              title="No fund requests yet"
              description="Requests you submit for an installment appear here, along with the automatic decision."
            />
          }
        />
      </Card>
    </>
  );
}

function CreateFundRequestForm({ onCreated, onCancel }: { onCreated: () => void; onCancel: () => void }) {
  const escrowService = useEscrowService();

  const [options, setOptions] = useState<EscrowWorkOption[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    escrowService
      .listWorkOptions(controller.signal)
      .then((data) => {
        if (controller.signal.aborted) return;
        setOptions(data);
      })
      .catch((err) => {
        if (controller.signal.aborted) return;
        setLoadError(err instanceof Error ? err.message : 'Could not load works.');
      });
    return () => controller.abort();
  }, [escrowService]);

  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [amount, setAmount] = useState('');
  const [remarks, setRemarks] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmation, setConfirmation] = useState<FundRequest | null>(null);

  const selectedOption = options?.find((o) => o.project.sourceWorkId === selectedId) ?? null;
  const selectedProject = selectedOption?.project ?? null;
  const risk = selectedOption?.risk ?? null;

  const filteredOptions = useMemo(() => {
    if (!options) return [];
    const q = search.trim().toLowerCase();
    if (!q) return pickRiskBalancedSample(options, WORKS_PER_RISK_LEVEL);
    return options
      .filter(
        ({ project }) =>
          String(project.sourceWorkId).includes(q) ||
          (project.workDescription ?? '').toLowerCase().includes(q) ||
          (project.district ?? '').toLowerCase().includes(q),
      )
      .slice(0, 50);
  }, [options, search]);

  const requestedAmountNumber = Number(amount);
  const hasValidAmount = amount !== '' && !Number.isNaN(requestedAmountNumber) && requestedAmountNumber > 0;
  const preview =
    selectedProject && hasValidAmount
      ? evaluateFundEligibility(selectedProject, requestedAmountNumber, risk)
      : null;
  const remaining = selectedProject ? remainingFunds(selectedProject) : null;

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!selectedProject) {
      setError('Choose a work first.');
      return;
    }
    if (!hasValidAmount) {
      setError('Enter a valid requested amount.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const saved = await escrowService.createRequest({
        sourceWorkId: selectedProject.sourceWorkId,
        requestedAmount: requestedAmountNumber,
        remarks: remarks.trim() || null,
      });
      setConfirmation(saved);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not submit the fund request.');
    } finally {
      setSubmitting(false);
    }
  }

  if (confirmation) {
    return (
      <div className="escrow-confirm">
        <span className="escrow-confirm__icon" aria-hidden>
          <CircleCheckIcon />
        </span>
        <h3 className="escrow-confirm__title">Request submitted</h3>
        <p>
          Reference <strong>{confirmation.id}</strong> for {confirmation.workTitle} — <StatusBadgeFor status={confirmation.status} />
        </p>
        <p className="escrow-confirm__reason">{confirmation.decisionReason}</p>
        <Button onClick={onCreated}>Done</Button>
      </div>
    );
  }

  return (
    <form className="escrow-form" onSubmit={onSubmit} noValidate>
      {loadError && (
        <p className="ui-field__error" role="alert">
          {loadError}
        </p>
      )}

      {!selectedProject && (
        <>
          <SearchInput
            label="Find a work"
            placeholder="Search by id, description or district…"
            value={search}
            onValueChange={setSearch}
          />
          {!search.trim() && (
            <p className="text-muted escrow-work-list__hint">
              Showing up to {WORKS_PER_RISK_LEVEL} works per risk level (HIGH/MEDIUM/LOW/UNKNOWN) so
              you can test every outcome. Search to find a specific work instead.
            </p>
          )}
          <div className="escrow-work-list" role="listbox" aria-label="Select a work">
            {filteredOptions.map(({ project, risk: optionRisk }) => (
              <button
                type="button"
                key={project.sourceWorkId}
                className="escrow-work-list__item"
                onClick={() => setSelectedId(project.sourceWorkId)}
              >
                <span className="escrow-work-list__row">
                  <span className="escrow-work-list__title">
                    {workTitle(project.workDescription, project.sourceWorkId)}
                  </span>
                  <RiskLevelBadge level={optionRisk.level} />
                </span>
                <span className="escrow-work-list__sub">
                  #{project.sourceWorkId} · {[project.state, project.district].filter(Boolean).join(' · ') || '—'}
                </span>
              </button>
            ))}
            {options && filteredOptions.length === 0 && <p className="text-muted">No works match.</p>}
          </div>
        </>
      )}

      {selectedProject && (
        <div className="escrow-selected-work">
          <div className="escrow-selected-work__head">
            <div>
              <span className="escrow-selected-work__title">
                {workTitle(selectedProject.workDescription, selectedProject.sourceWorkId)}
              </span>
              <span className="escrow-selected-work__sub">
                #{selectedProject.sourceWorkId} · {[selectedProject.state, selectedProject.district].filter(Boolean).join(' · ') || '—'}
              </span>
            </div>
            <Button type="button" variant="ghost" size="sm" onClick={() => setSelectedId(null)}>
              Change work
            </Button>
          </div>

          <KeyValueList
            items={[
              { label: 'Sanctioned amount', value: formatINRCompact(selectedProject.estimatedCost) },
              { label: 'Remaining sanctioned funds', value: formatINRCompact(money(remaining)) },
              {
                label: 'Current risk',
                value: risk ? <RiskLevelBadge level={risk.level} /> : <RiskLevelBadge level="UNKNOWN" />,
              },
            ]}
          />

          <Input
            label="Requested installment amount (₹)"
            required
            type="number"
            min="1"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
          <Textarea
            label="Remarks / reason (optional)"
            rows={3}
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
            placeholder="Why is this installment needed now?"
          />

          {preview && (
            <div className={`escrow-eligibility escrow-eligibility--${preview.status.toLowerCase()}`}>
              <span className="escrow-eligibility__title">Eligibility Summary</span>
              <ul className="escrow-eligibility__checks">
                <li data-pass={remaining != null && requestedAmountNumber <= remaining}>
                  Requested amount is within the remaining sanctioned funds
                </li>
                <li data-pass={risk == null || risk.level !== 'HIGH'}>Work is not currently assessed HIGH risk</li>
              </ul>
              <p className="escrow-eligibility__result">
                Likely outcome: <StatusBadgeFor status={preview.status} /> — {preview.reason}
              </p>
            </div>
          )}

          {error && (
            <p className="ui-field__error" role="alert">
              {error}
            </p>
          )}

          <div className="escrow-form__actions">
            <Button type="button" variant="secondary" onClick={onCancel}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" icon={<SendIcon />} disabled={submitting}>
              {submitting ? 'Submitting…' : 'Submit Fund Request'}
            </Button>
          </div>
        </div>
      )}
    </form>
  );
}

function MinistryView({ data, onChanged }: { data: EscrowData; onChanged: () => void }) {
  const escrowService = useEscrowService();
  const [statusFilter, setStatusFilter] = useState('');
  const [districtFilter, setDistrictFilter] = useState('');
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [releaseTarget, setReleaseTarget] = useState<FundRequest | null>(null);
  const [overrides, setOverrides] = useState<Record<string, FundRequest>>({});

  const rows = data.requests.map((r) => overrides[r.id] ?? r);

  const districts = useMemo(
    () => Array.from(new Set(rows.map((r) => r.district).filter((d): d is string => Boolean(d)))).sort(),
    [rows],
  );

  const filtered = rows.filter(
    (r) => (!statusFilter || r.status === statusFilter) && (!districtFilter || r.district === districtFilter),
  );

  async function sendReleaseNotice(request: FundRequest) {
    setError(null);
    setNotice(null);
    try {
      const saved = await escrowService.sendReleaseNotice(request.id);
      setOverrides((prev) => ({ ...prev, [saved.id]: saved }));
      setNotice(`Release notice sent to the bank for request ${saved.id}.`);
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not send the release notice.');
    }
  }

  const columns: Column<FundRequest>[] = [
    { key: 'id', header: 'Request ID', render: (r) => r.id },
    { key: 'work', header: 'Work', render: (r) => <WorkCell request={r} /> },
    { key: 'officer', header: 'Requesting officer', render: (r) => r.requestedByName ?? r.requestedByUsername ?? '—' },
    { key: 'amount', header: 'Requested', align: 'right', render: (r) => formatINRCompact(money(r.requestedAmount)) },
    { key: 'date', header: 'Request date', render: (r) => formatDate(r.createdAt) },
    { key: 'status', header: 'Escrow status', render: (r) => <StatusBadgeFor status={r.status} /> },
    { key: 'decision', header: 'Decision date', render: (r) => formatDate(r.decidedAt) },
    { key: 'release', header: 'Release notice', render: (r) => <ReleaseNoticeCell request={r} /> },
    {
      key: 'action',
      header: 'Action',
      align: 'right',
      render: (r) =>
        r.status === 'APPROVED' && !r.releaseNoticeSent ? (
          <Button size="sm" onClick={() => setReleaseTarget(r)}>
            Send Release Notice
          </Button>
        ) : (
          <Link className="ui-btn ui-btn--ghost ui-btn--sm" to={`/escrow/${r.id}`}>
            View <span aria-hidden>→</span>
          </Link>
        ),
    },
  ];

  return (
    <>
      <SummaryCards data={{ ...data, requests: rows }} showAll />

      <Card>
        <SectionHeader
          title="Fund requests"
          icon={<RupeeIcon />}
          tone="info"
          description="Every installment request across all districts. Approved/rejected automatically; send a release notice to the bank for an approved request once reviewed."
        />

        <div className="escrow-filters" role="search" aria-label="Filter fund requests">
          <Select
            label="Escrow status"
            value={statusFilter}
            options={[
              { value: '', label: 'All statuses' },
              { value: 'APPROVED', label: 'Approved' },
              { value: 'REJECTED', label: 'Rejected' },
            ]}
            onChange={(e) => setStatusFilter(e.target.value)}
          />
          <Select
            label="District"
            value={districtFilter}
            options={[{ value: '', label: 'All districts' }, ...districts.map((d) => ({ value: d, label: d }))]}
            onChange={(e) => setDistrictFilter(e.target.value)}
          />
          <span className="text-muted escrow-filters__count">
            {filtered.length} of {rows.length} {rows.length === 1 ? 'request' : 'requests'}
          </span>
        </div>

        {error && (
          <p className="ui-field__error" role="alert">
            {error}
          </p>
        )}
        {notice && <Toast key={notice} message={notice} onDismiss={() => setNotice(null)} />}

        <DataTable
          caption="Fund requests"
          columns={columns}
          rows={filtered}
          getRowKey={(r) => r.id}
          emptyState={<EmptyState title="No fund requests" description="No district officer has requested an installment yet." />}
        />
      </Card>

      <ConfirmDialog
        open={releaseTarget != null}
        title={releaseTarget ? `Send release notice for request ${releaseTarget.id}?` : ''}
        description={
          releaseTarget
            ? `This records that a release notice for ${formatINRCompact(money(releaseTarget.requestedAmount))} for ${releaseTarget.workTitle} has been sent to the bank. This only updates the status here — no actual bank integration or fund transfer takes place.`
            : ''
        }
        confirmWord="SEND"
        confirmLabel="Send Release Notice"
        tone="success"
        onCancel={() => setReleaseTarget(null)}
        onConfirm={() => {
          if (!releaseTarget) return;
          void sendReleaseNotice(releaseTarget);
          setReleaseTarget(null);
        }}
      />
    </>
  );
}
