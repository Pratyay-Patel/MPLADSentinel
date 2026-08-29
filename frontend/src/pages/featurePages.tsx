import { useParams } from 'react-router-dom';

import { PlaceholderPage } from './PlaceholderPage';

/**
 * Routed placeholders for the Round-1 feature screens. Each renders only a
 * heading + a "later phase" notice. The real implementations land in their own
 * phases (Government Dashboard, Project Intelligence, …).
 */

export function DashboardPage() {
  return (
    <PlaceholderPage
      title="Overview"
      description="Programme-wide MPLADS monitoring summary."
      note="Implemented in the Government Dashboard phase."
    />
  );
}

export function ProjectsPage() {
  return (
    <PlaceholderPage
      title="Projects"
      description="Searchable register of MPLADS works with status and financial indicators."
      note="Implemented in the Project Intelligence phase."
    />
  );
}

export function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  return (
    <PlaceholderPage
      title="Project details"
      description="Full record for a single MPLADS work."
      breadcrumbs={[{ label: 'Projects', to: '/projects' }, { label: `Work ${id ?? ''}`.trim() }]}
      note="Implemented in the Project Details phase."
    />
  );
}

export function RiskPage() {
  return (
    <PlaceholderPage
      title="Risk & Alerts"
      description="Rule-based risk indicators and the reasons behind them."
      note="Implemented in the Risk Detection phase."
    />
  );
}

export function AuditPage() {
  return (
    <PlaceholderPage
      title="Audit"
      description="Chronological view of important project and verification events."
      note="Implemented in the Audit Timeline phase."
    />
  );
}

export function CitizenPage() {
  return (
    <PlaceholderPage
      title="Citizen Portal"
      description="Publicly releasable MPLADS project information."
      note="Implemented in the Citizen Portal phase."
    />
  );
}

export function GrievancesPage() {
  return (
    <PlaceholderPage
      title="Grievances"
      description="Submit and track project-related grievances."
      note="Implemented in the Grievance phase."
    />
  );
}
