import { useEffect, useId, useRef, useState } from 'react';

import { UploadIcon } from './icons';

export interface PhotoUploadFieldProps {
  label: string;
  hint?: string;
  file: File | null;
  onChange: (file: File | null) => void;
}

/** Sane cap for a preview held in browser memory (not uploaded anywhere yet). */
const MAX_BYTES = 5 * 1024 * 1024;

/**
 * A labelled optional photo attachment — a dashed dropzone trigger plus a
 * small preview and a way to remove it. Presentation only: the caller decides
 * what happens to the file (see `src/data/localPhotos.ts` — there is no real
 * upload yet).
 */
export function PhotoUploadField({ label, hint, file, onChange }: PhotoUploadFieldProps) {
  const id = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!file) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  function handleFiles(fileList: FileList | null) {
    const picked = fileList?.[0] ?? null;
    setError(null);
    if (!picked) {
      onChange(null);
      return;
    }
    if (!picked.type.startsWith('image/')) {
      setError('Choose an image file.');
      return;
    }
    if (picked.size > MAX_BYTES) {
      setError('Image is too large (max 5 MB).');
      return;
    }
    onChange(picked);
  }

  return (
    <div className="ui-field">
      <label className="ui-field__label" htmlFor={id}>
        {label}
      </label>
      <div
        className="ui-photo-dropzone"
        role="button"
        tabIndex={0}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            inputRef.current?.click();
          }
        }}
      >
        <UploadIcon />
        <span>{file ? file.name : 'Select an image (max 5 MB)'}</span>
      </div>
      <input
        id={id}
        ref={inputRef}
        // Remounts when cleared, so re-picking the same file still fires onChange.
        key={file ? `${file.name}-${file.lastModified}` : 'empty'}
        type="file"
        accept="image/*"
        className="visually-hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />
      {hint ? <span className="ui-field__hint">{hint}</span> : null}
      {error ? (
        <span className="ui-field__error" role="alert">
          {error}
        </span>
      ) : null}
      {previewUrl ? (
        <div className="ui-photo-preview">
          <img src={previewUrl} alt="Selected preview" />
          <button
            type="button"
            className="ui-photo-preview__remove"
            onClick={() => onChange(null)}
          >
            Remove photo
          </button>
        </div>
      ) : null}
    </div>
  );
}
