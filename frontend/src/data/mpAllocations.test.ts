import { describe, expect, it } from 'vitest';

import { lookupAllocation, MP_ALLOCATIONS, normalizeMpName } from './mpAllocations';

describe('normalizeMpName', () => {
  it('uppercases, strips term suffixes, honorifics and punctuation', () => {
    expect(normalizeMpName('Dr. Sikander Kumar (2022-28)')).toBe('SIKANDER KUMAR');
    expect(normalizeMpName('Shri Imran Pratapgarhi (2022-28) (2022-2028)')).toBe('IMRAN PRATAPGARHI');
    expect(normalizeMpName('Adv Dean Kuriakose')).toBe('DEAN KURIAKOSE');
    expect(normalizeMpName('  A. K.  Sharma ')).toBe('A K SHARMA');
    expect(normalizeMpName('RAJESH RANJAN ALIAS PAPPU YADAV')).toBe('RAJESH RANJAN PAPPU YADAV');
  });

  it('keeps a lone name that happens to look like an honorific', () => {
    expect(normalizeMpName('Adv')).toBe('ADV');
  });
});

describe('MP_ALLOCATIONS fixture', () => {
  it('is populated and keyed by normalised name', () => {
    expect(Object.keys(MP_ALLOCATIONS).length).toBeGreaterThan(700);
    for (const key of Object.keys(MP_ALLOCATIONS)) {
      expect(key).toBe(normalizeMpName(key));
      for (const entry of MP_ALLOCATIONS[key]) {
        expect(entry.allocated).toBeGreaterThan(0);
        expect(['LOK_SABHA', 'RAJYA_SABHA']).toContain(entry.house);
      }
    }
  });
});

describe('lookupAllocation', () => {
  it('returns the single match ignoring state', () => {
    expect(lookupAllocation('RICHARD VANLALHMANGAIHA', null)?.allocated).toBe(147_000_000);
  });

  it('uses state to resolve a same-name collision, and gives up cleanly otherwise', () => {
    expect(lookupAllocation('Sanjay Seth', 'Jharkhand')?.house).toBe('LOK_SABHA');
    expect(lookupAllocation('Sanjay Seth', 'Uttar Pradesh')?.house).toBe('RAJYA_SABHA');
    expect(lookupAllocation('Sanjay Seth', 'Kerala')).toBeNull();
    expect(lookupAllocation('Sanjay Seth', null)).toBeNull();
  });

  it('returns null for an unknown MP', () => {
    expect(lookupAllocation('Nobody McTestface', 'Kerala')).toBeNull();
  });
});
