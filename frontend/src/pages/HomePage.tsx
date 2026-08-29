import { useEffect, useState } from 'react';

import { getHealth } from '../api/health';
import { Card, PageHeader, SectionHeader, StatusBadge } from '../ui';

type BackendState =
  { kind: 'checking' } | { kind: 'ok'; service: string } | { kind: 'unreachable'; detail: string };

/**
 * Landing page for the foundation build. It performs a single backend
 * connectivity check through the centralized API client to demonstrate the
 * frontend ↔ backend wiring. It contains no MPLADS/business functionality.
 */
export function HomePage() {
  const [backend, setBackend] = useState<BackendState>({ kind: 'checking' });

  useEffect(() => {
    const controller = new AbortController();

    getHealth(controller.signal)
      .then((response) => setBackend({ kind: 'ok', service: response.service }))
      .catch((error: unknown) => {
        if (controller.signal.aborted) {
          return;
        }
        const detail = error instanceof Error ? error.message : 'Unknown error';
        setBackend({ kind: 'unreachable', detail });
      });

    return () => controller.abort();
  }, []);

  return (
    <div className="ui-stack">
      <PageHeader
        title="MPLADSentinel"
        description="AI-powered MPLADS monitoring and analytics platform. This is the foundation build — feature modules are added in later phases."
      />

      <Card>
        <SectionHeader
          title="Backend connectivity"
          description="Single health check via the centralized API client."
        />
        {backend.kind === 'checking' && <p className="text-secondary">Checking backend…</p>}
        {backend.kind === 'ok' && (
          <p>
            <StatusBadge tone="success">Connected</StatusBadge>{' '}
            <span className="text-secondary">Connected to backend service: {backend.service}</span>
          </p>
        )}
        {backend.kind === 'unreachable' && (
          <p>
            <StatusBadge tone="warning">Unreachable</StatusBadge>{' '}
            <span className="text-secondary">
              Backend not reachable ({backend.detail}). Start the backend on its configured port and
              reload.
            </span>
          </p>
        )}
      </Card>
    </div>
  );
}
