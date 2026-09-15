import { Button } from './Button';
import { SendIcon } from './icons';

export interface SendNoticeButtonProps {
  sending: boolean;
  /** Already sent this session — stays disabled so it can't be re-sent by accident. */
  sent: boolean;
  onClick: () => void;
}

/**
 * "Send Notice" action for a high-risk / attention-needing project. Purely
 * presentational — the caller owns the actual API call and any toast.
 */
export function SendNoticeButton({ sending, sent, onClick }: SendNoticeButtonProps) {
  return (
    <Button
      type="button"
      variant="secondary"
      size="sm"
      icon={<SendIcon />}
      disabled={sending || sent}
      onClick={onClick}
    >
      {sent ? 'Notice sent' : sending ? 'Sending…' : 'Send Notice'}
    </Button>
  );
}
