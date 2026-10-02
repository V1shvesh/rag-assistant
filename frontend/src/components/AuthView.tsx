import { useState } from 'react';
import type { FormEvent } from 'react';
import { supabase } from '../lib/supabase';

type Mode = 'sign-in' | 'sign-up';

export function AuthView() {
  const [mode, setMode] = useState<Mode>('sign-in');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setInfo(null);
    setSubmitting(true);

    try {
      if (mode === 'sign-in') {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (signInError) {
          setError(signInError.message);
        }
      } else {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
        });
        if (signUpError) {
          setError(signUpError.message);
        } else if (!data.session) {
          // Email confirmation is enabled on this project: signUp
          // succeeds with no error but no session either.
          setInfo('Check your email to confirm your account, then sign in.');
        }
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="auth-view">
      <h1>RAG Assistant</h1>
      <p className="subtitle">Sign in to ask questions about the book.</p>
      <form onSubmit={(event) => void handleSubmit(event)}>
        <label>
          Email
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
          />
        </label>
        <label>
          Password
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            autoComplete={
              mode === 'sign-in' ? 'current-password' : 'new-password'
            }
          />
        </label>
        {error && <p className="error-text">{error}</p>}
        {info && <p className="info-text">{info}</p>}
        <button type="submit" disabled={submitting}>
          {submitting
            ? 'Please wait...'
            : mode === 'sign-in'
              ? 'Sign in'
              : 'Sign up'}
        </button>
      </form>
      <button
        type="button"
        className="link-button"
        onClick={() => {
          setMode(mode === 'sign-in' ? 'sign-up' : 'sign-in');
          setError(null);
          setInfo(null);
        }}
      >
        {mode === 'sign-in'
          ? "Don't have an account? Sign up"
          : 'Already have an account? Sign in'}
      </button>
    </div>
  );
}
