import { describe, expect, it } from 'vitest';

import { AREA_ROLES, canAccess } from './access';
import { ROLES } from './roles';

describe('canAccess', () => {
  it('lets every role into the public areas', () => {
    for (const role of ROLES) {
      expect(canAccess(role, 'projects')).toBe(true);
      expect(canAccess(role, 'citizen')).toBe(true);
      expect(canAccess(role, 'grievances')).toBe(true);
    }
  });

  it('keeps the Citizen role out of the authority areas', () => {
    expect(canAccess('CITIZEN', 'overview')).toBe(false);
    expect(canAccess('CITIZEN', 'risk')).toBe(false);
    expect(canAccess('CITIZEN', 'audit')).toBe(false);
  });

  it('lets every authority role into the monitoring areas', () => {
    for (const role of ['MOSPI', 'STATE', 'DISTRICT', 'AUDITOR', 'MP'] as const) {
      expect(canAccess(role, 'overview')).toBe(true);
      expect(canAccess(role, 'risk')).toBe(true);
      expect(canAccess(role, 'audit')).toBe(true);
    }
  });

  it('references only known roles in the access map', () => {
    for (const roles of Object.values(AREA_ROLES)) {
      for (const role of roles) {
        expect(ROLES).toContain(role);
      }
    }
  });
});
