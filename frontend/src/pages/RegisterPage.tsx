import { useState, type FormEvent } from 'react';
import { Link, Navigate } from 'react-router-dom';

import { ApiError } from '../api/client';
import { landingPathFor, useSession } from '../auth';
import { Button, Card, Input } from '../ui';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD = 8;

/**
 * Citizen self-registration (decision D32). Public, rendered outside the shell.
 * On success the session flips to `authenticated` and this redirects to the
 * Citizen Portal. Government accounts are provisioned by an administrator, not
 * here.
 */
export function RegisterPage() {
  const { status, role, register } = useSession();

  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (status === 'authenticated' && role) {
    return <Navigate to={landingPathFor(role)} replace />;
  }

  const clientError = (): string | null => {
    if (!displayName.trim()) return 'Enter your name.';
    if (!EMAIL_RE.test(email.trim())) return 'Enter a valid email address.';
    if (password.length < MIN_PASSWORD) return `Use at least ${MIN_PASSWORD} characters for the password.`;
    if (password !== confirm) return 'The passwords do not match.';
    return null;
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const invalid = clientError();
    if (invalid) {
      setError(invalid);
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      await register(displayName.trim(), email.trim(), password);
      // Redirect happens on the next render via the <Navigate> guard above.
    } catch (err) {
      setError(
        err instanceof ApiError && err.status === 409
          ? 'That email is already registered. Try signing in instead.'
          : err instanceof ApiError && err.status === 400
            ? 'Please check the details and try again.'
            : 'Could not create your account. Please try again.',
      );
      setSubmitting(false);
    }
  };

  return (
    <main className="login-page">
      <Card className="login-card">
        <div className="login-card__head">
          <span className="login-card__brand">MPLADSentinel</span>
          <h1 className="login-card__title">Create a citizen account</h1>
          <p className="login-card__subtitle">
            For members of the public. Government users are given accounts by their administrator.
          </p>
        </div>

        <form className="login-form" onSubmit={handleSubmit} noValidate>
          <Input
            label="Your name"
            value={displayName}
            onChange={(event) => setDisplayName(event.target.value)}
            autoComplete="name"
            autoFocus
            required
          />
          <Input
            label="Email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            autoComplete="email"
            required
          />
          <Input
            label="Password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="new-password"
            hint={`At least ${MIN_PASSWORD} characters.`}
            required
          />
          <Input
            label="Confirm password"
            type="password"
            value={confirm}
            onChange={(event) => setConfirm(event.target.value)}
            autoComplete="new-password"
            required
          />

          {error ? (
            <p className="login-form__error" role="alert">
              {error}
            </p>
          ) : null}

          <Button type="submit" variant="primary" disabled={submitting}>
            {submitting ? 'Creating account…' : 'Create account'}
          </Button>
        </form>

        <p className="login-card__alt">
          Already have an account? <Link to="/login">Sign in</Link>
        </p>
      </Card>
    </main>
  );
}
