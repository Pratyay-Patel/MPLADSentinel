import { useEffect, useRef, useState } from 'react';

/**
 * Language switcher backed by the Google Website Translator widget.
 *
 * The widget's machinery lives in a hidden `#google_translate_element`
 * (see `index.html`); this component is our own trigger + menu. Picking a
 * language sets the hidden `.goog-te-combo` and fires `change`, which is what
 * the widget listens for. Machine translation — not a curated i18n bundle.
 */

interface Lang {
  code: string;
  label: string;
}

const LANGS: Lang[] = [
  { code: 'en', label: 'English' },
  { code: 'hi', label: 'हिन्दी' },
  { code: 'bn', label: 'বাংলা' },
  { code: 'ta', label: 'தமிழ்' },
  { code: 'te', label: 'తెలుగు' },
  { code: 'kn', label: 'ಕನ್ನಡ' },
  { code: 'ml', label: 'മലയാളം' },
  { code: 'mr', label: 'मराठी' },
  { code: 'gu', label: 'ગુજરાતી' },
  { code: 'pa', label: 'ਪੰਜਾਬੀ' },
  { code: 'or', label: 'ଓଡ଼ିଆ' },
  { code: 'as', label: 'অসমীয়া' },
];

function currentCodeFromCookie(): string {
  const match = /(?:^|;\s*)googtrans=([^;]+)/.exec(document.cookie);
  if (!match) return 'en';
  const parts = decodeURIComponent(match[1]).split('/'); // "/en/hi"
  return parts[2] || 'en';
}

function applyLanguage(code: string) {
  const trySet = (attempt: number) => {
    const combo = document.querySelector<HTMLSelectElement>('.goog-te-combo');
    if (!combo) {
      if (attempt < 20) setTimeout(() => trySet(attempt + 1), 150);
      return;
    }
    if (code === 'en') {
      // Clear the translation: drop the cookie and reload to the source text.
      document.cookie = 'googtrans=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/';
      document.cookie = `googtrans=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; domain=.${location.hostname}`;
      location.reload();
      return;
    }
    combo.value = code;
    combo.dispatchEvent(new Event('change'));
  };
  trySet(0);
}

export function LanguageSwitcher() {
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState('en');
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setCode(currentCodeFromCookie());
  }, []);

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

  const active = LANGS.find((l) => l.code === code) ?? LANGS[0];

  const pick = (next: string) => {
    setOpen(false);
    if (next === code) return;
    setCode(next);
    applyLanguage(next);
  };

  return (
    <div className="lang-switch" ref={wrapRef}>
      <button
        type="button"
        className="lang-switch__btn"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        title="Change language (machine translation)"
      >
        <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" fill="none">
          <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.6" />
          <path
            d="M3 12h18M12 3c2.5 2.5 3.8 5.7 3.8 9S14.5 18.5 12 21c-2.5-2.5-3.8-5.7-3.8-9S9.5 5.5 12 3Z"
            stroke="currentColor"
            strokeWidth="1.6"
          />
        </svg>
        <span className="lang-switch__label" translate="no">
          {active.label}
        </span>
        <span aria-hidden="true">▾</span>
      </button>
      {open ? (
        <ul className="lang-switch__menu" role="listbox" aria-label="Language">
          {LANGS.map((lang) => (
            <li key={lang.code}>
              <button
                type="button"
                role="option"
                aria-selected={lang.code === code}
                className="lang-switch__opt"
                data-active={lang.code === code || undefined}
                translate="no"
                onClick={() => pick(lang.code)}
              >
                {lang.label}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
