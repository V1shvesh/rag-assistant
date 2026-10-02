# Gotchas

Surprises hit while building this project where reality didn't match what the
tooling, docs, or dashboards implied. Kept separate from PROJECT.md/CLAUDE.md
so they're easy to scan when something feels familiar. Add a new entry
whenever an AI-assisted (or manual) change goes wrong in a surprising way —
one entry per gotcha, newest at the bottom unless noted otherwise.

## OpenAI dashboard tier vs. actually-enforced limit (2026-10-02)

**What happened:** Added credits and the OpenAI dashboard immediately showed
Tier 1 (3,000 RPM / 1,000,000 TPM / no RPD cap). Set `TIER_TOKENS_PER_MINUTE`
to 1,000,000 accordingly and re-ran embedding generation — got a live 429:
`Limit 40000, Requested 216305`. The actually-enforced TPM for
`text-embedding-3-small` was still the old (free-tier-equivalent) 40,000,
despite the dashboard already showing Tier 1.

**Why:** Tier upgrades on OpenAI's dashboard can lag behind what's actually
enforced on the backend — the UI reflects eligibility, not necessarily live
enforcement.

**Fix / takeaway:** Don't trust a rate-limit dashboard number until a real
request confirms it. `embeddings.constants.ts` now sets
`TIER_TOKENS_PER_MINUTE = 40_000` with a comment explaining the mismatch and
noting to bump it once a live request confirms the higher limit is active.

## OpenAI embeddings require a positive credit balance, independent of rate-limit tier (2026-10-02)

**What happened:** First embedding run (before adding credits) failed every
chunk with `429 You have no credits remaining`, even though the account was
within every published free-tier rate limit (RPM/RPD/TPM). This isn't a rate
limit at all — `type: insufficient_quota`, `code: credit_balance_exhausted`.

**Why:** The embeddings endpoint requires a positive balance to call at all;
free ChatGPT usage and API usage are billed separately, and the "Free tier"
rate-limit table is a ceiling for paid calls, not a free quota of usable
requests.

**Fix / takeaway:** `EmbeddingsService.fatalReasonFor()` detects
`type === 'insufficient_quota'` (and `AuthenticationError`) and aborts the
whole run immediately instead of patiently rate-limiting through batches that
are guaranteed to keep failing — the first version of this code didn't
distinguish this from a transient error and took 7 minutes to fail
completely, retrying/waiting between every doomed batch.

## `pg` and `html-to-text` ship zero TypeScript types (2026-09-29)

**What happened:** `npm run lint` passed clean on `database.module.ts`,
`ingestion.service.ts`, and `epub-parser.service.ts` right up until writing
unit tests for them surfaced a wall of `@typescript-eslint/no-unsafe-*`
errors — "type that could not be resolved" on `Pool`, `PoolClient`, and
`convert()`.

**Why:** Neither `pg` nor `html-to-text` bundles its own `.d.ts` files, and
`@types/pg` / `@types/html-to-text` were never installed. Every usage was
silently typed as `any`. Plain `tsc --noEmit` didn't complain because
`tsconfig.json` has `noImplicitAny: false` — only ESLint's type-aware rules
(which see the real resolved type, `any`/error) caught it.

**Fix / takeaway:** Installed `@types/pg` and `@types/html-to-text` as dev
deps. A clean `tsc --noEmit` is not proof a dependency has real types behind
it — check `npm run lint` (type-aware) too, or check the package's own
`package.json` for a `types` field / bundled `.d.ts`.

## `@nestjs/config` and `pgvector` ship ESM-only, silently breaking Jest (2026-09-29, 2026-10-02)

**What happened:** `test/app.e2e-spec.ts` (pre-existing, from the Nest CLI
scaffold) started failing with `Must use import to load ES Module` the moment
`ConfigModule` was wired into `AppModule` — and failed again, same error,
different package, the moment `EmbeddingsModule` (which imports `pgvector`)
was wired in. Neither failure was noticed until a later session explicitly
ran `npm run test:e2e`, meaning the e2e suite had been silently broken for a
while.

**Why:** Both packages declare `"type": "module"` in their `package.json`
(ESM-only, no CommonJS build). Jest's default `transformIgnorePatterns`
(`["/node_modules/"]`) skips transforming anything in `node_modules`, so
ts-jest never got a chance to convert these two packages' ESM syntax to
CommonJS before `require()`-ing them.

**Fix / takeaway:** Added
`"transformIgnorePatterns": ["node_modules/(?!(@nestjs/config|pgvector)/)"]`
to both `package.json`'s Jest config and `test/jest-e2e.json`. Whenever a new
dependency gets imported by anything the e2e suite touches, run
`npm run test:e2e` before assuming it's fine — a clean unit-test run doesn't
exercise the full `AppModule` import graph the way the e2e suite does.

## macOS blocks shell file access to `~/Downloads`, even unsandboxed (2026-09-29)

**What happened:** `epub2` failed with "Invalid/missing file" trying to read
a path under `~/Downloads`, even though `ls -la` on that exact path succeeded
and showed the file existed. Re-running with the sandbox disabled still
failed the same way on a direct `cp`.

**Why:** This is macOS's TCC (Transparency, Consent, Control) privacy
protection on the Downloads folder, not a Claude Code sandbox restriction —
`ls` can read directory metadata without permission, but reading file
contents needs the terminal app to have "Files and Folders" access, which it
didn't have.

**Fix / takeaway:** Had the user manually move/copy the file into the
project directory (`data/`, gitignored) from their own Finder/terminal. If a
file is visible via `ls` but unreadable, suspect TCC before assuming the path
is wrong.

## NestJS DI breaks when an `@Injectable()` constructor param is typed as a plain interface (2026-10-02)

**What happened:** Gave `EmbeddingsRateLimiter` a `budget: RateLimiterBudget
= DEFAULT_BUDGET` constructor parameter (to make it testable with a custom
budget) and the Tier 1 rate-limit commit looked fine on every check — until
`npm run test:e2e` failed: `Nest can't resolve dependencies of the
EmbeddingsRateLimiter (?)`.

**Why:** Nest's DI resolves constructor parameters using
`design:paramtypes` reflection metadata. A plain TypeScript `interface`
(unlike a class) has no runtime representation, so Nest sees a parameter it
can't match to any provider and tries to inject it as a required dependency
anyway — the default value never gets a chance to apply because Nest throws
before calling the constructor.

**Fix / takeaway:** Added `@Optional()` to the parameter. Nest then injects
`undefined` when nothing's provided (instead of throwing), and the JS default
parameter value kicks in normally. Any constructor-injected default on an
`@Injectable()` needs `@Optional()` if the parameter's type isn't itself an
injectable class/token.

## Overriding a provider in a Nest e2e test doesn't stop its unused dependencies from being constructed (2026-10-02)

**What happened:** `test/retrieval.e2e-spec.ts` imports `RetrievalModule`
and overrides `RetrievalService` with a fake via `.overrideProvider(...)
.useValue(...)`, expecting that to isolate the test from anything
`RetrievalService` would have needed. It still failed to compile: `Nest
can't resolve dependencies of the EmbeddingsService (?, PG_POOL,
EmbeddingsRateLimiter)` — `ConfigService` wasn't available because no
`ConfigModule` was imported into this narrow test module.

**Why:** `RetrievalModule` imports `EmbeddingsModule` (so `RetrievalService`
can inject `EmbeddingsService`). Nest eagerly instantiates every provider a
compiled module graph declares, not just the ones still reachable after an
override — so the *real* `EmbeddingsService` was being constructed anyway,
even though the only thing that used to depend on it (`RetrievalService`)
had just been replaced with a fake that no longer calls it.

**Fix / takeaway:** When an e2e test imports a module that itself imports
another module with its own real dependencies (API keys, DB pools, etc.),
override *all* of those nested services too, not just the top-level one
under test — e.g. also
`.overrideProvider(EmbeddingsService).useValue({ embed: jest.fn() })`. A
provider override isn't a prune of the dependency graph; it's a swap.

## A global guard (APP_GUARD) is silently absent from narrow e2e test modules (2026-10-02)

**What happened:** Added a global `SupabaseAuthGuard` via
`{ provide: APP_GUARD, useClass: SupabaseAuthGuard }` in `AppModule`,
expecting every existing e2e spec (`generation`, `retrieval`, `ingestion`)
to start failing with 401 until each added
`.overrideGuard(SupabaseAuthGuard).useValue({ canActivate: () => true })`.
Ran `npm run test:e2e` first to confirm — all 17 pre-existing tests still
passed, completely unaffected, with no override added at all.

**Why:** Each of those specs does `Test.createTestingModule({ imports: [GenerationModule] })`
(etc.) — a narrow module that never imports `AppModule`. `APP_GUARD` is
registered on `AppModule`'s own `providers` array, so it simply isn't part
of the compiled graph for any test that doesn't import `AppModule` itself.
The guard was real and working; the existing specs just never exercised it.

**Fix / takeaway:** A new `test/auth.e2e-spec.ts` was added that imports
`AppModule` directly (overriding the downstream services it needs to avoid
hitting live infra) — that's the only way to actually prove a global
`APP_GUARD` is wired in. Don't assume a guard/interceptor registered at the
`AppModule` level is covered by feature-module-scoped e2e specs; it isn't,
and the test suite will stay green either way, which makes this easy to
miss silently.

## `groundedInContext: true` doesn't mean the answer actually used the context (2026-10-02)

**What happened:** Live-tested the frontend against "What is the capital
of France?" and got `groundedInContext: true` with 5 citations attached,
even though the rendered answer was "I don't know. The passages provided
do not contain information about the capital of France." The
`AnswerCard` component only branched on `groundedInContext`, so this
rendered as a normal cited answer instead of the intended "Not found in
the book" treatment.

**Why:** `GenerationService.answer()` only sets `groundedInContext: false`
for its zero-chunk short-circuit (`src/generation/generation.service.ts`).
When retrieval *does* return chunks but Claude still correctly refuses
per the system prompt's "say I don't know" instruction, the method falls
through the normal success path: `groundedInContext: true`, with
`citations` populated from the retrieved-but-unused chunks. This exact
behavior was already called out as a known nuance in `EVAL_RESULTS.md`
("`citations` still lists retrieved-but-unused chunks" for the
`unanswerable-*` eval cases) — but it hadn't yet surfaced as a frontend
bug until this live click-through.

**Fix / takeaway:** `AnswerCard.tsx` now also checks the answer text for
refusal phrases ("i don't know", "i cannot answer", etc. — the same list
`src/eval/run-eval.ts` already uses for grading) before deciding which
treatment to render, not just the `groundedInContext` flag alone. A
boolean flag computed once per request can't capture every case a
free-text model response can land in — when a flag is a proxy for "did
the model actually use this," treat it as a hint, not a guarantee.
