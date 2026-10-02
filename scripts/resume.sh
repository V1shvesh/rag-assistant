#!/usr/bin/env bash
# Resumes the backend after a pause. Order matters: if Supabase has also
# self-paused (it does this independently, after ~7 days of low activity,
# on a different timer than Render's), waking Render first just gets you
# a backend that's up but can't reach a paused database. Supabase goes
# first here for exactly that reason.
set -euo pipefail

: "${RENDER_API_KEY:?Set RENDER_API_KEY (Render dashboard -> Account Settings -> API Keys)}"
: "${RENDER_SERVICE_ID:?Set RENDER_SERVICE_ID (Render dashboard -> service -> Settings)}"
: "${API_BASE_URL:?Set API_BASE_URL to the backend base URL, e.g. https://rag-assistant-api.onrender.com}"

if [ -n "${SUPABASE_ACCESS_TOKEN:-}" ] && [ -n "${SUPABASE_PROJECT_REF:-}" ]; then
  echo "Restoring Supabase project $SUPABASE_PROJECT_REF..."
  curl -s -X POST "https://api.supabase.com/v1/projects/${SUPABASE_PROJECT_REF}/restore" \
    -H "Authorization: Bearer ${SUPABASE_ACCESS_TOKEN}" \
    -H "Content-Type: application/json" \
    -d '{}' > /dev/null || echo "Supabase restore call failed -- check the dashboard manually." >&2
else
  echo "SUPABASE_ACCESS_TOKEN / SUPABASE_PROJECT_REF not set."
  echo "If the project has self-paused, resume it manually first:"
  echo "  https://supabase.com/dashboard/project/_/settings/general"
  read -r -p "Press Enter once Supabase is confirmed active (or if it was never paused)... "
fi

echo "Resuming Render service $RENDER_SERVICE_ID..."
http_status=$(curl -s -o /dev/null -w '%{http_code}' \
  -X POST "https://api.render.com/v1/services/${RENDER_SERVICE_ID}/resume" \
  -H "Authorization: Bearer ${RENDER_API_KEY}" \
  -H "Accept: application/json")

if [ "$http_status" != "202" ]; then
  echo "Unexpected response: HTTP $http_status" >&2
  exit 1
fi

echo "Resume requested. Waiting for the health check to come back (cold start can take up to a minute)..."
elapsed=0
timeout=120
until curl -s -o /dev/null -w '%{http_code}' "${API_BASE_URL}/" | grep -q '^200$'; do
  if [ "$elapsed" -ge "$timeout" ]; then
    echo "Backend did not respond with 200 within ${timeout}s -- check the Render dashboard." >&2
    exit 1
  fi
  sleep 5
  elapsed=$((elapsed + 5))
done

echo "Backend is up and healthy at ${API_BASE_URL}."
