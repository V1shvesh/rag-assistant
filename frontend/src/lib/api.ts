import type { AskError, AskResponse } from '../types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

// A cold start on Render's free instance type can take up to ~60s after
// idle, on top of normal retrieval + generation latency -- the browser's
// default fetch timeout would fire long before that.
const REQUEST_TIMEOUT_MS = 90_000;

export class AskRequestError extends Error implements AskError {
  kind: AskError['kind'];

  constructor(kind: AskError['kind'], message: string) {
    super(message);
    this.kind = kind;
  }
}

export async function askQuestion(
  question: string,
  token: string,
): Promise<AskResponse> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}/generation/ask`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ question }),
      signal: controller.signal,
    });
  } catch {
    throw new AskRequestError(
      'network',
      'Could not reach the backend -- it may still be waking up. Please retry.',
    );
  } finally {
    clearTimeout(timeoutId);
  }

  if (response.ok) {
    return (await response.json()) as AskResponse;
  }

  if (response.status === 400) {
    throw new AskRequestError('validation', 'That question was not valid.');
  }
  if (response.status === 401) {
    throw new AskRequestError(
      'unauthorized',
      'Your session expired. Please sign in again.',
    );
  }
  if (response.status === 503) {
    throw new AskRequestError(
      'unavailable',
      'The assistant is temporarily unavailable. Please try again shortly.',
    );
  }
  throw new AskRequestError(
    'server',
    'Something went wrong answering that question.',
  );
}

export async function pingHealth(): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE_URL}/`);
    return response.ok;
  } catch {
    return false;
  }
}
