import { useMemo, useState, type FormEvent } from 'react';

import { actionsGrievances, reviewsGrievances, useSession } from '../../auth';
import {
  GRIEVANCE_CATEGORIES,
  GRIEVANCE_STATUS_LABEL,
  GRIEVANCE_STATUSES,
  useAsyncData,
  useGrievancesService,
  type Grievance,
  type GrievanceInput,
  type GrievanceStatus,
  type GrievancesData,
  type GrievancesService,
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
  SectionHeader,
  Select,
  StatusBadge,
  Textarea,
  type Column,
  type SelectOption,
  type StatusTone,
} from '../../ui';

const STATUS_TONE: Record<GrievanceStatus, StatusTone> = {
  SUBMITTED: 'info',
  UNDER_REVIEW: 'warning',
  ACTIONED: 'success',
  CLOSED: 'neutral',
};

function StatusBadgeFor({ status }: { status: GrievanceStatus }) {
  return (
    <StatusBadge tone={STATUS_TONE[status]} srLabel="Status">
      {GRIEVANCE_STATUS_LABEL[status]}
    </StatusBadge>
  );
}

// --- citizen submission form -----------------------------------------------

interface FormState {
  category: string;
  subject: string;
  description: string;
  workReference: string;
  contactName: string;
  contactEmail: string;
}

const EMPTY_FORM: FormState = {
  category: '',
  subject: '',
  description: '',
  workReference: '',
  contactName: '',
  contactEmail: '',
};

type FieldErrors = Partial<Record<'category' | 'subject' | 'description' | 'contactEmail', string>>;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validate(form: FormState): FieldErrors {
  const errors: FieldErrors = {};
  if (!form.category) errors.category = 'Choose a category.';
  if (!form.subject.trim()) errors.subject = 'Add a short subject.';
  if (form.description.trim().length < 20) {
    errors.description = 'Describe the issue in at least 20 characters.';
  }
  if (form.contactEmail.trim() && !EMAIL_RE.test(form.contactEmail.trim())) {
    errors.contactEmail = 'Enter a valid email address, or leave it blank.';
  }
  return errors;
}

function toInput(form: FormState): GrievanceInput {
  return {
    category: form.category,
    subject: form.subject.trim(),
    description: form.description.trim(),
    workReference: form.workReference ? Number(form.workReference) : null,
    contactName: form.contactName.trim() || null,
    contactEmail: form.contactEmail.trim() || null,
  };
}

function useWorkLabel(data: GrievancesData) {
  return useMemo(() => {
    const map = new Map(data.workOptions.map((o) => [o.reference, o.label]));
    return (reference: number | null) =>
      reference == null ? 'General' : (map.get(reference) ?? `#${reference}`);
  }, [data.workOptions]);
}

/**
 * Grievances (`/grievances`).
 *
 * Role-aware: a citizen gets a submission form plus the grievances they have
 * raised; every other role gets a review queue (MoSPI / State / District can
 * change status and add an action note; Auditor and MP see it read-only). Both
 * views read through `useGrievancesService()` → DataProvider. Submissions and
 * status changes are held by the DemoDataProvider for the session until the
 * `grievances` table / API exists.
 */
export function Grievances() {
  const { role } = useSession();
  const service = useGrievancesService();
  const [reloadKey, setReloadKey] = useState(0);
  const isReviewer = reviewsGrievances(role);

  const state = useAsyncData<GrievancesData>(
    (signal) => service.load(signal),
    [service, role, reloadKey],
  );

  return (
    <div className="ui-stack grv">
      <PageHeader
        title="Grievances"
        description={
          isReviewer
            ? 'Grievances raised by citizens about MPLADS works. Review each one and record the action taken.'
            : 'Report a problem with an MPLADS work — its quality, delay, location or use of funds. Submissions are held in this browser until the backend is connected.'
        }
      />

      {state.status === 'loading' && (
        <Card>
          <LoadingState label="Loading" />
        </Card>
      )}

      {state.status === 'error' && (
        <Card>
          <ErrorState
            title="Could not load this page"
            description={state.error.message}
            onRetry={() => setReloadKey((key) => key + 1)}
          />
        </Card>
      )}

      {state.status === 'success' &&
        (isReviewer ? (
          <ReviewQueue data={state.data} service={service} canAction={actionsGrievances(role)} />
        ) : (
          <CitizenGrievances data={state.data} service={service} />
        ))}
    </div>
  );
}

// --- citizen view --------------------------------------------------------------

function CitizenGrievances({
  data,
  service,
}: {
  data: GrievancesData;
  service: GrievancesService;
}) {
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [added, setAdded] = useState<Grievance[]>([]);
  const [confirmation, setConfirmation] = useState<string | null>(null);
  const workLabel = useWorkLabel(data);

  // Rows derive from the provider list (so a re-fetch flows through) plus any
  // grievances submitted in this view, pinned on top without duplication.
  const addedIds = new Set(added.map((g) => g.id));
  const items = [...added, ...data.grievances.filter((g) => !addedIds.has(g.id))];

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    const found = validate(form);
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    setSubmitting(true);
    setSubmitError(null);
    setConfirmation(null);
    try {
      const saved = await service.submit(toInput(form));
      setAdded((prev) => [saved, ...prev]);
      setForm(EMPTY_FORM);
      setConfirmation(`Grievance recorded — reference ${saved.id}.`);
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Could not submit the grievance.');
    } finally {
      setSubmitting(false);
    }
  }

  const columns: Column<Grievance>[] = [
    { key: 'ref', header: 'Reference', render: (g) => g.id },
    { key: 'submitted', header: 'Submitted', render: (g) => formatDate(g.submittedAt) },
    { key: 'category', header: 'Category', render: (g) => g.category },
    { key: 'subject', header: 'Subject', render: (g) => g.subject },
    { key: 'work', header: 'About', render: (g) => workLabel(g.workReference) },
    { key: 'status', header: 'Status', render: (g) => <StatusBadgeFor status={g.status} /> },
  ];

  return (
    <>
      <Card>
        <SectionHeader title="Raise a grievance" />
        <form className="grv-form" onSubmit={onSubmit} noValidate>
          <div className="grv-form__grid">
            <Select
              label="Category"
              value={form.category}
              error={errors.category}
              options={[
                { value: '', label: 'Select a category' },
                ...GRIEVANCE_CATEGORIES.map((c) => ({ value: c, label: c })),
              ]}
              onChange={(e) => set('category', e.target.value)}
            />
            <Select
              label="Related work (optional)"
              value={form.workReference}
              options={[
                { value: '', label: 'Not about a specific work' },
                ...data.workOptions.map((o) => ({ value: String(o.reference), label: o.label })),
              ]}
              onChange={(e) => set('workReference', e.target.value)}
            />
          </div>

          <Input
            label="Subject"
            value={form.subject}
            error={errors.subject}
            maxLength={120}
            placeholder="A one-line summary"
            onChange={(e) => set('subject', e.target.value)}
          />

          <Textarea
            label="Description"
            value={form.description}
            error={errors.description}
            rows={5}
            placeholder="What is the problem? Include where and when, if you know."
            onChange={(e) => set('description', e.target.value)}
          />

          <div className="grv-form__grid">
            <Input
              label="Your name (optional)"
              value={form.contactName}
              onChange={(e) => set('contactName', e.target.value)}
            />
            <Input
              label="Email (optional)"
              type="email"
              value={form.contactEmail}
              error={errors.contactEmail}
              onChange={(e) => set('contactEmail', e.target.value)}
            />
          </div>

          {submitError ? (
            <p className="ui-field__error" role="alert">
              {submitError}
            </p>
          ) : null}
          {confirmation ? (
            <p className="grv-form__ok" role="status">
              {confirmation}
            </p>
          ) : null}

          <div>
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Submitting…' : 'Submit grievance'}
            </Button>
          </div>
        </form>
      </Card>

      <Card>
        <SectionHeader title="Grievances you have raised" />
        <DataTable
          caption="Grievances you have raised"
          columns={columns}
          rows={items}
          getRowKey={(g) => g.id}
          emptyState={
            <EmptyState
              title="No grievances yet"
              description="Grievances you submit appear here, held in this browser until the backend is connected."
            />
          }
        />
      </Card>
    </>
  );
}

// --- authority review queue --------------------------------------------------

function opts(values: string[], anyLabel: string): SelectOption[] {
  return [{ value: '', label: anyLabel }, ...values.map((value) => ({ value, label: value }))];
}

function ReviewQueue({
  data,
  service,
  canAction,
}: {
  data: GrievancesData;
  service: GrievancesService;
  canAction: boolean;
}) {
  const [overrides, setOverrides] = useState<Record<string, Grievance>>({});
  const [filters, setFilters] = useState({ status: '', category: '' });
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const workLabel = useWorkLabel(data);

  // Rows come from the provider list (so a re-fetch flows through); local status
  // changes are layered on by id.
  const items = data.grievances.map((g) => overrides[g.id] ?? g);

  const categories = [...new Set(items.map((g) => g.category))].sort((a, b) => a.localeCompare(b));

  const filtered = items.filter(
    (g) =>
      (!filters.status || g.status === filters.status) &&
      (!filters.category || g.category === filters.category),
  );

  async function patch(id: string, next: { status: GrievanceStatus; actionNote?: string | null }) {
    setError(null);
    setNotice(null);
    try {
      const saved = await service.updateStatus(id, next);
      setOverrides((prev) => ({ ...prev, [saved.id]: saved }));
      setNotice(`Grievance ${saved.id} updated.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update the grievance.');
    }
  }

  const columns: Column<Grievance>[] = [
    { key: 'ref', header: 'Reference', render: (g) => g.id },
    { key: 'submitted', header: 'Submitted', render: (g) => formatDate(g.submittedAt) },
    { key: 'category', header: 'Category', render: (g) => g.category },
    {
      key: 'subject',
      header: 'Subject',
      render: (g) => (
        <div className="grv-subject">
          <span className="grv-subject__title">{g.subject}</span>
          <span className="grv-subject__desc">{g.description}</span>
        </div>
      ),
    },
    { key: 'work', header: 'About', render: (g) => workLabel(g.workReference) },
    {
      key: 'status',
      header: 'Status',
      render: (g) =>
        canAction ? (
          <Select
            label={`Status for ${g.id}`}
            hideLabel
            value={g.status}
            options={GRIEVANCE_STATUSES.map((s) => ({
              value: s,
              label: GRIEVANCE_STATUS_LABEL[s],
            }))}
            onChange={(e) => patch(g.id, { status: e.target.value as GrievanceStatus })}
          />
        ) : (
          <StatusBadgeFor status={g.status} />
        ),
    },
    {
      key: 'note',
      header: 'Action note',
      render: (g) =>
        canAction ? (
          <Input
            label={`Action note for ${g.id}`}
            hideLabel
            defaultValue={g.actionNote ?? ''}
            placeholder="What was done"
            onBlur={(e) => {
              const value = e.target.value.trim() || null;
              if (value !== (g.actionNote ?? null)) {
                patch(g.id, { status: g.status, actionNote: value });
              }
            }}
          />
        ) : (
          (g.actionNote ?? '—')
        ),
    },
  ];

  return (
    <Card>
      <SectionHeader
        title="Review queue"
        description={
          canAction
            ? 'Move each grievance through Submitted → Under review → Actioned → Closed and note the action taken.'
            : 'Read-only view of citizen grievances and the action recorded against each.'
        }
      />

      <div className="grv-filters" role="search" aria-label="Filter grievances">
        <Select
          label="Status"
          value={filters.status}
          options={[
            { value: '', label: 'Any status' },
            ...GRIEVANCE_STATUSES.map((s) => ({ value: s, label: GRIEVANCE_STATUS_LABEL[s] })),
          ]}
          onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))}
        />
        <Select
          label="Category"
          value={filters.category}
          options={opts(categories, 'All categories')}
          onChange={(e) => setFilters((f) => ({ ...f, category: e.target.value }))}
        />
        <span className="text-muted grv-filters__count">
          {filtered.length} of {items.length} {items.length === 1 ? 'grievance' : 'grievances'}
        </span>
      </div>

      {error ? (
        <p className="ui-field__error" role="alert">
          {error}
        </p>
      ) : null}
      {notice ? (
        <p className="grv-form__ok" role="status">
          {notice}
        </p>
      ) : null}

      <DataTable
        caption="Grievance review queue"
        columns={columns}
        rows={filtered}
        getRowKey={(g) => g.id}
        emptyState={
          <EmptyState
            title="No grievances"
            description="No citizen grievances have been raised yet."
          />
        }
      />
    </Card>
  );
}
