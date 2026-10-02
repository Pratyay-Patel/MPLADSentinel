import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { PhotoCell } from './PhotoCell';

describe('PhotoCell', () => {
  it('shows an em dash when there is no photo', () => {
    render(<PhotoCell url={null} />);
    expect(screen.getByText('—')).toBeInTheDocument();
  });

  it('shows a clickable thumbnail when there is a photo', () => {
    render(<PhotoCell url="data:image/png;base64,AAA" />);
    expect(screen.getByRole('button', { name: 'View uploaded site photo' })).toBeInTheDocument();
  });

  it('opens the lightbox outside any transformed ancestor, via a portal to document.body', () => {
    // `.ui-card:hover` (every table here sits inside a Card) applies a CSS
    // `transform`, and a `transform` on an ancestor becomes the containing
    // block for a descendant `position: fixed` element — an inline overlay
    // would size/position itself against this wrapper instead of the
    // viewport. `transform` here stands in for that real `:hover` CSS state.
    const { container } = render(
      <div style={{ transform: 'translateY(0)' }} data-testid="transformed-ancestor">
        <PhotoCell url="data:image/png;base64,AAA" />
      </div>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'View uploaded site photo' }));

    const overlay = screen.getByRole('dialog', { name: 'Uploaded site photo' });
    const transformedAncestor = container.querySelector('[data-testid="transformed-ancestor"]');
    expect(transformedAncestor?.contains(overlay)).toBe(false);
    expect(document.body.contains(overlay)).toBe(true);
  });

  it('closes on Escape and on clicking the close button', () => {
    render(<PhotoCell url="data:image/png;base64,AAA" />);
    fireEvent.click(screen.getByRole('button', { name: 'View uploaded site photo' }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'View uploaded site photo' }));
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
