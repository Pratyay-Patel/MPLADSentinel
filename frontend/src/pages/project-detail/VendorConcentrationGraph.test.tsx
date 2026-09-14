import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { VendorConcentrationGraph } from './VendorConcentrationGraph';
import { computeVendorConcentration } from './vendorConcentration';
import type { PaymentInstallment } from '../../data';

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

describe('VendorConcentrationGraph', () => {
  it('renders the hub, HHI badge, and top vendor for the real work #1991 breakdown', () => {
    const data = computeVendorConcentration([
      payment('MS AMAN ENTERPRISES', 342000),
      payment('AMANDEEP BUILDING MATERIAL', 52200),
      payment('MS SHIV SHAKTI BRICK IND', 35000),
      payment('AMIN CHAND SANJIV KUMAR', 10500),
      payment('AMRIK SINGH SON OF SAWARN SINGH', 10000),
      payment('SANT RAM SON OF KULDEEP RAM', 9500),
      payment('MURLI', 8000),
      payment('GURBAKSH KAUR WIFE OF JASVIR SINGH', 8000),
      payment('KIRAN DEVI D O MUKESH KUMAR', 8000),
      payment('MANJIT KAUR WIFE OF JARNAIL SINGH', 8000),
      payment('AMARJEET SON OF MURLI', 8000),
      payment('JAGIRA SON OF ILAMDEEN', 800),
    ])!;

    render(<VendorConcentrationGraph data={data} workTitle="Public work #1991" />);

    expect(screen.getByText('Public work #1991')).toBeInTheDocument();
    expect(screen.getByText(/HHI 4861/)).toBeInTheDocument();
    expect(screen.getByText(/Highly concentrated/)).toBeInTheDocument();
    expect(screen.getByText('MS AMAN ENTERPRISES')).toBeInTheDocument();
    expect(screen.getByText('68.4%')).toBeInTheDocument();
    // 12 vendors total, MAX_SHOWN = 6, so 6 are folded into "+N more".
    expect(screen.getByText('+6 more')).toBeInTheDocument();
  });
});
