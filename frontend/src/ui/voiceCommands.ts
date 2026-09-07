import { STATE_COORDS } from './indiaGeo';

/**
 * Tiny keyword router for the voice / typed command bar. Pure and synchronous —
 * no speech APIs here, so it is easy to unit-test.
 */

export type CommandRisk = 'HIGH' | 'MEDIUM' | 'LOW';

export interface CommandResult {
  /** Where to navigate (a router path with optional query), or undefined. */
  to?: string;
  /** Canonical state name the command referred to, if any. */
  state?: string;
  /** Risk level the command referred to, if any. */
  risk?: CommandRisk;
  /** Four-digit year the command referred to, if any. */
  year?: string;
  /** True when at least one intent (page, state, risk, or year) was recognised. */
  understood: boolean;
  /** Short confirmation to speak / show. */
  reply: string;
}

/**
 * Which URL filters each screen reads. `state` / `year` are the app-wide global
 * filter bar (`FilterProvider`); `level` is the local risk-level filter on
 * `/risk` and `/projects`. Screens not listed take no filters from a command.
 */
const PAGE_FILTERS: Record<string, { state?: true; level?: true; year?: true }> = {
  '/risk': { state: true, level: true, year: true },
  '/projects': { state: true, level: true, year: true },
  '/dashboard': { state: true, year: true },
};

const PAGE_NAME: Record<string, string> = {
  '/risk': 'risk and alerts',
  '/projects': 'the project register',
  '/dashboard': 'the dashboard',
  '/analytics': 'analytics',
  '/assistant': 'the assistant',
  '/compare': 'compare MPs',
  '/grievances': 'grievances',
  '/audit': 'the audit view',
  '/citizen': 'the citizen portal',
};

/** Canonical state names, longest first so "andhra pradesh" beats "andhra". */
const STATE_NAMES: string[] = [
  ...new Set(Object.values(STATE_COORDS).map((coord) => coord.name)),
].sort((a, b) => b.length - a.length);

function findState(text: string): string | undefined {
  return STATE_NAMES.find((name) => text.includes(name.toLowerCase()));
}

function findRisk(text: string): CommandRisk | undefined {
  if (/\bhigh(?:\s|-)?risk\b|\bhigh\b/.test(text)) return 'HIGH';
  if (/\bmedium(?:\s|-)?risk\b|\bmedium\b/.test(text)) return 'MEDIUM';
  if (/\blow(?:\s|-)?risk\b|\blow\b/.test(text)) return 'LOW';
  return undefined;
}

function findYear(text: string): string | undefined {
  return text.match(/\b(20\d{2})\b/)?.[1];
}

export function parseCommand(input: string): CommandResult {
  const text = input.trim().toLowerCase();
  if (!text) {
    return { understood: false, reply: "I didn't catch that — try again." };
  }

  const state = findState(text);
  const risk = findRisk(text);
  const year = findYear(text);

  // Explicit page intent
  let page: string | undefined;
  if (/\bgrievance/.test(text)) page = '/grievances';
  else if (/\baudit\b|verification/.test(text)) page = '/audit';
  else if (/\bcitizen\b|public portal/.test(text)) page = '/citizen';
  else if (/\bassistant\b|chatbot|ask (the )?assistant/.test(text)) page = '/assistant';
  else if (/\banalytic|utilis|fund utilisation/.test(text)) page = '/analytics';
  else if (/\bcompare\b|compare mps?/.test(text)) page = '/compare';
  else if (/\bproject|\bregister\b|works list|all works/.test(text)) page = '/projects';
  else if (/\brisk\b|\balert|anomal|flag/.test(text)) page = '/risk';
  else if (/overview|dashboard|home|summary/.test(text)) page = '/dashboard';

  // "show high risk in Maharashtra" with no page word → the risk screen
  if (!page && (state || risk || year)) page = '/risk';

  if (!page) {
    return { understood: false, reply: `I couldn't map "${input.trim()}" to a screen.` };
  }

  // Build the target, adding the filters this screen actually reads from the URL.
  const caps = PAGE_FILTERS[page];
  let to = page;
  if (caps) {
    const params = new URLSearchParams();
    if (caps.level && risk) params.set('level', risk);
    if (caps.state && state) params.set('state', state);
    if (caps.year && year) params.set('year', year);
    const qs = params.toString();
    if (qs) to = `${page}?${qs}`;
  }

  const bits: string[] = [];
  if (risk && caps?.level) bits.push(`${risk.toLowerCase()} risk`);
  if (state && caps?.state) bits.push(`in ${state}`);
  if (year && caps?.year) bits.push(`for ${year}`);
  const target = `${PAGE_NAME[page] ?? 'the dashboard'}${bits.length ? ` — ${bits.join(' ')}` : ''}`;

  return { to, state, risk, year, understood: true, reply: `Opening ${target}.` };
}
