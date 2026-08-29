import { Link } from 'react-router-dom';

import { Card, PageHeader } from '../ui';

export function NotFoundPage() {
  return (
    <div className="ui-stack">
      <PageHeader title="Page not found" description="The page you requested does not exist." />
      <Card>
        <p>
          <Link to="/">Return to the home page</Link>.
        </p>
      </Card>
    </div>
  );
}
