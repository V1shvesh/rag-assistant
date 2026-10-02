import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { askQuestion, AskRequestError, pingHealth } from '../lib/api';
import type { AskResponse } from '../types';
import { AnswerCard } from './AnswerCard';

const WAKING_UP_MESSAGE_DELAY_MS = 5_000;

export function AskView({ session }: { session: Session }) {
  const [question, setQuestion] = useState('');
  const [result, setResult] = useState<AskResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [wakingUp, setWakingUp] = useState(false);
  const wakingUpTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Fire a cheap health-check request on mount so a cold Render instance
  // starts spinning up while the user is still reading/typing, instead
  // of only starting once they submit a question.
  useEffect(() => {
    void pingHealth();
  }, []);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setResult(null);
    setLoading(true);
    setWakingUp(false);

    wakingUpTimer.current = setTimeout(() => {
      setWakingUp(true);
    }, WAKING_UP_MESSAGE_DELAY_MS);

    try {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token) {
        setError('Your session expired. Please sign in again.');
        await supabase.auth.signOut();
        return;
      }

      const response = await askQuestion(question, token);
      setResult(response);
    } catch (err) {
      if (err instanceof AskRequestError) {
        setError(err.message);
        if (err.kind === 'unauthorized') {
          await supabase.auth.signOut();
        }
      } else {
        setError('Something went wrong answering that question.');
      }
    } finally {
      if (wakingUpTimer.current) {
        clearTimeout(wakingUpTimer.current);
      }
      setLoading(false);
      setWakingUp(false);
    }
  }

  return (
    <div className="ask-view">
      <header>
        <h1>RAG Assistant</h1>
        <button
          type="button"
          className="link-button"
          onClick={() => void supabase.auth.signOut()}
        >
          Sign out
        </button>
      </header>
      <p className="subtitle">Signed in as {session.user.email}</p>

      <form onSubmit={(event) => void handleSubmit(event)}>
        <label>
          Ask a question about the book
          <textarea
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            required
            minLength={1}
            rows={3}
          />
        </label>
        <button type="submit" disabled={loading}>
          {loading ? 'Thinking...' : 'Ask'}
        </button>
      </form>

      {loading && wakingUp && (
        <p className="info-text">
          The backend may be waking up -- this can take up to a minute on the
          free tier.
        </p>
      )}

      {error && <p className="error-text">{error}</p>}

      {result && <AnswerCard result={result} />}
    </div>
  );
}
