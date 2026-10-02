import { describe, expect, it } from 'vitest';

import type { PaymentInstallment } from '../../data';
import { computeVendorConcentration } from './vendorConcentration';

function payment(vendorName: string, amount: number): PaymentInstallment {
  return {
    ordinal: 0,
    amount: { amount, currency: 'INR' },
    paidOn: '2023-12-27',
    vendorName,
    statusRaw: 'Payment Success',
    implementingAuthorityText: null,
  };
}

describe('computeVendorConcentration', () => {
  it('matches the real work #1991 payment breakdown (20 installments, 12 vendors)', () => {
    const payments = [
      payment('MS AMAN ENTERPRISES', 42180),
      payment('MURLI', 8000),
      payment('AMANDEEP BUILDING MATERIAL', 34000),
      payment('MS AMAN ENTERPRISES', 41040),
      payment('MS AMAN ENTERPRISES', 46740),
      payment('SANT RAM SON OF KULDEEP RAM', 9500),
      payment('GURBAKSH KAUR WIFE OF JASVIR SINGH', 8000),
      payment('KIRAN DEVI D O MUKESH KUMAR', 8000),
      payment('AMIN CHAND SANJIV KUMAR', 10500),
      payment('MS AMAN ENTERPRISES', 34200),
      payment('MS AMAN ENTERPRISES', 45600),
      payment('JAGIRA SON OF ILAMDEEN', 800),
      payment('AMRIK SINGH SON OF SAWARN SINGH', 10000),
      payment('MS AMAN ENTERPRISES', 45600),
      payment('MS AMAN ENTERPRISES', 47880),
      payment('MANJIT KAUR WIFE OF JARNAIL SINGH', 8000),
      payment('AMARJEET SON OF MURLI', 8000),
      payment('MS SHIV SHAKTI BRICK IND', 35000),
      payment('AMANDEEP BUILDING MATERIAL', 18200),
      payment('MS AMAN ENTERPRISES', 38760),
    ];

    const result = computeVendorConcentration(payments);

    expect(result).not.toBeNull();
    expect(result!.totalAmount).toBe(500000);
    expect(result!.vendorCount).toBe(12);
    expect(result!.vendors[0].name).toBe('MS AMAN ENTERPRISES');
    expect(result!.vendors[0].amount).toBe(342000);
    expect(result!.vendors[0].sharePct).toBeCloseTo(68.4, 5);
    expect(result!.vendors[0].tone).toBe('danger');
    expect(result!.hhi).toBe(4861);
    expect(result!.concentrationLabel).toBe('Highly concentrated');
  });

  it('returns null when fewer than 2 named vendors have recorded amounts', () => {
    expect(computeVendorConcentration([payment('SOLO VENDOR', 1000)])).toBeNull();
    expect(computeVendorConcentration([])).toBeNull();
    expect(computeVendorConcentration(null)).toBeNull();
  });

  it('ignores payments with no vendor name or non-positive amounts', () => {
    const payments = [
      payment('A', 100),
      payment('B', 100),
      { ...payment('', 500) },
      { ...payment('C', 0) },
    ];
    const result = computeVendorConcentration(payments);
    expect(result!.vendorCount).toBe(2);
    expect(result!.totalAmount).toBe(200);
  });
});
