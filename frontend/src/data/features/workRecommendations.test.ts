import { describe, expect, it } from 'vitest';

import { createDemoDataProvider } from '../demo/DemoDataProvider';
import { createWorkRecommendationsService } from './workRecommendations';

describe('createWorkRecommendationsService (demo provider)', () => {
  it('derives real states and MPs from the citizen-safe public works list', async () => {
    const service = createWorkRecommendationsService(createDemoDataProvider());
    const { states, mpsByState } = await service.load();

    expect(states).toContain('Rajasthan');
    expect(states).toEqual([...states].sort((a, b) => a.localeCompare(b)));

    const rajasthanMps = mpsByState['Rajasthan'];
    expect(rajasthanMps.length).toBeGreaterThan(0);
    expect(rajasthanMps.every((mp) => mp.mpName && mp.constituency)).toBe(true);
    // no cross-state leakage
    expect(mpsByState['Maharashtra']?.some((mp) => mp.mpName === 'A. K. Sharma')).toBeFalsy();
  });

  it('submits a recommendation and returns it with a real, unique tracking number', async () => {
    const service = createWorkRecommendationsService(createDemoDataProvider());

    const saved = await service.submit({
      fullName: 'A Citizen',
      mobileNumber: '9876543210',
      email: null,
      state: 'Rajasthan',
      mpName: 'A. K. Sharma',
      constituency: 'Jaipur Rural',
      locationCategory: 'RURAL',
      gpsCoordinatesLink: '26.9124,75.7873',
      workTitle: 'RO drinking water plant',
      category: 'Drinking Water & Sanitation',
      description: 'There is no safe drinking water source within several kilometres.',
    });

    expect(saved.status).toBe('SUBMITTED');
    expect(saved.trackingNumber).toMatch(/^CIT-\d{4}-\d{6}$/);
    expect(saved.actionNote).toBeNull();

    const { recommendations } = await service.load();
    expect(recommendations.some((r) => r.id === saved.id)).toBe(true);
  });

  it('advances a recommendation status and records an action note', async () => {
    const service = createWorkRecommendationsService(createDemoDataProvider());
    const saved = await service.submit({
      fullName: 'A Citizen',
      mobileNumber: '9876543210',
      email: null,
      state: 'Rajasthan',
      mpName: 'A. K. Sharma',
      constituency: 'Jaipur Rural',
      locationCategory: 'RURAL',
      gpsCoordinatesLink: '26.9124,75.7873',
      workTitle: 'RO drinking water plant',
      category: 'Drinking Water & Sanitation',
      description: 'There is no safe drinking water source within several kilometres.',
    });

    const updated = await service.updateStatus(saved.id, {
      status: 'RECOMMENDED',
      actionNote: 'Endorsed after site verification.',
    });

    expect(updated.status).toBe('RECOMMENDED');
    expect(updated.actionNote).toBe('Endorsed after site verification.');
  });
});
