import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { DEMO_PERSONAS, demoAuthEnabled, landingPathFor, useSession, type Role } from '../auth';
import { accentStyle, PERSONA_ACCENT, PERSONA_ACCENT_ON_DARK, PERSONA_ICON } from './personaVisuals';

/**
 * "Viewing as" dropdown in the app header: lets a signed-in user see (and, in
 * the demo build, jump between) the six seeded personas without digging
 * through Sign out.
 *
 * Two behaviours depending on {@link ../auth/demoAuth.demoAuthEnabled}:
 * - **Demo build** (no backend): picking a different persona calls the same
 *   `login(role, 'demo')` the persona-picker cards use — a genuine session
 *   change, not a cosmetic label swap.
 * - **Real, backend-authenticated build** (decision D31): there is no
 *   password-less switch. Picking a different role signs the current user out
 *   and sends them to `/login`, where they must authenticate as that role for
 *   real — this is a navigation shortcut, not an authorization bypass.
 */
export function PersonaSwitcher() {
  const { role, login, logout } = useSession();
  const navigate = useNavigate();
  const wrapRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [switching, setSwitching] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onDown = (event: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  if (!role) {
    return null;
  }

  const active = DEMO_PERSONAS.find((p) => p.role === role) ?? DEMO_PERSONAS[0];
  const demo = demoAuthEnabled();

  const pick = async (nextRole: Role) => {
    setOpen(false);
    if (nextRole === role) return;
    setSwitching(true);
    try {
      if (demo) {
        await login(nextRole, 'demo');
        navigate(landingPathFor(nextRole));
      } else {
        await logout();
        navigate('/login');
      }
    } finally {
      setSwitching(false);
    }
  };

  return (
    <div className="persona-switch" ref={wrapRef}>
      <button
        type="button"
        className="persona-switch__btn"
        aria-haspopup="listbox"
        aria-expanded={open}
        disabled={switching}
        onClick={() => setOpen((v) => !v)}
        title={demo ? 'Switch demo persona' : 'Switch role (signs you out)'}
      >
        <span
          className="persona-switch__btn-icon"
          style={accentStyle(PERSONA_ACCENT_ON_DARK[active.role])}
          aria-hidden
        >
          {PERSONA_ICON[active.role]}
        </span>
        <span className="persona-switch__btn-label">Role: {active.label}</span>
        <span aria-hidden="true">▾</span>
      </button>

      {open ? (
        <div className="persona-switch__menu" role="listbox" aria-label="Authority persona">
          <p className="persona-switch__caption">Active authority persona</p>
          {DEMO_PERSONAS.map((persona) => (
            <button
              key={persona.role}
              type="button"
              role="option"
              aria-selected={persona.role === role}
              className="persona-switch__opt"
              data-active={persona.role === role || undefined}
              style={accentStyle(PERSONA_ACCENT[persona.role])}
              onClick={() => void pick(persona.role)}
            >
              <span className="persona-switch__opt-icon" aria-hidden>
                {PERSONA_ICON[persona.role]}
              </span>
              <span className="persona-switch__opt-text">
                <span className="persona-switch__opt-label">{persona.label}</span>
                <span className="persona-switch__opt-blurb">{persona.blurb}</span>
              </span>
            </button>
          ))}
          {!demo ? (
            <p className="persona-switch__hint">
              Switching roles signs you out — you'll sign back in as that role.
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
