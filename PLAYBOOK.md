# Deploy & Pause/Resume Playbook

How to get this project running on the internet, and how to turn it off
and on again without leaving anything billing in the background.

Hosting: **Render** (free instance type for the backend, free static
site for the frontend). Both deploy from one `render.yaml` blueprint.
Auth: **Supabase Auth**. Database: **Supabase Postgres + pgvector**.

## Prerequisites

Nothing to install locally except a GitHub CLI, if you don't already
have a way to create a repo:

```bash
brew install gh
gh auth login
```

No Docker, no Render CLI, no Supabase CLI needed locally — Render builds
from the Dockerfile on its own servers, and the pause/resume scripts are
plain `curl`.

## First-time deploy

1. **Push this repo to a private GitHub repo** (Render builds from a
   connected Git repo):
   ```bash
   gh repo create rag-assistant --private --source=. --remote=origin
   git push -u origin main
   ```

2. **Get the Supabase connection pooler string.** In the Supabase
   dashboard: Project Settings -> Database -> Connection pooling. Copy
   the **session mode** pooler string (not the direct `db.<ref>.supabase.co`
   host — that host is IPv6-only and Render's outbound networking is
   IPv4-only, so the direct string cannot connect from Render at all).
   Session mode, not transaction mode, so pgvector's prepared statements
   keep working.

3. **Connect the repo to Render.** In the Render dashboard: New -> Blueprint
   -> select the GitHub repo. Render reads `render.yaml` and creates both
   services (`rag-assistant-api`, `rag-assistant-web`).

4. **Set secrets on `rag-assistant-api`** (Render dashboard -> service ->
   Environment):
   - `DATABASE_URL` — the pooler string from step 2.
   - `OPENAI_API_KEY`, `ANTHROPIC_API_KEY` — same values as local `.env`.
   - `SUPABASE_URL` — e.g. `https://<project-ref>.supabase.co`.
   - `CORS_ORIGINS` — placeholder for now (`http://localhost:5173`), fixed
     in step 6.

5. **Set secrets on `rag-assistant-web`**:
   - `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` — from Supabase
     dashboard -> Project Settings -> Data API.
   - `VITE_API_BASE_URL` — placeholder for now, fixed in step 6.

6. **Resolve the URL chicken-and-egg.** Both services need each other's
   URL, but neither exists until first deployed. After the first deploy
   of both:
   - Set `rag-assistant-api`'s `CORS_ORIGINS` to the real
     `rag-assistant-web` URL (plus `http://localhost:5173` for local
     dev), comma-separated. Redeploy.
   - Set `rag-assistant-web`'s `VITE_API_BASE_URL` to the real
     `rag-assistant-api` URL. **Rebuild** (not just restart — Vite
     inlines `VITE_*` vars at build time).

7. **Verify:**
   ```bash
   curl https://rag-assistant-api.onrender.com/
   ```
   should return 200. Open the `rag-assistant-web` URL in a browser,
   sign up, sign in, and ask a question.

## Routine deploy

```bash
git push
```
Render auto-deploys both services on push to `main`.

## Routine pause

```bash
export RENDER_API_KEY=...      # Render dashboard -> Account Settings -> API Keys
export RENDER_SERVICE_ID=...   # rag-assistant-api's service id
./scripts/pause.sh
```
Optional ceremony on this host — the free instance type already spins
down to $0 on its own after ~15 min idle. Use this when you want the
service to be *unreachable* for a while (a longer trip, a long break
from the project), not as a daily habit.

## Routine resume

```bash
export RENDER_API_KEY=...
export RENDER_SERVICE_ID=...
export API_BASE_URL=https://rag-assistant-api.onrender.com
# Optional, only if Supabase has also self-paused and you want this
# scripted rather than manual:
export SUPABASE_ACCESS_TOKEN=...
export SUPABASE_PROJECT_REF=...
./scripts/resume.sh
```

**Order matters.** Supabase self-pauses after ~7 days of low activity —
an independent timer from Render's 15-minute spin-down. After a longer
absence, both may be asleep. The script restores Supabase *before*
resuming Render; doing it the other way round wakes a backend that then
fails to reach a still-paused database, which looks like a bug but
isn't one.

If `SUPABASE_ACCESS_TOKEN`/`SUPABASE_PROJECT_REF` aren't set, the script
pauses and asks you to confirm manually via the dashboard
(Supabase -> project -> **Resume Project**) before continuing.

## Admin endpoint recipe

`POST /ingestion/epub` and `POST /embeddings/generate` are protected
like every other route — they're one-time operations the project owner
runs manually, not something the frontend calls, but a public backend
still shouldn't leave them open to anyone with a network connection.

To call them once deployed:
1. Sign in on the frontend.
2. Open the browser devtools console and run:
   ```js
   const { data } = await window.supabase.auth.getSession();
   console.log(data.session.access_token);
   ```
   (Assumes the Supabase client is reachable as `window.supabase` in dev
   builds — adjust if it isn't exposed that way.)
3. Curl with that token:
   ```bash
   curl -X POST https://rag-assistant-api.onrender.com/embeddings/generate \
     -H "Authorization: Bearer <token>"
   ```

## Troubleshooting

- **The API won't connect to the database at all.** You're almost
  certainly using the direct `db.<ref>.supabase.co` string instead of
  the pooler string. That host is IPv6-only; Render has no outbound
  IPv6. Use the Connection pooling string from Supabase's dashboard.
- **CORS errors in the browser console.** Check `CORS_ORIGINS` on
  `rag-assistant-api` includes the exact frontend origin (scheme +
  host, no trailing slash), and that you redeployed after changing it.
- **The first request after a while takes 30-60 seconds.** This is
  normal — Render's free instance type cold-starts after ~15 min idle.
  Not a hang. The frontend shows a "waking up" message past ~5 seconds
  for exactly this reason.
- **A health check fails and the deploy is marked unhealthy.** Confirm
  `AppController.getHello()` still has `@Public()` — the health check
  hits `/` with no auth, and if that route is ever guarded, Render will
  never see it come up healthy.
- **A 500 right after returning from a long break.** Likely Supabase
  self-paused. Resume it manually (dashboard -> Resume Project) or via
  `scripts/resume.sh`, then retry.
- **401 on every request from the frontend.** Check the token is
  actually being attached (`Authorization: Bearer <token>`) and that
  it's fresh — `supabase.auth.getSession()` should be called right
  before each request, not cached from page load.

## Cost expectations

| State | Expected cost |
|---|---|
| Paused (`scripts/pause.sh`) | $0 |
| Idle, spun down automatically | $0 — free instance type, and 750 free instance-hours/month exceeds a full month anyway |
| Light personal use | $0 hosting (free instance + free static site) + per-request OpenAI embedding (fractions of a cent) + Anthropic Haiku generation cost |
| Always-on paid tier (if the cold start ever becomes annoying) | Render's paid web services start around $7/mo |

**Confirm current numbers on Render's and Supabase's own pricing pages
before relying on this table** — pricing changes, and this project has
already been burned once by a dashboard/docs-vs-reality mismatch (see
`GOTCHA.md`).
