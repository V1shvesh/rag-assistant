import type { AskResponse } from '../types';

// The backend only sets groundedInContext: false for its zero-chunk
// short-circuit. When chunks ARE retrieved but Claude still correctly
// refuses (per the system prompt's "say I don't know" instruction),
// groundedInContext stays true with citations attached -- those
// citations were never actually used. Catch that case by phrase so it
// gets the same "not found" treatment instead of looking like a normal
// cited answer. Mirrors the refusal-phrase list in src/eval/run-eval.ts.
const REFUSAL_PHRASES = [
  "i don't know",
  'i cannot answer',
  "don't contain information",
  'does not contain information',
  "doesn't contain information",
  "don't have information",
  "i can't",
];

function isRefusal(answer: string): boolean {
  const lower = answer.toLowerCase();
  return REFUSAL_PHRASES.some((phrase) => lower.includes(phrase));
}

export function AnswerCard({ result }: { result: AskResponse }) {
  if (!result.groundedInContext || isRefusal(result.answer)) {
    return (
      <div className="answer-card not-found">
        <span className="answer-label">Not found in the book</span>
        <p>{result.answer}</p>
      </div>
    );
  }

  return (
    <div className="answer-card grounded">
      <span className="answer-label">
        Grounded in {result.citations.length}{' '}
        {result.citations.length === 1 ? 'source' : 'sources'}
      </span>
      <p>{result.answer}</p>
      {result.citations.length > 0 && (
        <ul className="citations">
          {result.citations.map((citation) => (
            <li key={citation}>{citation}</li>
          ))}
        </ul>
      )}
      {result.truncated && (
        <p className="truncated-note">Answer was cut off (token limit).</p>
      )}
    </div>
  );
}
