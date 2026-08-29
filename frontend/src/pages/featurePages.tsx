import { PlaceholderPage } from './PlaceholderPage';

/**
 * Routed placeholders for the Round-1 feature screens not yet implemented. Each
 * renders only a heading + a "later phase" notice. (Overview, Project Register,
 * Project Details and Risk & Alerts are implemented — see their own `pages/`
 * folders.)
 */

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
