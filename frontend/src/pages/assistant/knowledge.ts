/**
 * Fixed methodology guide for the Assistant. These answers never change with the
 * data — they explain how the portal works. Grounding rule: they describe the
 * model and the data source, and always frame risk as an indicator for review,
 * never proof (CLAUDE.md §17 / §9).
 */

export interface KnowledgeEntry {
  /** Lower-cased regexes; first match wins. */
  patterns: RegExp[];
  answer: string;
  link?: { label: string; to: string };
}

export const SCORE_METHOD: KnowledgeEntry = {
  patterns: [
    /how .*(risk )?(score|rating).*(comput|calculat|work|deriv|assign)/,
    /how .*(comput|calculat|assign|work out).*(risk )?(score|rating)/,
    /how does .*(risk|scoring)/,
    /what is the (risk )?score based on/,
    /explain the (risk )?scor/,
  ],
  answer:
    'The risk score is produced by a weighted statistical model. Each factor that fires adds a fixed number of points (for example: recorded payments over the estimate +45, full payout before completion +45, single-installment payout +25). The 0–100 score is the sum of those points, capped at 100. HIGH is 55+, MEDIUM is 25–54, below that is LOW. The score is an indicator for review, not proof of wrongdoing — open a work to see exactly which factors were flagged.',
  link: { label: 'Open the risk queue', to: '/risk' },
};

export const NOT_PROOF: KnowledgeEntry = {
  patterns: [
    /proof|fraud|guilty|corrupt|scam|embezzl/,
    /is .*(high risk|flagged).*(bad|wrong|fraud)/,
    /does .*(high risk|flag).*(mean).*(fraud|wrong)/,
  ],
  answer:
    'No. A risk score is a statistical indicator that a work is worth reviewing — it is never proof of fraud or wrongdoing. A high score means the model saw one or more financial or data-quality signals that a reviewer should check on the ground. Formal action always needs on-site verification.',
  link: { label: 'See flagged works', to: '/risk' },
};

export const DATA_SOURCE: KnowledgeEntry = {
  patterns: [
    /where .*(data|figures?|numbers?).*(come|from|source)/,
    /data source|which (dataset|api)|empowered indian|e-?sakshi|esaakshi/,
    /is this official/,
  ],
  answer:
    'Work and payment records come from the Empowered Indian public API — a secondary data-access source, not the official MPLADS / MoSPI system. Official aggregate figures come from the MoSPI e-SAKSHI dashboard. Where a work has no payment record, the portal treats it as "unknown" — never as zero spend.',
};

export const WHAT_IS_MPLADS: KnowledgeEntry = {
  patterns: [/what is mplads/, /what.?s mplads/, /mplads scheme|about mplads/],
  answer:
    'MPLADS is the Members of Parliament Local Area Development Scheme. Each MP can recommend development works — roads, school rooms, water supply, community assets — in their area up to an annual entitlement, which the district administration executes. This portal monitors those recommended and completed works and the payments recorded against them.',
};

export const METHODOLOGY_ENTRIES: KnowledgeEntry[] = [
  SCORE_METHOD,
  NOT_PROOF,
  DATA_SOURCE,
  WHAT_IS_MPLADS,
];

/** Plain-language definition + point weight for each model factor. */
export const FACTOR_GUIDE: { keywords: RegExp; name: string; text: string }[] = [
  {
    keywords: /overspend|payments? (exceed|over|above).*(estimat|cost)/,
    name: 'Cost overspend',
    text: 'Recorded payments are above the sanctioned estimate for the work. Adds 45 points.',
  },
  {
    keywords: /payout before completion|released before complet|before it.?s complete/,
    name: 'Payout before completion',
    text: 'Most of the sanctioned cost was released while the work is not marked complete. Adds 45 points.',
  },
  {
    keywords: /single[- ]?installment|one installment|full amount .*(one|single)/,
    name: 'Single-installment payout',
    text: 'The whole amount was released in a single installment. Adds 25 points.',
  },
  {
    keywords: /dormant|recommended .*(long ago|years ago).*(no payment)|no payment records/,
    name: 'Dormant, no payments',
    text: 'The work was recommended long ago and has no payment records against it. Adds 30 points, rising to 45 after two years and 55 after three (long-dormant).',
  },
  {
    keywords: /cost outlier|outlier|highest .*(cost|estimate).*(categ|peer|cohort)/,
    name: 'Cost outlier vs peers',
    text: 'This work has the highest estimated cost among comparable works in its category. Adds 25 points.',
  },
  {
    keywords: /payment data (unavailable|missing)|could not .*(retriev|fetch).*(payment)/,
    name: 'Payment data unavailable',
    text: 'Payment records for this work could not be retrieved for review. Adds 25 points.',
  },
];
