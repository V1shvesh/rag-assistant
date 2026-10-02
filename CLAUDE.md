# Project: RAG Assistant

## Goal
A grounded Q&A assistant over a personal document set (starting with one epub book).
Given a user question, retrieve relevant chunks via semantic search and generate an
answer using ONLY that retrieved context, citing sources, and explicitly saying
"I don't know" when the context doesn't contain the answer.

## Stack
- Backend: NestJS (TypeScript)
- Database: Postgres with pgvector extension, hosted on Supabase (free tier)
- Embeddings: OpenAI text-embedding-3-small (1536 dimensions)
- LLM: Claude API (Anthropic)
- Frontend: React + Vite + TypeScript SPA in `frontend/`, Supabase Auth for sign-in
- Auth: Supabase Auth (ES256 JWTs, verified backend-side via JWKS — see `auth/`)
- Hosting: Render (Docker web service for the backend + static site for the
  frontend), free instance type — see `PLAYBOOK.md`

## Project structure (NestJS modules)
- `auth/` — verifies Supabase-issued JWTs (global `APP_GUARD`, routes opt out
  via `@Public()` rather than opting in)
- `ingestion/` — epub parsing + chunking (source text -> chunks table)
- `embeddings/` — generates and stores embeddings for chunks
- `retrieval/` — given a query, embeds it and finds top-k similar chunks via pgvector
- `generation/` — takes retrieved chunks + question, calls Claude API, returns
  grounded answer with source citations
- `eval/` — small script/test harness that runs a fixed Q&A test set and checks
  answers against expected results
- `frontend/` — separate Vite/React app with its own `package.json`,
  lint/prettier/tsconfig, not part of the NestJS build

## Conventions
- Use NestJS dependency injection — no manual instantiation of services
- DTOs with class-validator for all endpoint inputs
- Environment variables via NestJS ConfigModule — never hardcode API keys
- Async/await throughout, no raw promises with .then()
- Prefer explicit types over `any`
- **Every code change must leave the repo clean on `npm run lint`, prettier formatting,
  and `npx tsc --noEmit` before being considered done — no exceptions, no deferring
  cleanup to "later."** This applies to `frontend/` too — it has its own
  `npm run lint` / `npm run typecheck`, run from inside `frontend/`.
- **Each commit should be a single, meaningful, reviewable unit of change — not a grab
  bag of unrelated edits.** If a piece of work naturally splits into independent steps
  (e.g. a config/tooling fix vs. the feature it unblocked, or a cleanup vs. new
  behavior), commit them separately rather than squashing everything into one commit.

## How to run
- `npm run start:dev` — backend dev server with hot reload
- `cd frontend && npm run dev` — frontend dev server (Vite)
- `npm run test` — unit tests
- `npm run eval` — runs the fixed Q&A eval set against the live
  Supabase DB + OpenAI + Anthropic (real calls, not mocked)
- See `PLAYBOOK.md` for deploying, pausing, and resuming the hosted version

## Current status
Working through build steps in order:
1. Project skeleton — DONE (module folders created, deps installed)
2. Supabase + pgvector setup — DONE (pgvector 0.8.2 enabled, `chunks` table
   created, ConfigModule/DatabaseModule wired to DATABASE_URL)
3. Epub parsing + chunking — DONE (`ingestion/` module: epub2 + html-to-text,
   one chunk per chapter/section, `POST /ingestion/epub` to trigger; verified
   against "Project Hail Mary" — 37 chunks)
4. Embeddings generation — DONE (`embeddings/` module: rate-limited batching
   against account-tier limits — currently Tier 1, 40,000 TPM actually
   enforced though the dashboard advertises 1,000,000, see
   embeddings.constants.ts — oversized-chunk split+mean-pool, fail-fast on
   non-recoverable errors; `POST /embeddings/generate`. Verified live: all 37
   "Project Hail Mary" chunks embedded successfully, 0 failures, including
   correct unit-norm pooled vectors for the 5 oversized chapters)
5. Retrieval endpoint — DONE (`retrieval/` module: `POST /retrieval/search`
   embeds the question via the shared `EmbeddingsService.embed()` and runs a
   pgvector cosine-distance query against `chunks`. Verified live: "Who is
   Rocky?" returns five genuinely Rocky-centric chapters as top matches)
6. Generation endpoint — DONE (`generation/` module: `POST /generation/ask`
   retrieves context then calls Claude Haiku 4.5 for a grounded, cited
   answer — chosen for cost, see GENERATION_MODEL in generation.constants.ts.
   Graceful degradation: zero-chunks short-circuit, prompt-enforced
   groundedness, typed handling of auth/rate-limit/connection/unknown
   Anthropic errors, truncation flagging. Verified live: accurate cited
   answer for "Who is Rocky?", honest "I don't know" for an out-of-corpus
   question, confirmed zero-Claude-call short-circuit for an empty source
   filter)
7. Eval set — DONE (`eval/` module: `eval-cases.ts` holds 12 hand-written
   Q&A pairs against "Project Hail Mary" — 9 answerable with expected
   keywords, 3 deliberately unanswerable/out-of-corpus. `run-eval.ts` is a
   standalone script, not an HTTP endpoint — boots the real Nest app
   context and calls `GenerationService.answer()` directly against the
   live DB/OpenAI/Anthropic, grades by keyword presence (answerable) or
   refusal-phrase presence (unanswerable), run via `npm run eval`.
   Verified live: 12/12 passing — all 9 answerable cases returned
   grounded, keyword-matching answers; all 3 unanswerable cases correctly
   said "I don't know" / refused rather than hallucinating)
8. Auth + React frontend — DONE (`auth/` module: global `SupabaseAuthGuard`
   verifies Supabase-issued ES256 JWTs via JWKS, `@Public()` opt-out for
   the health route and anything else that should stay open; CORS scoped
   to `CORS_ORIGINS`. `frontend/`: Vite/React SPA with Supabase Auth
   sign-in/sign-up and a grounded Q&A view that distinguishes a cited
   answer from the "not found in the book" case, with cold-start-aware
   loading states. Verified live in a browser: sign-up (including the
   check-your-email state), sign-in, a grounded "Who is Rocky?" answer
   with real citations, an honest "not found" answer for an
   out-of-corpus question, and sign-out)
9. Deploy + pause/resume playbook — DONE (`Dockerfile` + `.dockerignore`
   for the stateless backend image; `render.yaml` blueprint for a Docker
   web service + static site; `scripts/pause.sh` / `scripts/resume.sh`
   wrapping Render's suspend/resume API, with `resume.sh` restoring
   Supabase before Render since the two self-pause on independent
   timers; full walkthrough in `PLAYBOOK.md`. Not yet deployed live —
   Docker isn't installed locally, so the Dockerfile is unverified by a
   local build; first real verification is Render's own build on
   initial deploy)

## Notes
- Source material is a personal epub book — extraction happens once, chunks are
  cached in the DB, not re-parsed on every run.
- Keep this file updated as we finish each numbered step above.
- See `GOTCHA.md` for surprises where tooling/docs/dashboards didn't match
  reality (e.g. ESM-only deps silently breaking Jest, untyped packages,
  OpenAI's rate-limit dashboard lagging actual enforcement). Add to it
  whenever something goes wrong in a surprising way.
