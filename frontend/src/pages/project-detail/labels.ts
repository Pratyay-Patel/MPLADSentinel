import type { LifecycleState, PaymentDataState, ProjectHouse } from '../../data';
import type { StatusTone } from '../../ui';

export const LIFECYCLE_LABEL: Record<LifecycleState, string> = {
  RECOMMENDED: 'Recommended',
  COMPLETED: 'Completed',
  RECOMMENDED_AND_COMPLETED: 'Recommended + completed',
};

export const LIFECYCLE_TONE: Record<LifecycleState, StatusTone> = {
  RECOMMENDED: 'info',
  COMPLETED: 'success',
  RECOMMENDED_AND_COMPLETED: 'normal',
};

export const PAYMENT_STATE_LABEL: Record<PaymentDataState, string> = {
  NOT_FETCHED: 'Not fetched',
  FETCHED_PRESENT: 'Records available',
  FETCHED_ABSENT: 'No records found',
  FETCH_ERROR: 'Retrieval failed',
};

export const PAYMENT_STATE_TONE: Record<PaymentDataState, StatusTone> = {
  NOT_FETCHED: 'neutral',
  FETCHED_PRESENT: 'success',
  FETCHED_ABSENT: 'info',
  FETCH_ERROR: 'warning',
};

export const PAYMENT_STATE_NOTE: Record<PaymentDataState, string> = {
  NOT_FETCHED: 'Payment records have not been retrieved for this work yet.',
  FETCHED_PRESENT:
    'Payment installment records were retrieved from the work-level payments endpoint.',
  FETCHED_ABSENT:
    'The payments endpoint returned no records for this work. This is not the same as ₹0 spent.',
  FETCH_ERROR: 'Payment records could not be retrieved for this work.',
};

export function houseLabel(house: ProjectHouse | null): string {
  if (house === 'LOK_SABHA') return 'Lok Sabha';
  if (house === 'RAJYA_SABHA') return 'Rajya Sabha';
  return '—';
}

const FLAG_LABELS: Record<string, string> = {
  HI_FIELDS_MIRROR_EN: 'Hindi fields mirror English',
  BENEFICIARIES_FIELD_UNPOPULATED: 'Beneficiary count not populated',
  MISSING_WORK_DESCRIPTION: 'Work description missing at source',
  UNMAPPED_HOUSE_VALUE: 'House value could not be mapped',
};

export function flagLabel(flag: string): string {
  return (
    FLAG_LABELS[flag] ??
    flag
      .toLowerCase()
      .replace(/_/g, ' ')
      .replace(/^\w/, (c) => c.toUpperCase())
  );
}
