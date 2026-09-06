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
  /** True when at least one intent (page, state, or risk) was recognised. */
  understood: boolean;
  /** Short confirmation to speak / show. */
  reply: string;
}

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

export function parseCommand(input: string): CommandResult {
  const text = input.trim().toLowerCase();
  if (!text) {
    return { understood: false, reply: "I didn't catch that — try again." };
  }

  const state = findState(text);
  const risk = findRisk(text);

  // Explicit page intent
  let page: string | undefined;
  if (/\bgrievance/.test(text)) page = '/grievances';
  else if (/\baudit\b|verification/.test(text)) page = '/audit';
  else if (/\bcitizen\b|public portal/.test(text)) page = '/citizen';
  else if (/\bproject|\bregister\b|works list|all works/.test(text)) page = '/projects';
  else if (/\brisk\b|\balert|anomal|flag/.test(text)) page = '/risk';
  else if (/overview|dashboard|home|summary/.test(text)) page = '/dashboard';

  // "show high risk in Maharashtra" with no page word → the risk screen
  if (!page && (state || risk)) page = '/risk';

  if (!page && !state && !risk) {
    return { understood: false, reply: `I couldn't map "${input.trim()}" to a screen.` };
  }

  // Build the target with filters for the risk screen
  let to = page;
  if (page === '/risk') {
    const params = new URLSearchParams();
    if (risk) params.set('level', risk);
    if (state) params.set('state', state);
    const qs = params.toString();
    to = qs ? `/risk?${qs}` : '/risk';
  }

  const bits: string[] = [];
  if (risk) bits.push(`${risk.toLowerCase()} risk`);
  if (state) bits.push(`in ${state}`);
  const target =
    page === '/risk'
      ? `risk and alerts${bits.length ? ` — ${bits.join(' ')}` : ''}`
      : (page ?? '').replace('/', '') || 'the dashboard';

  return { to, state, risk, understood: true, reply: `Opening ${target}.` };
}
