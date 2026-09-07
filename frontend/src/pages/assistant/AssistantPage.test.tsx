import { fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

import { DataProviderProvider, type DataProvider } from '../../data';
import { createDemoDataProvider } from '../../data/demo/DemoDataProvider';
import { ProviderError } from '../../data/errors';
import { AssistantPage } from './AssistantPage';

function renderAssistant(provider: DataProvider = createDemoDataProvider()) {
  return render(
    <MemoryRouter>
      <DataProviderProvider provider={provider}>
        <AssistantPage />
      </DataProviderProvider>
    </MemoryRouter>,
  );
}

describe('AssistantPage', () => {
  it('shows a grounded welcome message and starter prompts', async () => {
    renderAssistant();

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Assistant' }),
    ).toBeInTheDocument();
    const log = screen.getByRole('log');
    expect(within(log).getByText(/indicators for review, not proof of wrongdoing/i)).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'How is the risk score computed?' }),
    ).toBeInTheDocument();
  });

  it('answers a starter prompt with a grounded reply and a deep link', async () => {
    renderAssistant();

    const prompt = await screen.findByRole('button', { name: 'How is the risk score computed?' });
    fireEvent.click(prompt);

    const log = screen.getByRole('log');
    expect(within(log).getByText(/weighted statistical model/i)).toBeInTheDocument();
    expect(within(log).getByRole('link', { name: /Open the risk queue/i })).toHaveAttribute(
      'href',
      '/risk',
    );
  });

  it('answers a typed question', async () => {
    renderAssistant();
    const input = await screen.findByLabelText('Your question');
    fireEvent.change(input, { target: { value: 'how many works are flagged?' } });
    fireEvent.click(screen.getByRole('button', { name: 'Ask' }));

    expect(screen.getByRole('log')).toHaveTextContent(/works are flagged for review/i);
  });

  it('shows an error state with retry when the load fails', async () => {
    const provider: DataProvider = {
      ...createDemoDataProvider(),
      listProjects: vi.fn().mockRejectedValue(new ProviderError('unavailable', 'backend down')),
    };
    renderAssistant(provider);
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('backend down');
    expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument();
  });
});
