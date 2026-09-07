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

  it('applies state + risk filters to the project register when it is the target', () => {
    expect(parseCommand('open the projects register for Maharashtra').to).toBe(
      '/projects?state=Maharashtra',
    );
    expect(parseCommand('show high risk projects in Kerala').to).toBe(
      '/projects?level=HIGH&state=Kerala',
    );
  });

  it('applies a state filter to the dashboard (which has no risk-level filter)', () => {
    expect(parseCommand('dashboard for Bihar').to).toBe('/dashboard?state=Bihar');
    expect(parseCommand('show me the overview for Kerala').to).toBe('/dashboard?state=Kerala');
  });

  it('picks up a four-digit year', () => {
    expect(parseCommand('projects in Kerala in 2025').to).toBe('/projects?state=Kerala&year=2025');
  });

  it('routes the new intelligence screens', () => {
    expect(parseCommand('open analytics').to).toBe('/analytics');
    expect(parseCommand('ask the assistant').to).toBe('/assistant');
    expect(parseCommand('compare MPs').to).toBe('/compare');
  });

  it('defaults a bare "high risk" to the risk screen', () => {
    expect(parseCommand('high risk').to).toBe('/risk?level=HIGH');
  });

  it('matches multi-word state names (URL-encoded)', () => {
    expect(parseCommand('works in uttar pradesh').to).toBe('/risk?state=Uttar+Pradesh');
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
