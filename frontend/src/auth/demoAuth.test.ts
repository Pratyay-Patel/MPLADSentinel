import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  clearDemoSession,
  demoAuthEnabled,
  demoLogin,
  readDemoSession,
  writeDemoSession,
} from './demoAuth';

afterEach(() => {
  vi.unstubAllEnvs();
  try {
    sessionStorage.clear();
  } catch {
    // ignore
  }
});

describe('demoAuth', () => {
  it('is disabled unless VITE_DEMO_AUTH is exactly "true"', () => {
    expect(demoAuthEnabled()).toBe(false);
    vi.stubEnv('VITE_DEMO_AUTH', 'false');
    expect(demoAuthEnabled()).toBe(false);
    vi.stubEnv('VITE_DEMO_AUTH', 'true');
    expect(demoAuthEnabled()).toBe(true);
  });

  it('round-trips a persona through sessionStorage', () => {
    expect(readDemoSession()).toBeNull();
    const user = writeDemoSession('MOSPI');
    expect(user).toMatchObject({ username: 'mospi', role: 'MOSPI' });
    expect(readDemoSession()).toMatchObject({ role: 'MOSPI' });
    clearDemoSession();
    expect(readDemoSession()).toBeNull();
  });

  it('demoLogin accepts any casing and rejects unknown roles', () => {
    expect(demoLogin('citizen')).toMatchObject({ role: 'CITIZEN' });
    expect(demoLogin('DiStRiCt')).toMatchObject({ role: 'DISTRICT' });
    expect(() => demoLogin('overlord')).toThrow(/unknown demo persona/i);
  });

  it('ignores a corrupt stored value', () => {
    sessionStorage.setItem('mplads.demoSession', '{"role":"NOT_A_ROLE"}');
    expect(readDemoSession()).toBeNull();
    sessionStorage.setItem('mplads.demoSession', 'not json');
    expect(readDemoSession()).toBeNull();
  });
});
