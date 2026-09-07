import { PlaceholderPage } from './PlaceholderPage';

/**
 * Routed placeholder for the one Round-1 feature screen not yet implemented.
 * (Overview, Project Register, Project Details, Risk & Alerts, the Citizen
 * Portal and Grievances are implemented — see their own `pages/` folders.)
 * The Audit Timeline is deferred to the backend-integration phase — it needs
 * verification / ledger events that do not exist until then.
 */

export function AuditPage() {
  return (
    <PlaceholderPage
      breadcrumbs={[{ label: 'Home', to: '/' }, { label: 'Audit' }]}
      title="Audit"
      description="Chronological view of important project and verification events."
      note="Deferred to the backend-integration phase — depends on verification / ledger events."
    />
  );
}
