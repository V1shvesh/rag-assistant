# RAG Assistant

A grounded Q&A assistant over a personal book collection. Ask a question, and it
answers **only** from passages it retrieved from the book, cites the chapters it
used, and says **"I don't know"** when the book doesn't contain the answer —
instead of making something up.

Built end to end: ingestion, embeddings, vector search, LLM generation, an eval
harness, auth, a React frontend, and a deploy setup.

## How it works

```
Ingestion (runs once per book)
  epub ──► parse + chunk by chapter ──► embed (OpenAI) ──► Postgres + pgvector

Query (every question)
  question ──► embed ──► top-k cosine search ──► Claude (context-only prompt) ──► cited answer
```

The question and the book chunks are embedded through the **same** service
method, so their vectors are always comparable.

## Results

A fixed eval set of 12 hand-written questions against _Project Hail Mary_
(`npm run eval`, real API calls, no mocks):

- **9/9** answerable questions returned correct, cited answers
- **3/3** deliberately out-of-scope questions were correctly refused — no hallucinations

## Engineering highlights

- **Grounded by design.** The prompt restricts Claude to retrieved context; if
  retrieval returns nothing, the app short-circuits and never calls the LLM.
- **Handles chapters larger than the embedding model's limit.** 5 of 37
  chapters exceed the 8,191-token cap; they're split, embedded in slices, and
  merged into one token-weighted, re-normalized vector.
- **Rate-limit aware batching.** Embedding requests are batched against the
  account's real tokens-per-minute limit, and non-recoverable errors (bad key,
  no credit) fail fast instead of retrying for minutes.
- **Typed error handling** for the Claude API (auth, rate limit, connection,
  truncated output), surfaced cleanly to the UI.
- **Secure by default.** A global guard verifies Supabase ES256 JWTs via JWKS;
  routes must explicitly opt out with `@Public()`. CORS is scoped by env.
- **Tested and linted.** Unit tests across the pipeline and auth modules; lint, Prettier and
  `tsc --noEmit` kept clean on every commit.
- **Documented lessons.** [`GOTCHA.md`](GOTCHA.md) logs real surprises hit
  along the way — e.g. a rate-limit dashboard that didn't match what the API
  actually enforced.

## Tech stack

| Layer      | Choice                                                       |
| ---------- | ------------------------------------------------------------ |
| Backend    | NestJS (TypeScript)                                          |
| Database   | Postgres + pgvector on Supabase                              |
| Embeddings | OpenAI `text-embedding-3-small` (1536-d)                     |
| LLM        | Claude Haiku 4.5 (Anthropic API)                             |
| Frontend   | React + Vite + TypeScript, Supabase Auth                     |
| Hosting    | Render (Docker web service + static site), via `render.yaml` |

## Project structure

```
src/
  ingestion/    epub → chapter chunks
  embeddings/   batched, rate-limited embedding generation
  retrieval/    question → top-k similar chunks (pgvector)
  generation/   chunks + question → grounded, cited answer (Claude)
  eval/         fixed Q&A test set + grading script
  auth/         Supabase JWT verification (global guard)
frontend/       React SPA: sign-in + Q&A view
```

## Running locally

Requires Node 22+, a Supabase project with pgvector enabled, and OpenAI +
Anthropic API keys.

```bash
cp .env.example .env                  # fill in DB URL, API keys, Supabase URL
npm install
npm run start:dev                     # backend on :3000

cd frontend
cp .env.example .env                  # Supabase URL + anon key, API base URL
npm install
npm run dev                           # frontend on :5173
```

Other commands: `npm run test` (unit tests), `npm run eval` (live eval set).
Deploying and pausing the hosted version is covered in
[`PLAYBOOK.md`](PLAYBOOK.md).
