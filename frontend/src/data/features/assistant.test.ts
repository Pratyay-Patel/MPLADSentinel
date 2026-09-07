import { describe, expect, it } from 'vitest';

import { createDemoDataProvider } from '../demo/DemoDataProvider';
import { demoProjects } from '../demo/fixtures';
import { createAssistantService } from './assistant';

describe('createAssistantService', () => {
  it('builds an id-addressable work index plus MP / state / category rollups', async () => {
    const data = await createAssistantService(createDemoDataProvider()).load();

    expect(data.source).toBe('demo');
    expect(data.works).toHaveLength(demoProjects.length);
    // every work carries an id, a title and a risk level
    expect(data.works.every((w) => w.id > 0 && w.title.length > 0 && w.riskLevel)).toBe(true);

    // rollups are non-empty and internally consistent
    expect(data.mps.length).toBeGreaterThan(0);
    expect(data.states.length).toBeGreaterThan(0);
    expect(data.categories.length).toBeGreaterThan(0);

    const worksInStates = data.states.reduce((sum, s) => sum + s.works, 0);
    const worksWithState = data.works.filter((w) => w.state).length;
    expect(worksInStates).toBe(worksWithState);

    // name lists match the rollups
    expect(new Set(data.knownStates)).toEqual(new Set(data.states.map((s) => s.state)));
    expect(data.knownMps).toContain(data.mps[0].name);
  });
});
