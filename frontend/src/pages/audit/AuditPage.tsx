import { useEffect, useState, type CSSProperties, type ReactNode } from 'react';
import { Link, useSearchParams } from 'react-router-dom';

import {
  ASSIGNMENT_STATUS_LABEL,
  DEMO_INSPECTION_FINDINGS,
  DEMO_INSPECTION_REMARKS,
  DEMO_OVERALL_CONDITION,
  useAsyncData,
  useAuditService,
  type AsyncState,
  type AuditData,
  type AuditEvidence,
  type AuditService,
  type AuditWorkGroup,
} from '../../data';
import { formatDate } from '../../format';
import {
  Card,
  EmptyState,
  ErrorState,
  LoadingState,
  PageHeader,
  Select,
  StatusBadge,
} from '../../ui';
import { CircleCheckIcon, ClipboardListIcon, CloseIcon, DownloadIcon, InfoIcon } from '../../ui/icons';
import './audit.css';

type AuditEventKind = 'requested' | 'in_progress' | 'completed' | 'cancelled' | 'evidence';

const EVENT_META: Record<AuditEventKind, { hue: string; title: string; icon: ReactNode }> = {
  requested: { hue: '#2a78d6', title: 'Inspection requested', icon: <ClipboardListIcon /> },
  in_progress: { hue: '#eda100', title: 'Inspection in progress', icon: <InfoIcon /> },
  completed: { hue: '#1baf7a', title: 'Inspection completed', icon: <CircleCheckIcon /> },
  cancelled: { hue: '#cf4b3e', title: 'Inspection cancelled', icon: <CloseIcon /> },
  evidence: { hue: '#8b5cf6', title: 'Field evidence', icon: <DownloadIcon /> },
};

/**
 * Audit Trail (`/audit`).
 *
 * A work-level verification timeline built from that work's inspection
 * assignment: requested → (in progress) → completed / cancelled → field
 * evidence. The evidence images come from the backend's read-only Pinata lookup
 * (`api` mode). The "Inspection completed" findings are illustrative demo
 * values — no mobile inspection report reaches the portal yet. Dates only; no
 * clock time is shown anywhere on this page.
 */
export function AuditPage() {
  const service = useAuditService();
  const [reloadKey, setReloadKey] = useState(0);
  const [searchParams, setSearchParams] = useSearchParams();

  const state = useAsyncData<AuditData>(
    (signal) => service.load(signal),
    [service, reloadKey],
    { isEmpty: (data) => data.works.length === 0 },
  );

  // Re-load when the tab regains focus, so a photo-count change made on
  // /inspections (another tab, or without navigating back here) is picked up.
  useEffect(() => {
    const refresh = () => {
      if (document.visibilityState === 'visible') setReloadKey((key) => key + 1);
    };
    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', refresh);
    return () => {
      window.removeEventListener('focus', refresh);
      document.removeEventListener('visibilitychange', refresh);
    };
  }, []);

  return (
    <div className="ui-stack aud">
      <PageHeader
        breadcrumbs={[{ label: 'Home', to: '/' }, { label: 'Audit' }]}
        title="Audit Trail"
        description="A chronological verification trail for a work: when an inspection was requested, its progress, and the field evidence uploaded to IPFS. Records are indicators for review, not proof of wrongdoing."
      />

      {state.status === 'loading' && (
        <Card>
          <LoadingState label="Loading the audit trail" />
        </Card>
      )}

      {state.status === 'empty' && (
        <Card>
          <EmptyState
            title="No inspections yet"
            description="Assign an inspection from the Inspections page — its trail will appear here."
            action={
              <Link className="ui-btn ui-btn--primary ui-btn--sm" to="/inspections">
                Go to Inspections
              </Link>
            }
          />
        </Card>
      )}

      {state.status === 'error' && (
        <Card>
          <ErrorState
            title="Could not load the audit trail"
            description={state.error.message}
            onRetry={() => setReloadKey((key) => key + 1)}
          />
        </Card>
      )}

      {state.status === 'success' && (
        <AuditBody
          data={state.data}
          service={service}
          selectedWorkId={searchParams.get('work')}
          onSelectWork={(id) => setSearchParams({ work: id })}
        />
      )}
    </div>
  );
}

function AuditBody({
  data,
  service,
  selectedWorkId,
  onSelectWork,
}: {
  data: AuditData;
  service: AuditService;
  selectedWorkId: string | null;
  onSelectWork: (id: string) => void;
}) {
  const group =
    data.works.find((w) => String(w.sourceWorkId) === selectedWorkId) ?? data.works[0];

  return (
    <>
      <Card>
        <Select
          label="Work"
          value={String(group.sourceWorkId)}
          options={data.works.map((w) => ({
            value: String(w.sourceWorkId),
            label: `${w.title} · #${w.sourceWorkId}`,
          }))}
          onChange={(e) => onSelectWork(e.target.value)}
        />
      </Card>

      <Card>
        <div className="aud-head">
          <h2 className="aud-head__title">{group.title}</h2>
          <span className="aud-head__id">#{group.sourceWorkId}</span>
        </div>
        <p className="aud-head__officer">
          Field officer: {group.officerCode ?? '—'}
          {group.officerName ? ` · ${group.officerName}` : ''}
        </p>

        <AuditTimeline group={group} service={service} />
      </Card>
    </>
  );
}

function hueStyle(kind: AuditEventKind): CSSProperties {
  return { '--aud-hue': EVENT_META[kind].hue } as CSSProperties;
}

function Node({ kind }: { kind: AuditEventKind }) {
  return (
    <span className="aud-node" style={hueStyle(kind)} aria-hidden>
      {EVENT_META[kind].icon}
    </span>
  );
}

function EventCard({
  kind,
  date,
  children,
}: {
  kind: AuditEventKind;
  date: string | null;
  children: ReactNode;
}) {
  const meta = EVENT_META[kind];
  return (
    <li className="aud-event" style={hueStyle(kind)}>
      <Node kind={kind} />
      <div className="aud-card">
        <div className="aud-card__titlerow">
          <h3 className="aud-card__title">{meta.title}</h3>
          {date ? <span className="aud-date">{formatDate(date)}</span> : null}
        </div>
        {children}
      </div>
    </li>
  );
}

function AuditTimeline({ group, service }: { group: AuditWorkGroup; service: AuditService }) {
  const a = group.latest;

  const evidence = useAsyncData<AuditEvidence>(
    (signal) => service.evidence(group.sourceWorkId, a.requiredPhotos, signal),
    [service, group.sourceWorkId, a.requiredPhotos],
  );

  return (
    <ol className="aud-timeline">
      <EventCard kind="requested" date={a.assignedAt}>
        <p className="aud-card__meta">
          Assigned to {a.officerCode ?? '—'}
          {a.officerName ? ` (${a.officerName})` : ''} by {a.assignedByName ?? 'an authority'}.
        </p>
        <p className="aud-card__meta">
          Status:{' '}
          <StatusBadge tone="info" srLabel="Status">
            {ASSIGNMENT_STATUS_LABEL[a.status]}
          </StatusBadge>
          {a.dueDate ? ` · Due ${formatDate(a.dueDate)}` : ''}
        </p>
        {(a.status === 'ASSIGNED' || a.status === 'IN_PROGRESS') && a.note ? (
          <p className="aud-card__note">“{a.note}”</p>
        ) : null}
      </EventCard>

      {a.status === 'IN_PROGRESS' && (
        <EventCard kind="in_progress" date={a.updatedAt}>
          <p className="aud-card__meta">The field officer has started the on-site inspection.</p>
        </EventCard>
      )}

      {a.status === 'CANCELLED' && (
        <EventCard kind="cancelled" date={a.updatedAt}>
          <p className="aud-card__meta">The assignment was withdrawn before completion.</p>
          {a.note ? (
            <p className="aud-card__note">Reason given at cancellation: “{a.note}”</p>
          ) : null}
        </EventCard>
      )}

      {a.status === 'COMPLETED' && (
        <EventCard kind="completed" date={a.updatedAt}>
          {a.note ? (
            <p className="aud-card__note">Reason given at completion: “{a.note}”</p>
          ) : null}
          <ul className="aud-findings">
            {DEMO_INSPECTION_FINDINGS.map((f) => (
              <li key={f.label}>
                <span className={`aud-flag ${f.value ? 'aud-flag--yes' : 'aud-flag--no'}`} aria-hidden>
                  {f.value ? '✓' : '✗'}
                </span>
                {f.label}
                <span className="visually-hidden">: {f.value ? 'yes' : 'no'}</span>
              </li>
            ))}
          </ul>
          <p className="aud-condition">
            Overall condition:
            <span className="aud-condition__pill">{DEMO_OVERALL_CONDITION}</span>
          </p>
          <p className="aud-card__note">Remarks: {DEMO_INSPECTION_REMARKS}</p>
          <p className="aud-caveat">
            Illustrative inspection findings — the field officer’s report is captured in the mobile
            app and is not yet wired to the portal.
          </p>
        </EventCard>
      )}

      <EventCard kind="evidence" date={null}>
        <p className="aud-card__meta">
          This inspection calls for {a.requiredPhotos} photo{a.requiredPhotos === 1 ? '' : 's'}.
        </p>
        <Evidence state={evidence} expected={a.requiredPhotos} />
      </EventCard>
    </ol>
  );
}

function Evidence({ state, expected }: { state: AsyncState<AuditEvidence>; expected: number }) {
  const [zoom, setZoom] = useState<AuditEvidence['photos'][number] | null>(null);

  useEffect(() => {
    if (!zoom) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setZoom(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [zoom]);

  if (state.status !== 'success') {
    return (
      <p className="aud-card__meta">
        {state.status === 'loading' ? 'Loading evidence…' : 'Evidence is unavailable right now.'}
      </p>
    );
  }

  const { photos, configured } = state.data;

  if (!configured) {
    return (
      <p className="aud-card__meta">
        IPFS evidence is not connected yet. The field officer’s photos are uploaded to Pinata/IPFS
        from the mobile app; once the portal’s Pinata credential is set they appear here.
      </p>
    );
  }
  if (photos.length === 0) {
    return <p className="aud-card__meta">No evidence has been uploaded for this inspection yet.</p>;
  }

  const shortfall = expected - photos.length;

  return (
    <>
      <div className="aud-evidence">
        {photos.map((photo) => (
          <button
            type="button"
            className="aud-photo"
            key={photo.cid}
            onClick={() => setZoom(photo)}
          >
            <img src={photo.url} alt={photo.name ?? 'Field evidence photo'} loading="lazy" />
            <span className="aud-photo__cid">CID {photo.cid}</span>
          </button>
        ))}
      </div>
      <p className="aud-evidence__ipfs">
        Showing {photos.length} of {expected} expected · stored on IPFS, retrieved via the portal.
        {shortfall > 0
          ? ` ${shortfall} more ${shortfall === 1 ? 'photo is' : 'photos are'} expected for this inspection.`
          : ''}
      </p>

      {zoom ? (
        <div
          className="aud-lightbox"
          role="dialog"
          aria-modal="true"
          aria-label={zoom.name ?? 'Field evidence photo'}
          onClick={() => setZoom(null)}
        >
          <div className="aud-lightbox__inner" onClick={(e) => e.stopPropagation()}>
            <img src={zoom.url} alt={zoom.name ?? 'Field evidence photo'} />
            <div className="aud-lightbox__bar">
              <a href={zoom.url} target="_blank" rel="noreferrer">
                Open original ↗
              </a>
              <button
                type="button"
                className="ui-btn ui-btn--ghost ui-btn--sm"
                onClick={() => setZoom(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
