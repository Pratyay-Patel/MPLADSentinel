import type { AssistantData, AssistantMp, AssistantState, AssistantWork } from '../../data';
import { formatINRCompact } from '../../format';
import { FACTOR_GUIDE, METHODOLOGY_ENTRIES } from './knowledge';

export interface AssistantReply {
  text: string;
  link?: { label: string; to: string };
}

const FALLBACK: AssistantReply = {
  text: 'I answer from this portal’s loaded data and a fixed methodology guide. Try: how the risk score is computed, what a risk factor means, a work by its id ("work #…"), an MP by name, a state or district ("works in …"), a category, fund utilisation, or the most common risk factors.',
};

const nf = (n: number) => n.toLocaleString('en-IN');
const pct = (n: number) => `${Math.round(n)}%`;
const inr = (n: number) => formatINRCompact({ amount: n, currency: 'INR' });

// --- name matching -----------------------------------------------------------

function norm(s: string): string {
  return ` ${s.toLowerCase().replace(/[.,'\-/]/g, ' ').replace(/\s+/g, ' ').trim()} `;
}

/** Best match of `q` against a list of entity names: a full-name substring wins;
 *  else a name whose surname / all distinctive tokens appear as words. */
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

const riskLine = (risk: Record<string, number>) =>
  `${nf(risk.HIGH)} HIGH, ${nf(risk.MEDIUM)} MEDIUM, ${nf(risk.LOW)} LOW, ${nf(risk.UNKNOWN)} not assessed`;

// --- reply builders --------------------------------------------------------

function workReply(w: AssistantWork): AssistantReply {
  const where = [w.district, w.state].filter(Boolean).join(', ');
  const meta = [w.category, where, w.mpName ? `MP ${w.mpName}` : null].filter(Boolean).join(' · ');
  const cost = w.estimatedCost != null ? `Estimated cost ${inr(w.estimatedCost)}.` : 'No estimate recorded.';
  const paid =
    w.recordedPayments != null ? ` Recorded payments ${inr(w.recordedPayments)}.` : ' No payment record.';
  const risk =
    w.riskLevel === 'UNKNOWN'
      ? 'Not enough data to assess its risk.'
      : `Risk ${w.riskLevel}${w.riskScore != null ? ` (${w.riskScore}/100)` : ''}${
          w.riskReasons.length ? `: ${w.riskReasons.join('; ')}` : ' — no factors flagged'
        }. An indicator for review, not proof.`;
  return {
    text: `Work #${w.id} — ${w.title}. ${meta}. ${cost}${paid} ${risk}`,
    link: { label: 'Open the full record', to: `/projects/${w.id}` },
  };
}

function mpReply(m: AssistantMp): AssistantReply {
  const util =
    m.utilisationPct != null
      ? `Recorded fund utilisation ${pct(m.utilisationPct)}${m.band ? ` (${m.band})` : ''}.`
      : 'Not enough scored works to compute fund utilisation.';
  return {
    text: `${m.name}${m.constituency ? ` (${m.constituency}${m.state ? `, ${m.state}` : ''})` : ''}: ${nf(
      m.works,
    )} works, ${nf(m.completed)} completed. ${util} Risk split — ${riskLine(m.risk)}. ${nf(
      m.flagged,
    )} flagged for review (HIGH or MEDIUM). Risk levels are indicators, not proof.`,
    link: { label: 'Compare MPs', to: '/compare' },
  };
}

function stateReply(s: AssistantState): AssistantReply {
  const util =
    s.utilisationPct != null
      ? `Recorded fund utilisation ${pct(s.utilisationPct)}${s.band ? ` (${s.band})` : ''}.`
      : 'Not enough scored works to compute fund utilisation.';
  return {
    text: `${s.state}: ${nf(s.works)} works in view. ${util} Risk split — ${riskLine(s.risk)}. ${nf(
      s.flagged,
    )} flagged for review.`,
    link: { label: `Risk queue for ${s.state}`, to: `/risk?state=${encodeURIComponent(s.state)}` },
  };
}

// --- matchers ------------------------------------------------------------------

type Matcher = (q: string, data: AssistantData) => AssistantReply | null;

const methodology: Matcher = (q) => {
  for (const entry of METHODOLOGY_ENTRIES) {
    if (entry.patterns.some((re) => re.test(q))) return { text: entry.answer, link: entry.link };
  }
  return null;
};

/** "work #123", "why is 123 flagged", "risk score for 123" — only when the number
 *  is a real work id in the loaded data. */
const workLookup: Matcher = (q, data) => {
  const ids = new Set(data.works.map((w) => w.id));
  const hit = [...q.matchAll(/\d{3,}/g)].map((m) => Number(m[0])).find((n) => ids.has(n));
  if (hit == null) return null;
  const w = data.works.find((x) => x.id === hit)!;
  if (/why|flag|risk|score|factor|assess/.test(q) && w.riskLevel !== 'UNKNOWN') {
    const reasons = w.riskReasons.length ? w.riskReasons.join('; ') : 'no factors flagged';
    return {
      text: `Work #${w.id} is ${w.riskLevel}${
        w.riskScore != null ? ` with a score of ${w.riskScore}/100` : ''
      }. Factors: ${reasons}. Each factor adds a fixed weight to the score — it is an indicator for review, not proof of wrongdoing.`,
      link: { label: 'See the factor breakdown', to: `/projects/${w.id}` },
    };
  }
  return workReply(w);
};

const mostFlaggedMp: Matcher = (q, data) => {
  if (!/which mp|who .*(most|highest|top).*(flag|risk|high)|mp .*(most|highest) (flag|risk|high)/.test(q)) {
    return null;
  }
  const ranked = [...data.mps].filter((m) => m.flagged > 0).sort((a, b) => b.flagged - a.flagged);
  if (ranked.length === 0) return { text: 'No MP has a flagged work in the loaded data.' };
  const top = ranked.slice(0, 3).map((m) => `${m.name} (${nf(m.flagged)})`).join(', ');
  return {
    text: `MPs with the most works flagged for review (HIGH or MEDIUM): ${top}. Flags are indicators for review, not findings against the MP.`,
    link: { label: 'Compare MPs', to: '/compare' },
  };
};

const mpLookup: Matcher = (q, data) => {
  const name = matchName(q, data.knownMps);
  if (!name) return null;
  const wantsMp =
    /how|what|tell|show|about|summar|overview|utilis|perform|done|doing|record|works|flag|risk|scorecard|profile|constituenc/.test(
      q,
    ) || q.split(/\s+/).length <= 6;
  if (!wantsMp) return null;
  const m = data.mps.find((x) => x.name === name);
  return m ? mpReply(m) : null;
};

const stateLookup: Matcher = (q, data) => {
  const name = matchName(q, data.knownStates);
  if (!name) return null;
  if (
    !/how many|works|summar|breakdown|overview|risk|utilis|flag|about|tell|show|profile|doing/.test(q)
  ) {
    return null;
  }
  // don't shadow the "lowest/highest utilisation" ranking questions
  if (/(low|lowest|worst|high|highest|best|top|bottom).*(utilis|fund)/.test(q)) return null;
  const s = data.states.find((x) => x.state === name);
  return s ? stateReply(s) : null;
};

const districtLookup: Matcher = (q, data) => {
  const name = matchName(q, data.knownDistricts);
  if (!name || !/how many|works|in |list|show|risk|flag/.test(q)) return null;
  const inDistrict = data.works.filter((w) => w.district === name);
  if (inDistrict.length === 0) return null;
  const risk = { HIGH: 0, MEDIUM: 0, LOW: 0, UNKNOWN: 0 };
  for (const w of inDistrict) risk[w.riskLevel] += 1;
  return {
    text: `${name}: ${nf(inDistrict.length)} works in view. Risk split — ${riskLine(risk)}.`,
    link: { label: 'Open the project register', to: '/projects' },
  };
};

const categoryLookup: Matcher = (q, data) => {
  const name = matchName(q, data.knownCategories);
  if (!name || !/how many|works|category|sector|summar|risk|flag|in /.test(q)) return null;
  const c = data.categories.find((x) => x.category === name);
  if (!c) return null;
  return {
    text: `${c.category}: ${nf(c.works)} works. Risk split — ${riskLine(c.risk)}. ${nf(
      c.flagged,
    )} flagged for review.`,
    link: { label: 'Open the project register', to: '/projects' },
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
  return { text: `Highest estimated cost: ${list}.`, link: { label: 'Open the project register', to: '/projects' } };
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
    link: { label: 'Open the project register', to: '/projects' },
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
    text: `${nf(data.totalWorks)} works are loaded in total. Risk split — ${riskLine(data.riskCounts)}. Name a state, district or category to narrow it down.`,
    link: { label: 'Open the project register', to: '/projects' },
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
    link: { label: 'Open Analytics', to: '/analytics' },
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
    link: { label: 'Open Analytics', to: '/analytics' },
  };
};

const commonFactors: Matcher = (q, data) => {
  if (!/most common (risk )?factor|top .*(risk )?factor|which factors?.*(common|most|frequent)|main .*(risk )?driver|biggest .*(risk )?factor/.test(q)) {
    return null;
  }
  if (data.topFactors.length === 0) return { text: 'No risk factors are flagged across the loaded works.' };
  const list = data.topFactors.slice(0, 3).map((f) => `${f.label} (${nf(f.count)})`).join(', ');
  return {
    text: `Most frequently flagged risk factors, by number of works: ${list}. Indicators for review, not confirmed findings.`,
    link: { label: 'See the risk factors', to: '/risk' },
  };
};

const flaggedCount: Matcher = (q, data) => {
  if (!/how many.*(flag|high[- ]?risk|risk|alert)|number of .*(flagged|high[- ]?risk|risk)|count of .*(risk|flag)/.test(q)) {
    return null;
  }
  const c = data.riskCounts;
  return {
    text: `${nf(data.flaggedWorks)} works are flagged for review (HIGH or MEDIUM): ${nf(c.HIGH)} HIGH and ${nf(
      c.MEDIUM,
    )} MEDIUM. ${nf(c.LOW)} are LOW risk and ${nf(c.UNKNOWN)} could not be assessed, out of ${nf(
      data.totalWorks,
    )} works.`,
    link: { label: 'Open the risk queue', to: '/risk' },
  };
};

const showFlaggedWorks: Matcher = (q, data) => {
  if (!/(show|list|which|find|see).*(high[- ]?risk|flagged|risky?).*works?|works?.*(that are )?(high[- ]?risk|flagged)/.test(q)) {
    return null;
  }
  const state = matchName(q, data.knownStates);
  const to = state ? `/risk?state=${encodeURIComponent(state)}` : '/risk';
  return {
    text: `${nf(data.riskCounts.HIGH)} works are HIGH risk and ${nf(data.riskCounts.MEDIUM)} are MEDIUM across the loaded data${
      state ? `; open the risk queue filtered to ${state}` : ''
    }.`,
    link: { label: state ? `HIGH & MEDIUM works in ${state}` : 'Open the risk queue', to },
  };
};

const factorDefinition: Matcher = (q) => {
  if (!/(what|which) (is|are|does|do)|mean|means|explain|define|tell me about/.test(q)) return null;
  for (const f of FACTOR_GUIDE) {
    if (f.keywords.test(q)) {
      return {
        text: `${f.name}: ${f.text} One of the six factors the risk model checks for every work.`,
        link: { label: 'See works with this factor', to: '/risk' },
      };
    }
  }
  return null;
};

const greeting: Matcher = (q) => {
  if (!/^(hi|hello|hey|namaste|help|what can you (do|answer)|who are you)\b/.test(q)) return null;
  return { text: FALLBACK.text };
};

const MATCHERS: Matcher[] = [
  methodology,
  workLookup,
  mostFlaggedMp,
  mpLookup,
  stateLookup,
  districtLookup,
  categoryLookup,
  mostExpensive,
  worksOverAmount,
  overallUtilisation,
  rankUtilisation,
  commonFactors,
  flaggedCount,
  showFlaggedWorks,
  worksInPlace,
  factorDefinition,
  greeting,
];

/** Route a question to a grounded, templated answer. Never free-generates. */
export function answerQuestion(raw: string, data: AssistantData): AssistantReply {
  const q = raw.toLowerCase().trim();
  if (!q) return FALLBACK;
  for (const matcher of MATCHERS) {
    const reply = matcher(q, data);
    if (reply) return reply;
  }
  return FALLBACK;
}

export const STARTER_PROMPTS = [
  'How is the risk score computed?',
  'Which MP has the most flagged works?',
  'How many works are in Maharashtra?',
  'What are the most expensive works?',
  'Which states have the lowest fund utilisation?',
  'What does "dormant, no payments" mean?',
];
