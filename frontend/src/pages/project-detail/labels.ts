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
  NOT_FETCHED: 'Payment records have not yet been retrieved for this work.',
  FETCHED_PRESENT: 'Individual payment installment records are available for this work.',
  FETCHED_ABSENT:
    'No payment records are available for this work. An absent record means none were found — not that no payment was made.',
  FETCH_ERROR: 'Payment records could not be retrieved for this work.',
};

export function houseLabel(house: ProjectHouse | null): string {
  if (house === 'LOK_SABHA') return 'Lok Sabha';
  if (house === 'RAJYA_SABHA') return 'Rajya Sabha';
  return '—';
}

const FLAG_LABELS: Record<string, string> = {
  HI_FIELDS_MIRROR_EN: 'Hindi fields duplicate the English text',
  BENEFICIARIES_FIELD_UNPOPULATED: 'Beneficiary count not provided',
  MISSING_WORK_DESCRIPTION: 'Work description not provided',
  UNREADABLE_WORK_DESCRIPTION: 'Work description could not be read',
  UNMAPPED_HOUSE_VALUE: 'House value could not be mapped',
  MP_PARTY_FIELD_IS_HOUSE_NOT_PARTY: 'Party field contains the house name',
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
