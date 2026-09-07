import { Card, PageHeader } from '../../ui';

/**
 * Assistant (`/assistant`).
 *
 * A grounded Q&A helper: answers are composed from our precomputed aggregates
 * plus a fixed methodology knowledge base — it never free-generates figures or
 * claims about a specific work. Distinct from the voice command bar, which only
 * navigates. Built in roadmap step 4 (see
 * docs/frontend-visual-redesign-roadmap.md §9.4).
 */
export function AssistantPage() {
  return (
    <div className="ui-stack">
      <PageHeader
        breadcrumbs={[{ label: 'Home', to: '/' }, { label: 'Assistant' }]}
        title="Assistant"
        description="Ask about utilisation, risk factors and the scoring method. Answers are grounded in the portal's own data — indicators for review, not proof of wrongdoing."
      />
      <Card>
        <p className="text-muted">The assistant is being set up for this view.</p>
      </Card>
    </div>
  );
}
