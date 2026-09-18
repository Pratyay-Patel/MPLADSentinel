import { fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

import { DataProviderProvider, type DataProvider } from '../../data';
import { createDemoDataProvider } from '../../data/demo/DemoDataProvider';
import { ProviderError } from '../../data/errors';
import { CitizenAssistant } from './CitizenAssistant';

function renderAssistant(provider: DataProvider = createDemoDataProvider()) {
  return render(
    <MemoryRouter>
      <DataProviderProvider provider={provider}>
        <CitizenAssistant />
      </DataProviderProvider>
    </MemoryRouter>,
  );
}

describe('CitizenAssistant', () => {
  it('shows a grounded welcome message and starter prompts, with no risk content anywhere', async () => {
    renderAssistant();

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Assistant' }),
    ).toBeInTheDocument();
    const log = screen.getByRole('log');
    expect(within(log).getByText(/no risk assessment is included here/i)).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'What are the most expensive works?' }),
    ).toBeInTheDocument();

    // the authority page's risk-specific starter prompt must not exist here
    expect(
      screen.queryByRole('button', { name: 'How is the risk score computed?' }),
    ).not.toBeInTheDocument();
    expect(screen.queryByText(/RISK/)).not.toBeInTheDocument();
  });

  it('answers a starter prompt with a grounded reply and a citizen-safe deep link', async () => {
    renderAssistant();

    const prompt = await screen.findByRole('button', { name: 'What are the most expensive works?' });
    fireEvent.click(prompt);

    const log = screen.getByRole('log');
    expect(within(log).getByText(/Highest estimated cost/i)).toBeInTheDocument();
    expect(within(log).getByRole('link', { name: /Open the Citizen Portal/i })).toHaveAttribute(
      'href',
      '/citizen',
    );
  });

  it('answers a typed question with no risk terms in the reply', async () => {
    renderAssistant();
    const input = await screen.findByLabelText('Your question');
    fireEvent.change(input, { target: { value: 'how many works are in Kerala?' } });
    fireEvent.click(screen.getByRole('button', { name: 'Ask' }));

    const log = screen.getByRole('log');
    expect(log).toHaveTextContent(/works in view/i);
    expect(within(log).queryByText(/RISK/)).not.toBeInTheDocument();
  });

  it('shows an error state with retry when the load fails', async () => {
    const provider: DataProvider = {
      ...createDemoDataProvider(),
      listPublicProjects: vi.fn().mockRejectedValue(new ProviderError('unavailable', 'backend down')),
    };
    renderAssistant(provider);
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('backend down');
    expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument();
  });
});
