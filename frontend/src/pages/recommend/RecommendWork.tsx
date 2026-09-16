import { useMemo, useState, type FormEvent } from 'react';

import { actionsRecommendations, reviewsRecommendations, useCurrentRole } from '../../auth';
import {
  RECOMMENDATION_CATEGORIES,
  RECOMMENDATION_STATUS_LABEL,
  RECOMMENDATION_STATUSES,
  useAsyncData,
  useWorkRecommendationsService,
  type LocationCategory,
  type RecommendationsData,
  type RecommendationStatus,
  type WorkRecommendation,
  type WorkRecommendationInput,
  type WorkRecommendationsService,
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
import { CircleCheckIcon, InboxIcon, ListIcon, SendIcon } from '../../ui/icons';
import './recommend.css';

const STATUS_TONE: Record<RecommendationStatus, StatusTone> = {
  SUBMITTED: 'info',
  UNDER_REVIEW: 'warning',
  RECOMMENDED: 'success',
  REJECTED: 'danger',
};

function StatusBadgeFor({ status }: { status: RecommendationStatus }) {
  return (
    <StatusBadge tone={STATUS_TONE[status]} srLabel="Status">
      {RECOMMENDATION_STATUS_LABEL[status]}
    </StatusBadge>
  );
}

// --- citizen submission form -----------------------------------------------

interface FormState {
  fullName: string;
  mobileNumber: string;
  email: string;
  state: string;
  mpName: string;
  locationCategory: LocationCategory;
  gpsCoordinatesLink: string;
  workTitle: string;
  category: string;
  description: string;
  certified: boolean;
}

const EMPTY_FORM: FormState = {
  fullName: '',
  mobileNumber: '',
  email: '',
  state: '',
  mpName: '',
  locationCategory: 'RURAL',
  gpsCoordinatesLink: '',
  workTitle: '',
  category: '',
  description: '',
  certified: false,
};

type FieldErrors = Partial<
  Record<
    | 'fullName'
    | 'mobileNumber'
    | 'email'
    | 'state'
    | 'mpName'
    | 'gpsCoordinatesLink'
    | 'workTitle'
    | 'category'
    | 'description'
    | 'certified',
    string
  >
>;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MOBILE_RE = /^[6-9]\d{9}$/;

function validate(form: FormState): FieldErrors {
  const errors: FieldErrors = {};
  if (!form.fullName.trim()) errors.fullName = 'Enter your full name.';
  if (!MOBILE_RE.test(form.mobileNumber.trim())) {
    errors.mobileNumber = 'Enter a valid 10-digit mobile number.';
  }
  if (form.email.trim() && !EMAIL_RE.test(form.email.trim())) {
    errors.email = 'Enter a valid email address, or leave it blank.';
  }
  if (!form.state) errors.state = 'Choose a State / UT.';
  if (!form.mpName) errors.mpName = "Choose your MP & constituency.";
  if (!form.gpsCoordinatesLink.trim()) {
    errors.gpsCoordinatesLink = 'Add a GPS coordinates or maps link for the site.';
  }
  if (!form.workTitle.trim()) errors.workTitle = 'Give the proposed work a title.';
  if (!form.category) errors.category = 'Choose a sector / category.';
  if (form.description.trim().length < 20) {
    errors.description = 'Describe the community need in at least 20 characters.';
  }
  if (!form.certified) errors.certified = 'You must certify the proposal before submitting.';
  return errors;
}

function toInput(form: FormState, constituency: string): WorkRecommendationInput {
  return {
    fullName: form.fullName.trim(),
    mobileNumber: form.mobileNumber.trim(),
    email: form.email.trim() || null,
    state: form.state,
    mpName: form.mpName,
    constituency,
    locationCategory: form.locationCategory,
    gpsCoordinatesLink: form.gpsCoordinatesLink.trim(),
    workTitle: form.workTitle.trim(),
    category: form.category,
    description: form.description.trim(),
  };
}

/**
 * Recommend a Work (`/recommend`).
 *
 * e-SAKSHI-style citizen work recommendation. Role-aware: a citizen gets a
 * submission form plus the recommendations they have made; every other role
 * gets a review queue (MoSPI / State / District can change status and add an
 * action note; Auditor and MP see it read-only). No fund-estimate field — a
 * citizen cannot reasonably price a work — and the site is identified by a
 * GPS coordinates / maps link rather than free-text locality, harder to fake.
 * Both views read through `useWorkRecommendationsService()` → DataProvider.
 */
export function RecommendWork() {
  const role = useCurrentRole();
  const service = useWorkRecommendationsService();
  const [reloadKey, setReloadKey] = useState(0);
  const isReviewer = reviewsRecommendations(role);

  const state = useAsyncData<RecommendationsData>(
    (signal) => service.load(signal),
    [service, role, reloadKey],
  );

  const title = isReviewer ? 'Recommended Works' : 'Recommend a Work';

  return (
    <div className="ui-stack rec">
      <PageHeader
        breadcrumbs={[{ label: 'Home', to: '/' }, { label: title }]}
        title={title}
        description={
          isReviewer
            ? 'Locally felt development works citizens have proposed to their MP under the e-SAKSHI procedure.'
            : 'Propose a locally felt developmental work — drinking water, a school building, a community centre — to your elected MP.'
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
          <ReviewQueue data={state.data} service={service} canAction={actionsRecommendations(role)} />
        ) : (
          <CitizenRecommendations data={state.data} service={service} />
        ))}
    </div>
  );
}

// --- citizen view --------------------------------------------------------------

function CitizenRecommendations({
  data,
  service,
}: {
  data: RecommendationsData;
  service: WorkRecommendationsService;
}) {
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [added, setAdded] = useState<WorkRecommendation[]>([]);
  const [confirmed, setConfirmed] = useState<WorkRecommendation | null>(null);

  const addedIds = new Set(added.map((r) => r.id));
  const items = [...added, ...data.recommendations.filter((r) => !addedIds.has(r.id))];

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const mpOptions = useMemo(() => data.mpsByState[form.state] ?? [], [data.mpsByState, form.state]);
  const selectedMp = mpOptions.find((o) => o.mpName === form.mpName);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    const found = validate(form);
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    setSubmitting(true);
    setSubmitError(null);
    try {
      const saved = await service.submit(toInput(form, selectedMp?.constituency ?? ''));
      setAdded((prev) => [saved, ...prev]);
      setForm(EMPTY_FORM);
      setConfirmed(saved);
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Could not submit the recommendation.');
    } finally {
      setSubmitting(false);
    }
  }

  const columns: Column<WorkRecommendation>[] = [
    { key: 'tracking', header: 'Tracking number', render: (r) => r.trackingNumber },
    { key: 'submitted', header: 'Submitted', render: (r) => formatDate(r.submittedAt) },
    { key: 'title', header: 'Work', render: (r) => r.workTitle },
    { key: 'mp', header: 'MP', render: (r) => `${r.mpName} (${r.constituency})` },
    { key: 'status', header: 'Status', render: (r) => <StatusBadgeFor status={r.status} /> },
  ];

  if (confirmed) {
    return (
      <Card>
        <div className="rec-confirm">
          <span className="rec-confirm__icon" aria-hidden>
            <CircleCheckIcon />
          </span>
          <h2 className="rec-confirm__title">Your proposal has been recorded</h2>
          <p className="rec-confirm__lede">
            It has been logged for MoSPI / Ministry review under the e-SAKSHI citizen queue.
          </p>
          <div className="rec-confirm__box">
            <span className="rec-confirm__box-label">Acknowledgement tracking number</span>
            <span className="rec-confirm__box-value">{confirmed.trackingNumber}</span>
            <span className="rec-confirm__box-sub">
              Assigned to {confirmed.mpName} ({confirmed.constituency})
            </span>
          </div>
          <Button type="button" onClick={() => setConfirmed(null)}>
            Submit another recommendation
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <SectionHeader title="Propose a work" icon={<SendIcon />} tone="warning" />
        <form className="rec-form" onSubmit={onSubmit} noValidate>
          <div className="rec-form__grid">
            <Input
              label="Full name"
              value={form.fullName}
              error={errors.fullName}
              onChange={(e) => set('fullName', e.target.value)}
            />
            <Input
              label="Mobile number"
              type="tel"
              placeholder="10-digit mobile number"
              value={form.mobileNumber}
              error={errors.mobileNumber}
              onChange={(e) => set('mobileNumber', e.target.value)}
            />
            <Input
              label="Email (optional)"
              type="email"
              value={form.email}
              error={errors.email}
              onChange={(e) => set('email', e.target.value)}
            />
          </div>

          <div className="rec-form__grid">
            <Select
              label="State / UT"
              value={form.state}
              error={errors.state}
              options={[
                { value: '', label: 'Choose State / UT' },
                ...data.states.map((s) => ({ value: s, label: s })),
              ]}
              onChange={(e) => {
                set('state', e.target.value);
                set('mpName', '');
              }}
            />
            <Select
              label="Hon'ble MP & constituency"
              value={form.mpName}
              error={errors.mpName}
              disabled={!form.state}
              options={[
                { value: '', label: form.state ? 'Choose your MP' : 'Choose a state first' },
                ...mpOptions.map((o) => ({
                  value: o.mpName,
                  label: `${o.mpName} (${o.constituency})`,
                })),
              ]}
              onChange={(e) => set('mpName', e.target.value)}
            />
            <Select
              label="Location category"
              value={form.locationCategory}
              options={[
                { value: 'RURAL', label: 'Rural (Gram Panchayat)' },
                { value: 'URBAN', label: 'Urban (Municipality / Ward)' },
              ]}
              onChange={(e) => set('locationCategory', e.target.value as LocationCategory)}
            />
          </div>

          <Input
            label="Site GPS coordinates or maps link"
            placeholder="e.g. https://maps.google.com/?q=18.5204,73.8567 or 18.5204, 73.8567"
            value={form.gpsCoordinatesLink}
            error={errors.gpsCoordinatesLink}
            hint="A verifiable location for the proposed site, in place of a written locality description."
            onChange={(e) => set('gpsCoordinatesLink', e.target.value)}
          />

          <div className="rec-form__grid">
            <Input
              label="Work title"
              placeholder="e.g. Construction of an RO drinking-water plant"
              value={form.workTitle}
              error={errors.workTitle}
              onChange={(e) => set('workTitle', e.target.value)}
            />
            <Select
              label="Primary sector / category"
              value={form.category}
              error={errors.category}
              options={[
                { value: '', label: 'Select a category' },
                ...RECOMMENDATION_CATEGORIES.map((c) => ({ value: c, label: c })),
              ]}
              onChange={(e) => set('category', e.target.value)}
            />
          </div>

          <Textarea
            label="Detailed description of community need"
            value={form.description}
            error={errors.description}
            rows={4}
            placeholder="Why is this durable community asset needed? Who benefits, and what problem does it solve?"
            onChange={(e) => set('description', e.target.value)}
          />

          <label className="rec-certify">
            <input
              type="checkbox"
              checked={form.certified}
              onChange={(e) => set('certified', e.target.checked)}
            />
            <span>
              I certify that this proposal reflects locally felt public needs. I understand that
              final recommendation rests entirely with the concerned MP and statutory sanction with
              the District Authority, per the MPLADS guidelines.
            </span>
          </label>
          {errors.certified ? (
            <p className="ui-field__error" role="alert">
              {errors.certified}
            </p>
          ) : null}

          {submitError ? (
            <p className="ui-field__error" role="alert">
              {submitError}
            </p>
          ) : null}

          <div>
            <Button type="submit" disabled={submitting || !form.certified}>
              {submitting ? 'Submitting…' : 'Submit recommendation'}
            </Button>
          </div>
        </form>
      </Card>

      <Card>
        <SectionHeader title="Recommendations you have made" icon={<ListIcon />} tone="info" />
        <DataTable
          caption="Recommendations you have made"
          columns={columns}
          rows={items}
          getRowKey={(r) => r.id}
          emptyState={
            <EmptyState
              title="No recommendations yet"
              description="Works you recommend appear here, with their tracking number."
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
  data: RecommendationsData;
  service: WorkRecommendationsService;
  canAction: boolean;
}) {
  const [overrides, setOverrides] = useState<Record<string, WorkRecommendation>>({});
  const [filters, setFilters] = useState({ status: '', category: '' });
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const items = data.recommendations.map((r) => overrides[r.id] ?? r);
  const categories = [...new Set(items.map((r) => r.category))].sort((a, b) => a.localeCompare(b));

  const filtered = items.filter(
    (r) =>
      (!filters.status || r.status === filters.status) &&
      (!filters.category || r.category === filters.category),
  );

  async function patch(id: string, next: { status: RecommendationStatus; actionNote?: string | null }) {
    setError(null);
    setNotice(null);
    try {
      const saved = await service.updateStatus(id, next);
      setOverrides((prev) => ({ ...prev, [saved.id]: saved }));
      setNotice(`Recommendation ${saved.trackingNumber} updated.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update the recommendation.');
    }
  }

  const columns: Column<WorkRecommendation>[] = [
    { key: 'tracking', header: 'Tracking number', render: (r) => r.trackingNumber },
    { key: 'submitted', header: 'Submitted', render: (r) => formatDate(r.submittedAt) },
    {
      key: 'work',
      header: 'Proposed work',
      render: (r) => (
        <div className="rec-subject">
          <span className="rec-subject__title">{r.workTitle}</span>
          <span className="rec-subject__desc">{r.description}</span>
        </div>
      ),
    },
    { key: 'category', header: 'Category', render: (r) => r.category },
    { key: 'mp', header: 'MP / constituency', render: (r) => `${r.mpName} (${r.constituency})` },
    { key: 'location', header: 'Location', render: (r) => `${r.state} · ${r.locationCategory}` },
    {
      key: 'status',
      header: 'Status',
      render: (r) =>
        canAction ? (
          <Select
            label={`Status for ${r.trackingNumber}`}
            hideLabel
            value={r.status}
            options={RECOMMENDATION_STATUSES.map((s) => ({
              value: s,
              label: RECOMMENDATION_STATUS_LABEL[s],
            }))}
            onChange={(e) =>
              patch(r.id, { status: e.target.value as RecommendationStatus, actionNote: r.actionNote })
            }
          />
        ) : (
          <StatusBadgeFor status={r.status} />
        ),
    },
    {
      key: 'note',
      header: 'Action note',
      render: (r) =>
        canAction ? (
          <Input
            label={`Action note for ${r.trackingNumber}`}
            hideLabel
            defaultValue={r.actionNote ?? ''}
            placeholder="What was decided"
            onBlur={(e) => {
              const value = e.target.value.trim() || null;
              if (value !== (r.actionNote ?? null)) {
                patch(r.id, { status: r.status, actionNote: value });
              }
            }}
          />
        ) : (
          (r.actionNote ?? '—')
        ),
    },
  ];

  return (
    <Card>
      <SectionHeader
        title="Review queue"
        icon={<InboxIcon />}
        tone="danger"
        description={
          canAction
            ? 'Move each recommendation through Submitted → Under review → Recommended / Rejected and note the decision.'
            : 'Read-only view of citizen work recommendations and the decision recorded against each.'
        }
      />

      <div className="rec-filters" role="search" aria-label="Filter recommendations">
        <Select
          label="Status"
          value={filters.status}
          options={[
            { value: '', label: 'Any status' },
            ...RECOMMENDATION_STATUSES.map((s) => ({ value: s, label: RECOMMENDATION_STATUS_LABEL[s] })),
          ]}
          onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))}
        />
        <Select
          label="Category"
          value={filters.category}
          options={opts(categories, 'All categories')}
          onChange={(e) => setFilters((f) => ({ ...f, category: e.target.value }))}
        />
        <span className="text-muted rec-filters__count">
          {filtered.length} of {items.length} {items.length === 1 ? 'recommendation' : 'recommendations'}
        </span>
      </div>

      {error ? (
        <p className="ui-field__error" role="alert">
          {error}
        </p>
      ) : null}
      {notice ? (
        <p className="rec-form__ok" role="status">
          {notice}
        </p>
      ) : null}

      <DataTable
        caption="Work recommendation review queue"
        columns={columns}
        rows={filtered}
        getRowKey={(r) => r.id}
        emptyState={
          <EmptyState
            title="No recommendations"
            description="No citizens have recommended a work yet."
          />
        }
      />
    </Card>
  );
}
