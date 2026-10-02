import { useRef, useState } from 'react';

import { UploadIcon } from './icons';
import { PhotoCell } from './PhotoCell';

export interface EditablePhotoCellProps {
  url: string | null;
  /** Called with a validated image file; the caller stores it and re-renders. */
  onSelect: (file: File) => void;
}

/** Sane cap for a preview held in browser memory (not uploaded anywhere yet). */
const MAX_BYTES = 5 * 1024 * 1024;

/**
 * A table-cell photo that a citizen can attach or replace after the record
 * has already been submitted — the only thing about a grievance or work
 * recommendation that stays editable post-submission. Everything else on the
 * record is locked; this doesn't touch that data at all, it only calls
 * `onSelect` so the caller can stash the file (see `src/data/localPhotos.ts`).
 */
export function EditablePhotoCell({ url, onSelect }: EditablePhotoCellProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);

  function handleFiles(fileList: FileList | null) {
    const picked = fileList?.[0] ?? null;
    if (!picked) return;
    setError(null);
    if (!picked.type.startsWith('image/')) {
      setError('Choose an image file.');
      return;
    }
    if (picked.size > MAX_BYTES) {
      setError('Image is too large (max 5 MB).');
      return;
    }
    onSelect(picked);
  }

  return (
    <div className="ui-photo-cell-editable">
      {url ? <PhotoCell url={url} /> : <span className="text-muted">—</span>}
      <button
        type="button"
        className="ui-photo-cell-editable__trigger"
        onClick={() => inputRef.current?.click()}
      >
        <UploadIcon />
        {url ? 'Change' : 'Add photo'}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        aria-label={url ? 'Change photo' : 'Add photo'}
        className="visually-hidden"
        onChange={(e) => {
          handleFiles(e.target.files);
          e.target.value = '';
        }}
      />
      {error ? (
        <span className="ui-field__error" role="alert">
          {error}
        </span>
      ) : null}
    </div>
  );
}
