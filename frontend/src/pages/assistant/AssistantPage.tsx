import { useRef, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';

import { useAssistantService, useAsyncData, type AssistantData } from '../../data';
import { Card, EmptyState, ErrorState, LoadingState, PageHeader, SectionHeader } from '../../ui';
import { ChatIcon } from '../../ui/icons';
import { answerQuestion, STARTER_PROMPTS, type AssistantReply } from './answer';
import './assistant.css';

interface ChatMessage {
  id: number;
  role: 'user' | 'assistant';
  text: string;
  link?: AssistantReply['link'];
}

const WELCOME: ChatMessage = {
  id: 0,
  role: 'assistant',
  text: 'Ask me about how the risk score works, what a risk factor means, or fund utilisation by state. Answers are built from this portal’s loaded data and a fixed methodology guide — risk scores are indicators for review, not proof of wrongdoing.',
};

/**
 * Assistant (`/assistant`) — a grounded Q&A helper. Every answer is produced by
 * `answerQuestion` (intent match + templated text over `AssistantData` and the
 * fixed methodology guide). No LLM call, no free-generated figures. Distinct from
 * the voice command bar, which only navigates.
 */
export function AssistantPage() {
  const service = useAssistantService();
  const [reloadKey, setReloadKey] = useState(0);

  const state = useAsyncData<AssistantData>((signal) => service.load(signal), [service, reloadKey], {
    isEmpty: (data) => data.totalWorks === 0,
  });

  return (
    <div className="ui-stack">
      <PageHeader
        breadcrumbs={[{ label: 'Home', to: '/' }, { label: 'Assistant' }]}
        title="Assistant"
        description="Ask about utilisation, risk factors and the scoring method. Answers are grounded in the portal’s own data — indicators for review, not proof of wrongdoing."
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
            description="The data provider returned no MPLADS work records."
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

function Chat({ data }: { data: AssistantData }) {
  const [messages, setMessages] = useState<ChatMessage[]>([WELCOME]);
  const [draft, setDraft] = useState('');
  const nextId = useRef(1);
  const logRef = useRef<HTMLDivElement>(null);

  const ask = (question: string) => {
    const text = question.trim();
    if (!text) return;
    const reply = answerQuestion(text, data);
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
        description="Grounded answers from the loaded data and the methodology guide. It does not make claims about individual works being fraudulent."
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
        {STARTER_PROMPTS.map((p) => (
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
