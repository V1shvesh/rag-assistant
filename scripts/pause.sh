#!/usr/bin/env bash
# Suspends the Render backend service -- the deliberate "I'm done for a
# while" switch. Render's free instance type already spins down on its
# own after ~15 min idle, so this isn't needed day-to-day; it's for making
# the service genuinely unreachable (no stray wake from a bot or an old
# browser tab) during a longer absence.
set -euo pipefail

: "${RENDER_API_KEY:?Set RENDER_API_KEY (Render dashboard -> Account Settings -> API Keys)}"
: "${RENDER_SERVICE_ID:?Set RENDER_SERVICE_ID (Render dashboard -> service -> Settings)}"

echo "Suspending Render service $RENDER_SERVICE_ID..."
http_status=$(curl -s -o /dev/null -w '%{http_code}' \
  -X POST "https://api.render.com/v1/services/${RENDER_SERVICE_ID}/suspend" \
  -H "Authorization: Bearer ${RENDER_API_KEY}" \
  -H "Accept: application/json")

if [ "$http_status" != "202" ]; then
  echo "Unexpected response: HTTP $http_status" >&2
  exit 1
fi

echo "Suspended. Cost while paused: \$0 compute on Render's free instance type."
echo "Supabase: free projects self-pause after ~7 days of low activity, also at \$0 -- nothing to do here."
