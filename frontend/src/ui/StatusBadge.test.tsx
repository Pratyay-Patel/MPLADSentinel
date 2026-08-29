import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { StatusBadge, type StatusTone } from './StatusBadge';

const TONES: StatusTone[] = ['normal', 'success', 'warning', 'danger', 'info', 'neutral'];

describe('StatusBadge', () => {
  it.each(TONES)(
    'renders the "%s" tone with a visible label and a non-colour indicator',
    (tone) => {
      const { container } = render(<StatusBadge tone={tone}>Label {tone}</StatusBadge>);
      const el = container.querySelector('.ui-status');

      expect(el).not.toBeNull();
      // colour is not the only signal: an explicit data-status + a shape glyph
      expect(el).toHaveAttribute('data-status', tone);
      expect(el?.querySelector('.ui-status__glyph')).not.toBeNull();
      // the state is also in the accessible text
      expect(el).toHaveTextContent(`Status: Label ${tone}`);
    },
  );

  it('supports a custom screen-reader label', () => {
    const { container } = render(
      <StatusBadge tone="danger" srLabel="Risk level">
        High
      </StatusBadge>,
    );
    expect(container.querySelector('.ui-status')).toHaveTextContent('Risk level: High');
  });
});
