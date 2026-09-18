import { useRef, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';

import { useAsyncData, useCitizenAssistantService, type CitizenAssistantData } from '../../data';
import { Card, EmptyState, ErrorState, LoadingState, PageHeader, SectionHeader } from '../../ui';
import { ChatIcon } from '../../ui/icons';
import { answerCitizenQuestion, CITIZEN_STARTER_PROMPTS, type CitizenAssistantReply } from './citizenAnswer';
import '../assistant/assistant.css';

interface ChatMessage {
  id: number;
  role: 'user' | 'assistant';
  text: string;
  link?: CitizenAssistantReply['link'];
}

const WELCOME: ChatMessage = {
  id: 0,
  role: 'assistant',
  text: 'Ask me about a work, an MP, a state or district, or fund utilisation. Answers are built from this portal’s loaded public data — no risk assessment is included here, same as the rest of the Citizen Portal.',
};

/**
 * Citizen-safe Assistant (`/citizen/assistant`) — a grounded Q&A helper over
 * the same publicly releasable data as the rest of the Citizen Portal.
 *
 * Unlike the authority Assistant, there is no risk methodology explanation,
 * no factor definitions, no flagged-work counts and no risk score anywhere —
 * {@link CitizenAssistantData} carries no risk field to answer from. Every
 * answer comes from `answerCitizenQuestion` (intent match + templated text),
 * never a free-generated figure.
 */
export function CitizenAssistant() {
  const service = useCitizenAssistantService();
  const [reloadKey, setReloadKey] = useState(0);

  const state = useAsyncData<CitizenAssistantData>(
    (signal) => service.load(signal),
    [service, reloadKey],
    { isEmpty: (data) => data.totalWorks === 0 },
  );

  return (
    <div className="ui-stack">
      <PageHeader
        breadcrumbs={[{ label: 'Home', to: '/' }, { label: 'Assistant' }]}
        title="Assistant"
        description="Ask about works, MPs, states and fund utilisation. Answers are grounded in the same publicly releasable data as the rest of the Citizen Portal."
      />

      {state.status === 'loading' && (
        <Card>
          <LoadingState label="Preparing the assistant" />
        </Card>
      )}

      {state.status === 'empty' && (
        <Card>
          <EmptyState
            title="No data to answer from"
            description="No public MPLADS work records are available."
          />
        </Card>
      )}

      {state.status === 'error' && (
        <Card>
          <ErrorState
            title="Could not load the assistant"
            description={state.error.message}
            onRetry={() => setReloadKey((key) => key + 1)}
          />
        </Card>
      )}

      {state.status === 'success' && <Chat data={state.data} />}
    </div>
  );
}

function Chat({ data }: { data: CitizenAssistantData }) {
  const [messages, setMessages] = useState<ChatMessage[]>([WELCOME]);
  const [draft, setDraft] = useState('');
  const nextId = useRef(1);
  const logRef = useRef<HTMLDivElement>(null);

  const ask = (question: string) => {
    const text = question.trim();
    if (!text) return;
    const reply = answerCitizenQuestion(text, data);
    setMessages((prev) => [
      ...prev,
      { id: nextId.current++, role: 'user', text },
      { id: nextId.current++, role: 'assistant', text: reply.text, link: reply.link },
    ]);
    setDraft('');
    requestAnimationFrame(() => {
      logRef.current?.scrollTo({ top: logRef.current.scrollHeight });
    });
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    ask(draft);
  };

  return (
    <Card>
      <SectionHeader
        title="Ask the assistant"
        description="Grounded answers from the loaded public data. No risk assessment or investigation data is included here."
        icon={<ChatIcon />}
        tone="info"
      />

      <div className="asst-log" ref={logRef} role="log" aria-live="polite">
        {messages.map((m) => (
          <div key={m.id} className={`asst-msg asst-msg--${m.role}`}>
            <p className="asst-msg__text">{m.text}</p>
            {m.link && (
              <Link className="asst-msg__link" to={m.link.to}>
                {m.link.label} <span aria-hidden>→</span>
              </Link>
            )}
          </div>
        ))}
      </div>

      <ul className="asst-prompts" aria-label="Suggested questions">
        {CITIZEN_STARTER_PROMPTS.map((p) => (
          <li key={p}>
            <button type="button" className="asst-prompt" onClick={() => ask(p)}>
              {p}
            </button>
          </li>
        ))}
      </ul>

      <form className="asst-form" onSubmit={onSubmit}>
        <label className="visually-hidden" htmlFor="asst-input">
          Your question
        </label>
        <input
          id="asst-input"
          className="ui-control asst-input"
          type="text"
          placeholder="Ask a question…"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          autoComplete="off"
        />
        <button type="submit" className="ui-btn ui-btn--primary ui-btn--sm" disabled={!draft.trim()}>
          Ask
        </button>
      </form>
    </Card>
  );
}
