import { describe, expect, it, vi } from 'vitest';

import type { DataProvider } from '../DataProvider';
import { createDemoDataProvider } from '../demo/DemoDataProvider';
import { createProjectDetailService } from './projectDetail';

const WORK_WITH_PAYMENTS = 900_000_002; // FETCHED_PRESENT, 3 installments
const WORK_NOT_FETCHED = 900_000_001; // NOT_FETCHED

describe('createProjectDetailService', () => {
  it('returns the project plus installment rows for a payments-present work', async () => {
    const service = createProjectDetailService(createDemoDataProvider());
    const data = await service.load(WORK_WITH_PAYMENTS);

    expect(data).not.toBeNull();
    expect(data!.project.sourceWorkId).toBe(WORK_WITH_PAYMENTS);
    expect(data!.payments).toHaveLength(3);
    const total = data!.payments.reduce((sum, p) => sum + p.amount.amount, 0);
    expect(total).toBe(data!.project.recordedPayments!.amount);
  });

  it('does not call getProjectPayments unless the work has present payment data', async () => {
    const provider: DataProvider = { ...createDemoDataProvider() };
    const spy = vi.spyOn(provider, 'getProjectPayments');

    const data = await createProjectDetailService(provider).load(WORK_NOT_FETCHED);

    expect(data!.payments).toEqual([]);
    expect(spy).not.toHaveBeenCalled();
  });

  it('resolves to null for an unknown id', async () => {
    const service = createProjectDetailService(createDemoDataProvider());
    expect(await service.load(-1)).toBeNull();
  });
});
