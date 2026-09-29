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
- Frontend: minimal for now — a bare HTML page or simple React, not a priority yet

## Project structure (NestJS modules)
- `ingestion/` — epub parsing + chunking (source text -> chunks table)
- `embeddings/` — generates and stores embeddings for chunks
- `retrieval/` — given a query, embeds it and finds top-k similar chunks via pgvector
- `generation/` — takes retrieved chunks + question, calls Claude API, returns
  grounded answer with source citations
- `eval/` — small script/test harness that runs a fixed Q&A test set and checks
  answers against expected results

## Conventions
- Use NestJS dependency injection — no manual instantiation of services
- DTOs with class-validator for all endpoint inputs
- Environment variables via NestJS ConfigModule — never hardcode API keys
- Async/await throughout, no raw promises with .then()
- Prefer explicit types over `any`

## How to run
- `npm run start:dev` — dev server with hot reload
- `npm run test` — unit tests
- (eval script command — to be added once eval harness exists)

## Current status
Working through build steps in order:
1. Project skeleton — DONE (module folders created, deps installed)
2. Supabase + pgvector setup — DONE (pgvector 0.8.2 enabled, `chunks` table
   created, ConfigModule/DatabaseModule wired to DATABASE_URL)
3. Epub parsing + chunking — IN PROGRESS
4. Embeddings generation
5. Retrieval endpoint
6. Generation endpoint
7. Eval set

## Notes
- Source material is a personal epub book — extraction happens once, chunks are
  cached in the DB, not re-parsed on every run.
- Keep this file updated as we finish each numbered step above.
