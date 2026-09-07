import { useMemo, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';

import { assignsInspections, useCurrentRole } from '../../auth';
import {
  ASSIGNMENT_STATUS_LABEL,
  ASSIGNMENT_STATUSES,
  nextAssignmentStatuses,
  useAsyncData,
  useInspectionsService,
  type AssignmentStatus,
  type InspectionAssignment,
  type InspectionsData,
  type InspectionsService,
} from '../../data';
import { formatDate } from '../../format';
import {
  Button,
  Card,
  DataTable,
  EmptyState,
  ErrorState,
  Input,
  LoadingState,
  PageHeader,
  SearchInput,
  SectionHeader,
  Select,
  StatusBadge,
  Textarea,
  type Column,
  type StatusTone,
} from '../../ui';
import './inspections.css';

const STATUS_TONE: Record<AssignmentStatus, StatusTone> = {
  ASSIGNED: 'info',
  IN_PROGRESS: 'warning',
  COMPLETED: 'success',
  CANCELLED: 'neutral',
};

function StatusBadgeFor({ status }: { status: AssignmentStatus }) {
  return (
    <StatusBadge tone={STATUS_TONE[status]} srLabel="Status">
      {ASSIGNMENT_STATUS_LABEL[status]}
    </StatusBadge>
  );
}

/**
 * Inspections (`/inspections`).
 *
 * MoSPI / State / District assign a field officer to inspect an MPLADS work and
 * advance the assignment through Requested → In progress → Completed (or
 * Cancelled); Auditor / MP see the queue read-only. Every completed assignment
 * shows on the Audit Trail page. Reads through `useInspectionsService()` →
 * DataProvider.
 */
export function InspectionsPage() {
  const role = useCurrentRole();
  const canAssign = assignsInspections(role);
  const service = useInspectionsService();
  const [reloadKey, setReloadKey] = useState(0);

  const state = useAsyncData<InspectionsData>(
    (signal) => service.load(signal),
    [service, reloadKey],
  );

  return (
    <div className="ui-stack insp">
      <PageHeader
        breadcrumbs={[{ label: 'Home', to: '/' }, { label: 'Inspections' }]}
        title="Inspections"
        description={
          canAssign
            ? 'Assign a field officer to inspect an MPLADS work, then track the assignment through to a completed inspection. Records are indicators for review, not proof of wrongdoing.'
            : 'Field inspections assigned across MPLADS works and their current status.'
        }
      />

      {state.status === 'loading' && (
        <Card>
          <LoadingState label="Loading inspections" />
        </Card>
      )}

      {state.status === 'error' && (
        <Card>
          <ErrorState
            title="Could not load inspections"
            description={state.error.message}
            onRetry={() => setReloadKey((key) => key + 1)}
          />
        </Card>
      )}

      {state.status === 'success' && (
        <InspectionsBody data={state.data} service={service} canAssign={canAssign} />
      )}
    </div>
  );
}

interface AssignForm {
  sourceWorkId: string;
  officerCode: string;
  dueDate: string;
  note: string;
}

const EMPTY_FORM: AssignForm = { sourceWorkId: '', officerCode: '', dueDate: '', note: '' };

function InspectionsBody({
  data,
  service,
  canAssign,
}: {
  data: InspectionsData;
  service: InspectionsService;
  canAssign: boolean;
}) {
  const [added, setAdded] = useState<InspectionAssignment[]>([]);
  const [overrides, setOverrides] = useState<Record<string, InspectionAssignment>>({});
  const [statusFilter, setStatusFilter] = useState('');
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const addedIds = new Set(added.map((a) => a.id));
  const rows = [...added, ...data.assignments.filter((a) => !addedIds.has(a.id))].map(
    (a) => overrides[a.id] ?? a,
  );
  const filtered = statusFilter ? rows.filter((a) => a.status === statusFilter) : rows;

  async function advance(assignment: InspectionAssignment, status: AssignmentStatus) {
    setError(null);
    setNotice(null);
    try {
      const saved = await service.updateAssignment(assignment.id, { status });
      setOverrides((prev) => ({ ...prev, [saved.id]: saved }));
      setNotice(`Assignment ${saved.id} → ${ASSIGNMENT_STATUS_LABEL[saved.status]}.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update the assignment.');
    }
  }

  const columns: Column<InspectionAssignment>[] = [
    {
      key: 'work',
      header: 'Work',
      render: (a) => (
        <div className="insp-cell">
          <span>{a.workTitle}</span>
          <span className="insp-cell__sub">#{a.sourceWorkId}</span>
        </div>
      ),
    },
    {
      key: 'officer',
      header: 'Field officer',
      render: (a) => (
        <div className="insp-cell">
          <span>{a.officerName ?? '—'}</span>
          <span className="insp-cell__sub">{a.officerCode ?? ''}</span>
        </div>
      ),
    },
    { key: 'by', header: 'Requested by', render: (a) => a.assignedByName ?? '—' },
    {
      key: 'status',
      header: 'Status',
      render: (a) => {
        const next = nextAssignmentStatuses(a.status);
        if (!canAssign || next.length === 0) {
          return <StatusBadgeFor status={a.status} />;
        }
        return (
          <Select
            label={`Status for ${a.id}`}
            hideLabel
            value={a.status}
            options={[
              { value: a.status, label: ASSIGNMENT_STATUS_LABEL[a.status] },
              ...next.map((s) => ({ value: s, label: `→ ${ASSIGNMENT_STATUS_LABEL[s]}` })),
            ]}
            onChange={(e) => {
              const value = e.target.value as AssignmentStatus;
              if (value !== a.status) advance(a, value);
            }}
          />
        );
      },
    },
    { key: 'due', header: 'Due', render: (a) => (a.dueDate ? formatDate(a.dueDate) : '—') },
    { key: 'requested', header: 'Requested on', render: (a) => formatDate(a.assignedAt) },
    {
      key: 'trail',
      header: 'Audit Trail',
      render: (a) => (
        <Link className="ui-btn ui-btn--ghost ui-btn--sm" to={`/audit?work=${a.sourceWorkId}`}>
          Open trail <span aria-hidden>→</span>
        </Link>
      ),
    },
  ];

  return (
    <>
      {canAssign && (
        <AssignCard
          data={data}
          service={service}
          onAssigned={(assignment) => {
            setAdded((prev) => [assignment, ...prev]);
            setNotice(`Inspection requested — assignment ${assignment.id} for ${assignment.officerCode}.`);
            setError(null);
          }}
        />
      )}

      <Card>
        <SectionHeader
          title="Assignments"
          description={
            canAssign
              ? 'Advance each assignment as the officer works. A completed assignment appears on that work’s Audit Trail.'
              : 'Read-only view of inspection assignments and their status.'
          }
        />

        <div className="insp-filters" role="search" aria-label="Filter assignments">
          <Select
            label="Status"
            value={statusFilter}
            options={[
              { value: '', label: 'Any status' },
              ...ASSIGNMENT_STATUSES.map((s) => ({ value: s, label: ASSIGNMENT_STATUS_LABEL[s] })),
            ]}
            onChange={(e) => setStatusFilter(e.target.value)}
          />
          <span className="text-muted insp-filters__count">
            {filtered.length} of {rows.length} {rows.length === 1 ? 'assignment' : 'assignments'}
          </span>
        </div>

        {error ? (
          <p className="ui-field__error" role="alert">
            {error}
          </p>
        ) : null}
        {notice ? (
          <p className="insp-form__ok" role="status">
            {notice}
          </p>
        ) : null}

        <DataTable
          caption="Inspection assignments"
          columns={columns}
          rows={filtered}
          getRowKey={(a) => a.id}
          emptyState={
            <EmptyState
              title="No assignments"
              description={
                canAssign
                  ? 'Assign a work above to start an inspection.'
                  : 'No inspections have been assigned yet.'
              }
            />
          }
        />
      </Card>
    </>
  );
}

function AssignCard({
  data,
  service,
  onAssigned,
}: {
  data: InspectionsData;
  service: InspectionsService;
  onAssigned: (assignment: InspectionAssignment) => void;
}) {
  const [form, setForm] = useState<AssignForm>(EMPTY_FORM);
  const [search, setSearch] = useState('');
  const [fieldError, setFieldError] = useState<{ work?: string; officer?: string }>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const set = <K extends keyof AssignForm>(key: K, value: AssignForm[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const matches = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = q
      ? data.works.filter(
          (w) => w.label.toLowerCase().includes(q) || String(w.sourceWorkId).includes(q),
        )
      : data.works;
    return list.slice(0, 50);
  }, [data.works, search]);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    const errors: { work?: string; officer?: string } = {};
    if (!form.sourceWorkId) errors.work = 'Choose a work to inspect.';
    if (!form.officerCode) errors.officer = 'Choose a field officer.';
    setFieldError(errors);
    if (Object.keys(errors).length > 0) return;

    setSubmitting(true);
    setSubmitError(null);
    try {
      const saved = await service.assign({
        sourceWorkId: Number(form.sourceWorkId),
        officerCode: form.officerCode,
        dueDate: form.dueDate || null,
        note: form.note.trim() || null,
      });
      setForm(EMPTY_FORM);
      setSearch('');
      onAssigned(saved);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Could not create the assignment.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card>
      <SectionHeader title="Request an inspection" />
      <form className="insp-form" onSubmit={onSubmit} noValidate>
        <SearchInput
          label="Find a work"
          placeholder="Search by description or work id…"
          value={search}
          onValueChange={setSearch}
        />
        <div className="insp-form__row">
          <Select
            label="Work"
            value={form.sourceWorkId}
            error={fieldError.work}
            options={[
              { value: '', label: 'Select a work' },
              ...matches.map((w) => ({
                value: String(w.sourceWorkId),
                label: `${w.label} · #${w.sourceWorkId}`,
              })),
            ]}
            onChange={(e) => set('sourceWorkId', e.target.value)}
          />
          {data.works.length > matches.length ? (
            <p className="insp-form__hint text-muted">
              Showing {matches.length} of {data.works.length} works — narrow the search to see more.
            </p>
          ) : null}
        </div>

        <div className="insp-form__grid insp-form__row">
          <Select
            label="Field officer"
            value={form.officerCode}
            error={fieldError.officer}
            options={[
              { value: '', label: 'Select an officer' },
              ...data.officers.map((o) => ({
                value: o.officerCode,
                label: `${o.officerCode} — ${o.name}`,
              })),
            ]}
            onChange={(e) => set('officerCode', e.target.value)}
          />
          <Input
            label="Due date (optional)"
            type="date"
            value={form.dueDate}
            onChange={(e) => set('dueDate', e.target.value)}
          />
        </div>

        <div className="insp-form__row">
          <Textarea
            label="Instruction for the officer (optional)"
            value={form.note}
            rows={3}
            placeholder="e.g. verify against the reported ~70% completion"
            onChange={(e) => set('note', e.target.value)}
          />
        </div>

        {submitError ? (
          <p className="ui-field__error" role="alert">
            {submitError}
          </p>
        ) : null}

        <div className="insp-form__actions">
          <Button type="submit" disabled={submitting}>
            {submitting ? 'Assigning…' : 'Assign inspection'}
          </Button>
        </div>
      </form>
    </Card>
  );
}
