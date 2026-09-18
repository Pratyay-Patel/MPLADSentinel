import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

import { CloseIcon } from './icons';

/**
 * A small clickable thumbnail for a table cell, or an em dash when there's
 * none. Clicking opens a full-size preview in an on-page lightbox rather than
 * a new tab — Chrome refuses to navigate a top-level tab to a `data:` URL
 * (which is what these photos are, being held only in browser memory; see
 * `src/data/localPhotos.ts`), so `<a href target="_blank">` silently opens a
 * blank tab instead of the image.
 *
 * The lightbox is rendered via a portal straight to `document.body`, not
 * inline where this component sits in the table. `.ui-card:hover` (every
 * table here lives inside a Card) applies a CSS `transform`, and a
 * `transform` on any ancestor becomes the containing block for a descendant
 * `position: fixed` element — so an inline overlay would size/position
 * itself against the (possibly still-animating) Card instead of the
 * viewport whenever the cursor was hovering it, which is exactly the
 * intermittent flicker/slowness this was reported as.
 */
export function PhotoCell({ url }: { url: string | null }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  if (!url) {
    return <span className="text-muted">—</span>;
  }

  return (
    <>
      <button
        type="button"
        className="ui-photo-cell"
        onClick={() => setOpen(true)}
        aria-label="View uploaded site photo"
      >
        <img src={url} alt="Uploaded site photo" decoding="async" />
      </button>
      {open
        ? createPortal(
            <div
              className="ui-lightbox-overlay"
              role="presentation"
              onClick={() => setOpen(false)}
            >
              <div
                className="ui-lightbox"
                role="dialog"
                aria-modal="true"
                aria-label="Uploaded site photo"
                onClick={(event) => event.stopPropagation()}
              >
                <button
                  type="button"
                  className="ui-lightbox__close"
                  onClick={() => setOpen(false)}
                  aria-label="Close"
                >
                  <CloseIcon />
                </button>
                <img src={url} alt="Uploaded site photo" decoding="async" />
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
