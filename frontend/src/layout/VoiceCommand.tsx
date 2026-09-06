import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';

import { parseCommand } from '../ui/voiceCommands';

/**
 * Voice / typed command bar. Uses the browser's built-in `SpeechRecognition`
 * (Chrome / Edge) — no API key, no backend. Where speech isn't available it
 * falls back to a text box. Commands are routed by {@link parseCommand}; the
 * confirmation is spoken with `speechSynthesis` when present.
 */

interface MinimalRecognition {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  maxAlternatives: number;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
}

interface SpeechRecognitionEventLike {
  results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }>;
}

type RecognitionCtor = new () => MinimalRecognition;

function getRecognitionCtor(): RecognitionCtor | null {
  const w = window as unknown as {
    SpeechRecognition?: RecognitionCtor;
    webkitSpeechRecognition?: RecognitionCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

const EXAMPLES = ['Show high risk works in Maharashtra', 'Open grievances', 'Go to projects'];

export function VoiceCommand() {
  const navigate = useNavigate();
  const wrapRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<MinimalRecognition | null>(null);

  const [open, setOpen] = useState(false);
  const [listening, setListening] = useState(false);
  const [heard, setHeard] = useState('');
  const [reply, setReply] = useState('');
  const [typed, setTyped] = useState('');

  const RecognitionCtor = useMemo(getRecognitionCtor, []);
  const speechSupported = RecognitionCtor != null;

  const speak = useCallback((text: string) => {
    try {
      const synth = window.speechSynthesis;
      if (!synth) return;
      synth.cancel();
      const utter = new SpeechSynthesisUtterance(text);
      utter.lang = 'en-IN';
      synth.speak(utter);
    } catch {
      // speech synthesis unavailable — the reply is shown as text anyway
    }
  }, []);

  const run = useCallback(
    (input: string) => {
      const result = parseCommand(input);
      setReply(result.reply);
      speak(result.reply);
      if (result.to) {
        setOpen(false);
        navigate(result.to);
      }
    },
    [navigate, speak],
  );

  const stopListening = useCallback(() => {
    recognitionRef.current?.abort();
    recognitionRef.current = null;
    setListening(false);
  }, []);

  const startListening = useCallback(() => {
    if (!RecognitionCtor) return;
    const recognition = new RecognitionCtor();
    recognition.lang = 'en-IN';
    recognition.interimResults = true;
    recognition.continuous = false;
    recognition.maxAlternatives = 1;

    recognition.onresult = (event) => {
      const last = event.results[event.results.length - 1];
      const transcript = last[0].transcript;
      setHeard(transcript);
      if (last.isFinal) {
        stopListening();
        run(transcript);
      }
    };
    recognition.onerror = (event) => {
      stopListening();
      setReply(
        event.error === 'not-allowed'
          ? 'Microphone permission is needed for voice commands.'
          : event.error === 'no-speech'
            ? "I didn't hear anything — try again."
            : 'Voice input failed. You can type instead.',
      );
    };
    recognition.onend = () => setListening(false);

    recognitionRef.current = recognition;
    setHeard('');
    setReply('');
    setListening(true);
    try {
      recognition.start();
    } catch {
      stopListening();
    }
  }, [RecognitionCtor, run, stopListening]);

  // Close + cleanup
  useEffect(() => {
    if (!open) {
      stopListening();
      return;
    }
    const onDown = (event: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open, stopListening]);

  useEffect(() => () => stopListening(), [stopListening]);

  const submitTyped = (event: FormEvent) => {
    event.preventDefault();
    if (typed.trim()) run(typed);
  };

  return (
    <div className="voice-cmd" ref={wrapRef}>
      <button
        type="button"
        className="voice-cmd__btn"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" fill="none">
          <rect x="9" y="3" width="6" height="12" rx="3" stroke="currentColor" strokeWidth="1.6" />
          <path
            d="M5 11a7 7 0 0 0 14 0M12 18v3"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
          />
        </svg>
        <span>Ask</span>
      </button>

      {open ? (
        <div className="voice-cmd__panel" role="dialog" aria-label="Command bar">
          {speechSupported ? (
            <button
              type="button"
              className="voice-cmd__mic"
              data-on={listening || undefined}
              onClick={listening ? stopListening : startListening}
            >
              <span className="voice-cmd__mic-dot" aria-hidden />
              {listening ? 'Listening… tap to stop' : 'Tap and speak'}
            </button>
          ) : (
            <form className="voice-cmd__form" onSubmit={submitTyped}>
              <input
                className="voice-cmd__input"
                placeholder="Type a command…"
                value={typed}
                onChange={(event) => setTyped(event.target.value)}
                aria-label="Command"
                autoFocus
              />
              <button type="submit" className="ui-btn ui-btn--primary ui-btn--sm">
                Go
              </button>
            </form>
          )}

          {heard ? <p className="voice-cmd__heard">“{heard}”</p> : null}
          {reply ? (
            <p className="voice-cmd__reply" role="status">
              {reply}
            </p>
          ) : null}

          <div className="voice-cmd__examples">
            <span className="voice-cmd__examples-label">Try:</span>
            {EXAMPLES.map((example) => (
              <button
                key={example}
                type="button"
                className="voice-cmd__chip"
                onClick={() => run(example)}
              >
                {example}
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
