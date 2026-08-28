import { useEffect, useState } from 'react';

import { getHealth } from '../api/health';

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
    <section>
      <h1>MPLADSentinel</h1>
      <p>
        AI-powered MPLADS monitoring and analytics platform. This is the project foundation build —
        feature modules are added in later phases.
      </p>

      <h2>Backend connectivity</h2>
      {backend.kind === 'checking' && <p>Checking backend…</p>}
      {backend.kind === 'ok' && <p>Connected to backend service: {backend.service}</p>}
      {backend.kind === 'unreachable' && (
        <p>
          Backend not reachable ({backend.detail}). Start the backend on its configured port and
          reload.
        </p>
      )}
    </section>
  );
}
