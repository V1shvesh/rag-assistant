# RAG Assistant — Project Context (carry over into Claude Code)

This file captures context from planning that doesn't belong in CLAUDE.md
(which should stay focused on stack/conventions/status). Paste this file into
the project root or just paste its contents into your first Claude Code
session so it has the full picture.

## Why this project exists

This is practice project #1 of a personal learning plan (5+ year UI/frontend
engineer, based in Delhi, deepening AI-era skills). Two things are being
learned simultaneously, deliberately:

1. **RAG architecture** — embeddings, retrieval, grounded generation, evals.
2. **Working effectively with Claude Code** — this is the explicit primary
   goal, arguably more than the RAG project itself. Practice these habits
   while building:
   - Plan-first: ask Claude Code to propose a plan before non-trivial
     changes, review the plan critically before approving.
   - Small, git-checkpointed increments — commit after each working step.
   - Give Claude Code a way to self-verify (run the server, run a script,
     curl an endpoint) rather than being the only human check.
   - Fresh session per unrelated task, not one long mixed-context thread.
   - Keep a personal failure log: whenever an AI-assisted change goes wrong
     in a way that was surprising, write one line on what happened and why.
   - Treat AI output like a junior engineer's PR — read and understand every
     non-trivial diff before accepting it, don't accept code you can't
     explain.

## Source material

- Source is **a personal epub book** (already read, owned copy). Using it
  for a private, non-redistributed personal RAG tool is fine — this isn't
  republishing content, just indexing a personal copy for personal search.
- Needs an extraction step before chunking: epub → plain text. Use
  `epub2` to unzip/parse, `html-to-text` to strip tags per chapter.
- Books are more narrative/long-form than docs — chunk by
  chapter/section boundaries, not arbitrary paragraph counts, or retrieval
  quality suffers.

## Stack decisions and why (already in CLAUDE.md, rationale here)

- **Backend: NestJS.** Chosen because its module structure
  (controllers/services/modules) maps naturally onto RAG pipeline stages —
  ingestion, embeddings, retrieval, generation, eval — which keeps prompts
  to Claude Code cleaner and the architecture legible.
- **DB: Supabase (hosted Postgres + pgvector), free tier.** Chosen to avoid
  local Postgres/infra setup friction for a first project.
- **Embeddings: OpenAI `text-embedding-3-small`.** Cost is a non-issue at
  this scale (a whole book costs a few cents to embed either way). Chosen
  over Voyage AI specifically because it's the most well-trodden path with
  the most tutorials/prior art — when a bug inevitably shows up in
  retrieval or chunking, debugging against a common setup beats debugging
  an unusual one. Swapping embedding providers later is a reasonable
  follow-up exercise once the pipeline works end to end.
- **LLM: Claude API**, for the generation step.
- **Frontend: not a priority yet** — bare HTML or minimal React, come back
  to this last.

## Architecture (mental model)

Two distinct pipelines:

**1. Ingestion pipeline (runs once, or whenever a new book is added)**
Epub → Ingestion module (parse + chunk) → Embeddings module (calls OpenAI,
batched ~100 chunks per request) → Postgres (`chunks` table: text, source,
chapter title, embedding vector).

**2. Query pipeline (runs on every user question)**
User question → Retrieval module (embed the question with the *same*
OpenAI model used for chunks, pgvector similarity search for top-k chunks)
→ Generation module (Claude API call: answer only from retrieved context,
cite sources, say "I don't know" if context doesn't contain the answer) →
Answer with citations.

**Eval harness** wraps around the query pipeline from outside — it's not a
pipeline stage, it's a test runner that calls the query pipeline repeatedly
against a fixed Q&A set (10-15 pairs, including a few deliberately
unanswerable questions to check it doesn't hallucinate).

**Important subtlety to preserve in code:** the embeddings call used for
chunks at ingestion time and the embeddings call used for the live user
question at query time must go through the *same* shared `EmbeddingsService`
method — not two divergent code paths — or the vectors won't be comparable.

## Build sequence status

1. Pick document set — DONE (epub book)
2. Project skeleton — IN PROGRESS (see below)
3. Supabase + pgvector setup — NOT STARTED
4. Epub parsing + chunking — NOT STARTED (design discussed, see Ingestion
   module notes above)
5. Embeddings generation — NOT STARTED (design discussed, see Embeddings
   module notes above; batch ~100 chunks/request, store 1536-dim vectors)
6. Retrieval endpoint — NOT STARTED
7. Generation endpoint — NOT STARTED
8. Eval set — NOT STARTED (10-15 hand-written Q&A pairs, include
   unanswerable questions)

## Environment notes

- Local machine is a Mac (darwin/arm64), Homebrew is the preferred install
  method for CLI tools, has a `~/projects` folder likely intended as the
  project's home.
- Node 22+ confirmed available.
- A prior attempt to scaffold the NestJS project from a cloud sandbox
  session failed — that sandbox's network egress doesn't allow
  registry.npmjs.org, so `npx @nestjs/cli new` must be run from a real
  local terminal (or Claude Code with local shell access), not a
  restricted cloud sandbox.
- Commands to scaffold, if not already done:
  ```bash
  cd ~/projects
  npx @nestjs/cli new rag-assistant --package-manager npm --skip-git
  cd rag-assistant
  git init && git add -A && git commit -m "Initial NestJS scaffold"
  mkdir -p src/ingestion src/embeddings src/retrieval src/generation src/eval
  npm install @nestjs/config pg pgvector openai epub2 html-to-text class-validator class-transformer
  ```

## Immediate next step

Supabase project setup: create project, enable the `pgvector` extension,
create the `chunks` table (columns: id, source, chapter_title, text,
embedding vector(1536)). Then wire NestJS's ConfigModule to the Supabase
connection string via environment variables (never hardcoded).

## Future scope / revisit later

- **Re-chunk oversized chapters (currently deferred in favor of split +
  mean-pool).** `text-embedding-3-small` has an 8191-token hard limit per
  input. Measuring the real ingested book ("Project Hail Mary"), 5 of 37
  chapter-sized chunks exceed it (up to ~10,900 tokens). Chosen fix for
  now: split the oversized chunk's text into token-bounded slices, embed
  each slice, and store a single token-weighted, re-normalized average
  vector per chunk row — no ingestion/schema changes, fully isolated to
  the embeddings module. Tradeoff: the stored embedding is a *blend* of
  everything in that chapter, which may reduce retrieval precision for
  narrow questions about one specific scene inside a long chapter (lower
  recall risk, not an answer-quality risk, since the full chapter text is
  still intact and still passed to generation once retrieved).
  Alternative considered: re-chunk those specific chapters into multiple
  `chunks` rows (paragraph/scene-aware splitting) at ingestion time,
  giving each sub-chunk its own undiluted embedding — better retrieval
  precision, but touches ingestion's "one row per chapter" design and
  needs careful split-boundary handling. **Revisit this once the eval set
  (build step 8) exists** — only worth the added complexity if eval
  results actually show poor retrieval on these specific long chapters.
