import type { PaymentInstallment, Project } from '../../data';
import { formatDate, formatINRCompact } from '../../format';

interface Entry {
  key: string;
  display: string;
  label: string;
  sort: number;
}

/**
 * A compact vertical list of the dated events we actually have: recommended,
 * each payment installment, completed. Source-reported dates only — not a
 * verified lifecycle, and there is no physical-progress data.
 */
export function DetailTimeline({
  project,
  payments,
}: {
  project: Project;
  payments: PaymentInstallment[];
}) {
  const entries: Entry[] = [];

  const addDateOrYear = (date: string | null, year: number | null, label: string) => {
    if (date) {
      entries.push({
        key: `${label}-${date}`,
        display: formatDate(date),
        label,
        sort: Date.parse(date),
      });
    } else if (year != null) {
      entries.push({
        key: `${label}-${year}`,
        display: `${year} (year only)`,
        label,
        sort: Date.UTC(year, 5, 30),
      });
    }
  };

  addDateOrYear(project.recommendedOn, project.recommendedYear, 'Recommended');
  for (const p of payments) {
    if (p.paidOn) {
      entries.push({
        key: `payment-${p.ordinal}`,
        display: formatDate(p.paidOn),
        label: `Payment — ${formatINRCompact(p.amount)}`,
        sort: Date.parse(p.paidOn),
      });
    }
  }
  addDateOrYear(project.completedOn, project.completionYear, 'Completed');

  entries.sort((a, b) => a.sort - b.sort);

  if (entries.length === 0) {
    return <p className="detail-note">No dated events are available for this work.</p>;
  }

  return (
    <ol className="detail-timeline">
      {entries.map((entry) => (
        <li className="detail-timeline__item" key={entry.key}>
          <span className="detail-timeline__date">{entry.display}</span>
          <span className="detail-timeline__label">{entry.label}</span>
        </li>
      ))}
    </ol>
  );
}
