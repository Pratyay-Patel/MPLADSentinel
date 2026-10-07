import { useNavigate } from 'react-router-dom';

import { useSession } from '../auth/context';
import { ROLE_LABELS } from '../auth/roles';
import { Button } from '../ui/Button';
import { InfoIcon } from '../ui/icons';

/**
 * Explains an otherwise-confusing situation: the backend session is one
 * cookie shared by every tab of this browser, so signing in as a different
 * role in another tab silently signs this tab into that role too. Without
 * this notice, that shows up as screens this tab used to see suddenly
 * failing with "you do not have access to this information" — which reads
 * as a bug. {@link SessionProvider} detects the change when the tab regains
 * focus and sets `session.roleMismatch`; this renders the explanation and
 * lets the user get back to the role they meant to be in here.
 */
export function RoleMismatchBanner() {
  const session = useSession();
  const navigate = useNavigate();
  const { roleMismatch } = session;

  if (!roleMismatch) {
    return null;
  }

  const previousLabel = ROLE_LABELS[roleMismatch.previous.role];
  const currentLabel = roleMismatch.current ? ROLE_LABELS[roleMismatch.current.role] : null;

  return (
    <div className="role-mismatch-banner" role="alert">
      <span className="role-mismatch-banner__icon" aria-hidden>
        <InfoIcon width={18} height={18} />
      </span>
      <p className="role-mismatch-banner__text">
        {currentLabel ? (
          <>
            This browser signed in as <strong>{currentLabel}</strong> in another tab, so this tab
            switched too — it's one shared sign-in per browser, not per tab. It was{' '}
            <strong>{previousLabel}</strong> a moment ago.
          </>
        ) : (
          <>
            This browser was signed out in another tab, so this tab was signed out too. It was{' '}
            <strong>{previousLabel}</strong> a moment ago.
          </>
        )}
      </p>
      <div className="role-mismatch-banner__actions">
        <Button
          size="sm"
          variant="secondary"
          onClick={async () => {
            // This tab is still authenticated (as whatever the other tab
            // switched it to), and LoginPage redirects anyone already
            // authenticated straight back to their dashboard — so getting to
            // the login form means actually signing out first, not just
            // navigating there. Mirrors UserMenu's sign-out handler.
            await session.logout();
            navigate('/login', { replace: true });
          }}
        >
          Sign in as {previousLabel}
        </Button>
        <Button size="sm" variant="ghost" onClick={session.dismissRoleMismatch}>
          Dismiss
        </Button>
      </div>
    </div>
  );
}
