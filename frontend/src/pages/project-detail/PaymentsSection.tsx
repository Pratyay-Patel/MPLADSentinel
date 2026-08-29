import type { PaymentInstallment, Project } from '../../data';
import { formatDate, formatINRExact } from '../../format';
import {
  Card,
  DataTable,
  EmptyState,
  KeyValueList,
  SectionHeader,
  StatusBadge,
  type Column,
} from '../../ui';
import { PAYMENT_STATE_LABEL, PAYMENT_STATE_NOTE, PAYMENT_STATE_TONE } from './labels';

const columns: Column<PaymentInstallment>[] = [
  { key: 'ordinal', header: '#', render: (row) => row.ordinal + 1 },
  { key: 'amount', header: 'Amount', align: 'right', render: (row) => formatINRExact(row.amount) },
  { key: 'paidOn', header: 'Paid on', render: (row) => formatDate(row.paidOn) },
  { key: 'vendor', header: 'Vendor', render: (row) => row.vendorName ?? '—' },
  {
    key: 'status',
    header: 'Status',
    render: (row) =>
      row.statusRaw ? (
        <StatusBadge tone="success" srLabel="Payment status">
          {row.statusRaw}
        </StatusBadge>
      ) : (
        '—'
      ),
  },
  {
    key: 'ida',
    header: 'Implementing authority',
    render: (row) => row.implementingAuthorityText ?? '—',
  },
];

export function PaymentsSection({
  project,
  payments,
}: {
  project: Project;
  payments: PaymentInstallment[];
}) {
  const state = project.paymentDataState;

  return (
    <Card>
      <SectionHeader
        title="Payments"
        actions={
          <StatusBadge tone={PAYMENT_STATE_TONE[state]} srLabel="Payment data state">
            {PAYMENT_STATE_LABEL[state]}
          </StatusBadge>
        }
      />
      <p className="detail-note" style={{ marginTop: 0 }}>
        {PAYMENT_STATE_NOTE[state]}
      </p>

      {state === 'FETCHED_PRESENT' && (
        <>
          <div style={{ marginTop: 'var(--space-4)' }}>
            <KeyValueList
              items={[
                {
                  label: 'Total recorded payments',
                  value: formatINRExact(project.recordedPayments),
                },
                { label: 'Installments', value: project.paymentInstallments ?? payments.length },
              ]}
            />
          </div>
          <div style={{ marginTop: 'var(--space-4)' }}>
            <DataTable
              caption="Payment installments"
              columns={columns}
              rows={payments}
              getRowKey={(row) => row.ordinal}
              emptyState={
                <EmptyState
                  title="No installment rows"
                  description="The summary reports payments but no installment rows were returned."
                />
              }
            />
          </div>
        </>
      )}
    </Card>
  );
}
