import { describe, expect, it } from 'vitest';

import { parseCommand } from './voiceCommands';

describe('parseCommand', () => {
  it('routes explicit page words', () => {
    expect(parseCommand('open grievances').to).toBe('/grievances');
    expect(parseCommand('go to the projects register').to).toBe('/projects');
    expect(parseCommand('show me the audit timeline').to).toBe('/audit');
    expect(parseCommand('back to the dashboard').to).toBe('/dashboard');
  });

  it('builds a filtered risk URL from risk level + state', () => {
    const result = parseCommand('show high risk works in Maharashtra');
    expect(result.understood).toBe(true);
    expect(result.to).toBe('/risk?level=HIGH&state=Maharashtra');
    expect(result.risk).toBe('HIGH');
    expect(result.state).toBe('Maharashtra');
  });

  it('defaults a bare "high risk" to the risk screen', () => {
    expect(parseCommand('high risk').to).toBe('/risk?level=HIGH');
  });

  it('matches multi-word state names', () => {
    expect(parseCommand('works in uttar pradesh').to).toBe('/risk?state=Uttar Pradesh');
  });

  it('reports when nothing is understood', () => {
    const result = parseCommand('what is the weather today');
    expect(result.understood).toBe(false);
    expect(result.to).toBeUndefined();
  });

  it('handles empty input', () => {
    expect(parseCommand('   ').understood).toBe(false);
  });
});
