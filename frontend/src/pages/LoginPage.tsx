import { useState, type FormEvent } from 'react';
import { Link, Navigate, useLocation } from 'react-router-dom';

import { ApiError } from '../api/client';
import { DEMO_PERSONAS, demoAuthEnabled, landingPathFor, useSession } from '../auth';
import { Button, Card, Input } from '../ui';

interface LoginLocationState {
  from?: string;
}

/**
 * Sign-in screen. Rendered outside the application shell. On success the session
 * context flips to `authenticated` and this component redirects — to the page
 * the user was heading for, or a role-appropriate landing page.
 *
 * In the demo build ({@link demoAuthEnabled}) there is no backend: a persona
 * picker replaces the credential form.
 */
export function LoginPage() {
  const { status, role, login } = useSession();
  const location = useLocation();
  const from = (location.state as LoginLocationState | null)?.from;

  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (status === 'authenticated' && role) {
    return <Navigate to={from ?? landingPathFor(role)} replace />;
  }

  const demo = demoAuthEnabled();

  const pickPersona = async (personaRole: string) => {
    setError(null);
    setSubmitting(true);
    try {
      await login(personaRole, 'demo');
    } catch {
      setError('Could not enter the demo. Please try again.');
      setSubmitting(false);
    }
  };

  return (
    <main className="login-page">
      <Card className={demo ? 'login-card login-card--wide' : 'login-card'}>
        <div className="login-card__head">
          <span className="login-card__brand">MPLADSentinel</span>
          <h1 className="login-card__title">{demo ? 'Choose a role to explore' : 'Sign in'}</h1>
          <p className="login-card__subtitle">
            {demo
              ? 'Interactive demo on illustrative data. Pick a role to see the portal from that perspective.'
              : 'Use your MPLADSentinel portal account to continue.'}
          </p>
        </div>

        {demo ? (
          <>
            <div className="persona-grid">
              {DEMO_PERSONAS.map((persona) => (
                <button
                  key={persona.role}
                  type="button"
                  className="persona-card"
                  onClick={() => void pickPersona(persona.role)}
                  disabled={submitting}
                >
                  <span className="persona-card__label">{persona.label}</span>
                  <span className="persona-card__blurb">{persona.blurb}</span>
                </button>
              ))}
            </div>
            {error ? (
              <p className="login-form__error" role="alert">
                {error}
              </p>
            ) : null}
          </>
        ) : (
          <CredentialForm />
        )}

        {!demo ? (
          <p className="login-card__alt">
            New here? <Link to="/register">Create a citizen account</Link>
          </p>
        ) : null}
      </Card>
    </main>
  );
}

function CredentialForm() {
  const { login } = useSession();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login(username.trim(), password);
      // Redirect happens on the next render via the <Navigate> guard in LoginPage,
      // once the session context reports `authenticated`.
    } catch (err) {
      setError(
        err instanceof ApiError && err.status === 401
          ? 'Incorrect username or password.'
          : 'Could not sign in. Please try again.',
      );
      setSubmitting(false);
    }
  };

  return (
    <form className="login-form" onSubmit={handleSubmit} noValidate>
      <Input
        label="Username or email"
        value={username}
        onChange={(event) => setUsername(event.target.value)}
        autoComplete="username"
        autoFocus
        required
      />
      <Input
        label="Password"
        type="password"
        value={password}
        onChange={(event) => setPassword(event.target.value)}
        autoComplete="current-password"
        required
      />

      {error ? (
        <p className="login-form__error" role="alert">
          {error}
        </p>
      ) : null}

      <Button type="submit" variant="primary" disabled={submitting}>
        {submitting ? 'Signing in…' : 'Sign in'}
      </Button>
    </form>
  );
}
