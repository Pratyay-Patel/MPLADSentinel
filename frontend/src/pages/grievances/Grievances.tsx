import { useMemo, useState, type FormEvent } from 'react';

import {
  GRIEVANCE_CATEGORIES,
  useAsyncData,
  useGrievancesService,
  type Grievance,
  type GrievanceInput,
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
} from '../../ui';

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

/**
 * Grievances (`/grievances`) — a citizen submits a project-related grievance and
 * sees the grievances recorded so far. In this phase submissions are held by the
 * DemoDataProvider for the browser session; the backend endpoint (Phase 3B)
 * replaces that with no UI change. Data via `useGrievancesService()`.
 */
export function Grievances() {
  const service = useGrievancesService();
  const [reloadKey, setReloadKey] = useState(0);

  const state = useAsyncData<GrievancesData>(
    (signal) => service.load(signal),
    [service, reloadKey],
  );

  return (
    <div className="ui-stack grv">
      <PageHeader
        title="Grievances"
        description="Report a problem with an MPLADS work — its quality, delay, location or use of funds. Submissions are held in this browser until the backend is connected."
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

      {state.status === 'success' && <GrievancesBody data={state.data} service={service} />}
    </div>
  );
}

function GrievancesBody({ data, service }: { data: GrievancesData; service: GrievancesService }) {
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [items, setItems] = useState<Grievance[]>(data.grievances);
  const [confirmation, setConfirmation] = useState<string | null>(null);

  const workLabel = useMemo(() => {
    const map = new Map(data.workOptions.map((o) => [o.reference, o.label]));
    return (reference: number | null) =>
      reference == null ? 'General' : (map.get(reference) ?? `#${reference}`);
  }, [data.workOptions]);

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
      setItems((prev) => [saved, ...prev]);
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
    {
      key: 'status',
      header: 'Status',
      render: (g) => (
        <StatusBadge tone="info" srLabel="Status">
          {g.status === 'SUBMITTED' ? 'Submitted' : g.status}
        </StatusBadge>
      ),
    },
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
        <SectionHeader title="Submitted grievances" />
        <DataTable
          caption="Submitted grievances"
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
