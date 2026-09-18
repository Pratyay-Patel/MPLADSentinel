import type { CitizenAssistantData, CitizenAssistantMp, CitizenAssistantState, CitizenAssistantWork } from '../../data';
import { formatINRCompact } from '../../format';

export interface CitizenAssistantReply {
  text: string;
  link?: { label: string; to: string };
}

const FALLBACK: CitizenAssistantReply = {
  text: 'I answer from this portal’s loaded public data. Try: a work by its id ("work #…"), an MP by name, a state or district ("works in …"), a category, fund utilisation, or the most expensive works.',
};

const nf = (n: number) => n.toLocaleString('en-IN');
const pct = (n: number) => `${Math.round(n)}%`;
const inr = (n: number) => formatINRCompact({ amount: n, currency: 'INR' });

// --- name matching -----------------------------------------------------------
// (identical matching logic to the authority assistant's answer.ts — pure
// string matching, no risk data involved either way.)

function norm(s: string): string {
  return ` ${s.toLowerCase().replace(/[.,'\-/]/g, ' ').replace(/\s+/g, ' ').trim()} `;
}

function matchName(q: string, names: string[]): string | null {
  const nq = norm(q);
  for (const n of [...names].sort((a, b) => b.length - a.length)) {
    if (nq.includes(norm(n).trimEnd())) return n;
  }
  for (const n of names) {
    const toks = norm(n).trim().split(' ').filter((t) => t.length > 2);
    if (toks.length === 0) continue;
    const last = toks[toks.length - 1];
    if (nq.includes(` ${last} `) || nq.endsWith(` ${last}`)) return n;
    if (toks.every((t) => nq.includes(` ${t}`))) return n;
  }
  return null;
}

function parseAmount(q: string): number | null {
  const m = q.match(/([\d][\d,.]*)\s*(crore|cr|lakh|lac|k|thousand|l)\b/i);
  if (!m) return null;
  const n = parseFloat(m[1].replace(/,/g, ''));
  if (!Number.isFinite(n)) return null;
  const unit = m[2].toLowerCase();
  if (unit.startsWith('cr') || unit === 'crore') return n * 1e7;
  if (unit.startsWith('la') || unit === 'l') return n * 1e5;
  if (unit === 'k' || unit === 'thousand') return n * 1e3;
  return n;
}

// --- reply builders --------------------------------------------------------
// No risk level, score, reasons or flagged counts anywhere below — those
// fields don't exist on CitizenAssistantData in the first place.

function workReply(w: CitizenAssistantWork): CitizenAssistantReply {
  const where = [w.district, w.state].filter(Boolean).join(', ');
  const meta = [w.category, where, w.mpName ? `MP ${w.mpName}` : null].filter(Boolean).join(' · ');
  const cost = w.estimatedCost != null ? `Estimated cost ${inr(w.estimatedCost)}.` : 'No estimate recorded.';
  const paid =
    w.recordedPayments != null ? ` Recorded payments ${inr(w.recordedPayments)}.` : ' No payment record.';
  return {
    text: `Work #${w.id} — ${w.title}. ${meta}. ${cost}${paid}`,
    link: { label: 'Open the public record', to: `/citizen/${w.id}` },
  };
}

function mpReply(m: CitizenAssistantMp): CitizenAssistantReply {
  const util =
    m.utilisationPct != null
      ? `Recorded fund utilisation ${pct(m.utilisationPct)}${m.band ? ` (${m.band})` : ''}.`
      : 'Not enough scored works to compute fund utilisation.';
  return {
    text: `${m.name}${m.constituency ? ` (${m.constituency}${m.state ? `, ${m.state}` : ''})` : ''}: ${nf(
      m.works,
    )} works, ${nf(m.completed)} completed. ${util}`,
    link: { label: 'Compare MPs', to: '/citizen/compare' },
  };
}

function stateReply(s: CitizenAssistantState): CitizenAssistantReply {
  const util =
    s.utilisationPct != null
      ? `Recorded fund utilisation ${pct(s.utilisationPct)}${s.band ? ` (${s.band})` : ''}.`
      : 'Not enough scored works to compute fund utilisation.';
  return {
    text: `${s.state}: ${nf(s.works)} works in view. ${util}`,
    link: { label: 'Open the Transparency Overview', to: '/citizen/overview' },
  };
}

// --- matchers ------------------------------------------------------------------

type Matcher = (q: string, data: CitizenAssistantData) => CitizenAssistantReply | null;

/** "work #123", "tell me about 123" — only when the number is a real work id
 *  in the loaded public data. */
const workLookup: Matcher = (q, data) => {
  const ids = new Set(data.works.map((w) => w.id));
  const hit = [...q.matchAll(/\d{3,}/g)].map((m) => Number(m[0])).find((n) => ids.has(n));
  if (hit == null) return null;
  const w = data.works.find((x) => x.id === hit)!;
  return workReply(w);
};

const mpLookup: Matcher = (q, data) => {
  const name = matchName(q, data.knownMps);
  if (!name) return null;
  const wantsMp =
    /how|what|tell|show|about|summar|overview|utilis|perform|done|doing|record|works|scorecard|profile|constituenc/.test(
      q,
    ) || q.split(/\s+/).length <= 6;
  if (!wantsMp) return null;
  const m = data.mps.find((x) => x.name === name);
  return m ? mpReply(m) : null;
};

const stateLookup: Matcher = (q, data) => {
  const name = matchName(q, data.knownStates);
  if (!name) return null;
  if (!/how many|works|summar|breakdown|overview|utilis|about|tell|show|profile|doing/.test(q)) {
    return null;
  }
  // don't shadow the "lowest/highest utilisation" ranking questions
  if (/(low|lowest|worst|high|highest|best|top|bottom).*(utilis|fund)/.test(q)) return null;
  const s = data.states.find((x) => x.state === name);
  return s ? stateReply(s) : null;
};

const districtLookup: Matcher = (q, data) => {
  const name = matchName(q, data.knownDistricts);
  if (!name || !/how many|works|in |list|show/.test(q)) return null;
  const inDistrict = data.works.filter((w) => w.district === name);
  if (inDistrict.length === 0) return null;
  return {
    text: `${name}: ${nf(inDistrict.length)} works in view.`,
    link: { label: 'Open the Citizen Portal', to: '/citizen' },
  };
};

const categoryLookup: Matcher = (q, data) => {
  const name = matchName(q, data.knownCategories);
  if (!name || !/how many|works|category|sector|summar|in /.test(q)) return null;
  const c = data.categories.find((x) => x.category === name);
  if (!c) return null;
  return {
    text: `${c.category}: ${nf(c.works)} works.`,
    link: { label: 'Open the Citizen Portal', to: '/citizen' },
  };
};

const mostExpensive: Matcher = (q, data) => {
  if (!/(most expensive|highest cost|biggest|largest|costliest|top).*works?|works?.*(most expensive|highest cost|costliest)/.test(q)) {
    return null;
  }
  const ranked = data.works
    .filter((w) => w.estimatedCost != null)
    .sort((a, b) => (b.estimatedCost ?? 0) - (a.estimatedCost ?? 0))
    .slice(0, 3);
  if (ranked.length === 0) return { text: 'No works have an estimated cost recorded.' };
  const list = ranked.map((w) => `#${w.id} ${w.title} (${inr(w.estimatedCost as number)})`).join('; ');
  return { text: `Highest estimated cost: ${list}.`, link: { label: 'Open the Citizen Portal', to: '/citizen' } };
};

const worksOverAmount: Matcher = (q, data) => {
  if (!/works?.*(over|above|more than|greater than|at least|exceed|costing)/.test(q)) return null;
  const amount = parseAmount(q);
  if (amount == null) return null;
  const over = data.works.filter((w) => (w.estimatedCost ?? 0) >= amount);
  return {
    text: `${nf(over.length)} of ${nf(data.totalWorks)} works have an estimated cost of ${inr(
      amount,
    )} or more.`,
    link: { label: 'Open the Citizen Portal', to: '/citizen' },
  };
};

const worksInPlace: Matcher = (q, data) => {
  if (!/how many works|number of works|works in |list works|count .*works/.test(q)) return null;
  const state = matchName(q, data.knownStates);
  if (state) {
    const s = data.states.find((x) => x.state === state);
    if (s) return stateReply(s);
  }
  return {
    text: `${nf(data.totalWorks)} works are loaded in total. Name a state, district or category to narrow it down.`,
    link: { label: 'Open the Citizen Portal', to: '/citizen' },
  };
};

const overallUtilisation: Matcher = (q, data) => {
  if (!/(overall|national|total|average|combined).*(utilis)|utilis.*(overall|national|rate|average)/.test(q)) {
    return null;
  }
  return {
    text: `Recorded utilisation across the loaded data is ${pct(
      data.recordedUtilisationPct,
    )} — total recorded payments ÷ total sanctioned cost, over the ${nf(
      data.worksWithPayments,
    )} works where both are known. Not audited expenditure.`,
    link: { label: 'Open Analytics', to: '/citizen/analytics' },
  };
};

const rankUtilisation: Matcher = (q, data) => {
  const low = /(low|lowest|worst|poor|bottom)/.test(q);
  const high = /(high|highest|best|top)/.test(q);
  if ((!low && !high) || !/(utilis|fund|spend|payment)/.test(q)) return null;
  const scored = data.states
    .filter((s) => s.utilisationPct != null)
    .sort((a, b) => (a.utilisationPct as number) - (b.utilisationPct as number));
  if (scored.length === 0) {
    return { text: 'No state has enough scored works yet to rank fund utilisation.' };
  }
  const pick = low ? scored.slice(0, 3) : [...scored].reverse().slice(0, 3);
  const list = pick.map((s) => `${s.state} (${pct(s.utilisationPct as number)})`).join(', ');
  return {
    text: `${low ? 'Lowest' : 'Highest'} recorded fund utilisation: ${list}. Recorded payments ÷ sanctioned cost, over works where both are known — not audited expenditure.`,
    link: { label: 'Open Analytics', to: '/citizen/analytics' },
  };
};

const greeting: Matcher = (q) => {
  if (!/^(hi|hello|hey|namaste|help|what can you (do|answer)|who are you)\b/.test(q)) return null;
  return { text: FALLBACK.text };
};

const MATCHERS: Matcher[] = [
  workLookup,
  mpLookup,
  stateLookup,
  districtLookup,
  categoryLookup,
  mostExpensive,
  worksOverAmount,
  overallUtilisation,
  rankUtilisation,
  worksInPlace,
  greeting,
];

/** Route a question to a grounded, templated answer. Never free-generates.
 *  No risk-related matcher exists here at all (unlike the authority
 *  answer.ts) — risk methodology, factor definitions, flagged-work counts
 *  and "most flagged MP" simply have no citizen-side equivalent. */
export function answerCitizenQuestion(raw: string, data: CitizenAssistantData): CitizenAssistantReply {
  const q = raw.toLowerCase().trim();
  if (!q) return FALLBACK;
  for (const matcher of MATCHERS) {
    const reply = matcher(q, data);
    if (reply) return reply;
  }
  return FALLBACK;
}

export const CITIZEN_STARTER_PROMPTS = [
  'How many works are in Maharashtra?',
  'What are the most expensive works?',
  'Which states have the highest fund utilisation?',
  'Which states have the lowest fund utilisation?',
];
