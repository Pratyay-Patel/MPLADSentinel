import { useState, type FormEvent } from 'react';
import { Navigate, useLocation } from 'react-router-dom';

import { ApiError } from '../api/client';
import { landingPathFor, useSession } from '../auth';
import { Button, Card, Input } from '../ui';

interface LoginLocationState {
  from?: string;
}

/**
 * Sign-in screen. Rendered outside the application shell. On success the session
 * context flips to `authenticated` and this component redirects — to the page
 * the user was heading for, or a role-appropriate landing page.
 */
export function LoginPage() {
  const { status, role, login } = useSession();
  const location = useLocation();
  const from = (location.state as LoginLocationState | null)?.from;

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (status === 'authenticated' && role) {
    return <Navigate to={from ?? landingPathFor(role)} replace />;
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login(username.trim(), password);
      // Redirect happens on the next render via the <Navigate> guard above,
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
    <main className="login-page">
      <Card className="login-card">
        <div className="login-card__head">
          <span className="login-card__brand">MPLADSentinel</span>
          <h1 className="login-card__title">Sign in</h1>
          <p className="login-card__subtitle">
            Use your MPLADSentinel portal account to continue.
          </p>
        </div>

        <form className="login-form" onSubmit={handleSubmit} noValidate>
          <Input
            label="Username"
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
      </Card>
    </main>
  );
}
