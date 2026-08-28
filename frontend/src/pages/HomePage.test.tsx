import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { HomePage } from './HomePage';

vi.mock('../api/health', () => ({
  getHealth: vi.fn().mockResolvedValue({
    status: 'UP',
    service: 'mpladsentinel-backend',
    timestamp: '2026-01-01T00:00:00Z',
  }),
}));

describe('HomePage', () => {
  it('renders the app title and reports backend connectivity', async () => {
    render(<HomePage />);

    expect(screen.getByRole('heading', { level: 1, name: 'MPLADSentinel' })).toBeInTheDocument();
    expect(
      await screen.findByText('Connected to backend service: mpladsentinel-backend'),
    ).toBeInTheDocument();
  });
});
