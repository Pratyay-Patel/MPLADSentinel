import { useEffect, useState } from 'react';

import { Button } from './Button';
import { Input } from './Input';
import { Textarea } from './Textarea';

export interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description?: string;
  /** The exact word the user must type to enable the confirm button (case-insensitive). */
  confirmWord: string;
  justificationLabel?: string;
  confirmLabel?: string;
  tone?: 'danger' | 'success';
  onCancel: () => void;
  /** Called with the trimmed justification text once the user confirms. */
  onConfirm: (justification: string) => void;
}

/**
 * A GitHub-delete-repo-style confirmation gate: the action only proceeds once
 * the user types an exact confirmation word and provides a written reason.
 * Presentation only — the caller decides what "confirm" actually does.
 */
export function ConfirmDialog({
  open,
  title,
  description,
  confirmWord,
  justificationLabel = 'Reason / justification',
  confirmLabel = 'Confirm',
  tone = 'danger',
  onCancel,
  onConfirm,
}: ConfirmDialogProps) {
  const [typed, setTyped] = useState('');
  const [justification, setJustification] = useState('');

  useEffect(() => {
    if (open) {
      setTyped('');
      setJustification('');
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onCancel();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onCancel]);

  if (!open) return null;

  const canConfirm =
    typed.trim().toUpperCase() === confirmWord.toUpperCase() && justification.trim().length > 0;

  return (
    <div className="ui-confirm-overlay" role="presentation" onClick={onCancel}>
      <div
        className="ui-confirm"
        role="dialog"
        aria-modal="true"
        aria-labelledby="ui-confirm-title"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id="ui-confirm-title" className="ui-confirm__title">
          {title}
        </h2>
        {description ? <p className="ui-confirm__desc">{description}</p> : null}

        <Textarea
          label={justificationLabel}
          value={justification}
          onChange={(event) => setJustification(event.target.value)}
          placeholder="Enter the official reason for this action…"
          rows={3}
        />

        <Input
          label={`Type ${confirmWord} to confirm`}
          value={typed}
          onChange={(event) => setTyped(event.target.value)}
          placeholder={confirmWord}
          autoComplete="off"
          autoFocus
        />

        <div className="ui-confirm__actions">
          <Button variant="secondary" onClick={onCancel}>
            Cancel
          </Button>
          <Button
            variant={tone === 'danger' ? 'danger' : 'primary'}
            disabled={!canConfirm}
            onClick={() => onConfirm(justification.trim())}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
