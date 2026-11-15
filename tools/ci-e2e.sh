#!/bin/sh
# Browser end-to-end check (used by CI and locally): starts the form handler on a fresh store in the site's own
# enquiry mode, optionally emailing a local test mail server (MAILPIT_SMTP=host:port, MAILPIT_URL=http://host:port),
# runs tools/ci-browser-check.mjs, then stops the handler. Never uses real SMTP settings.
set -eu
cd "$(dirname "$0")/.."
T=$(mktemp -d)
OPEN=0; grep -q 'AIQ_ENQUIRIES_OPEN = true' assets/site-config.js && OPEN=1
set -- FORMS_OPEN=$OPEN PORT=8300 STATIC_DIR=. DB_PATH="$T/ci.sqlite"
if [ -n "${MAILPIT_SMTP:-}" ]; then
  set -- "$@" SMTP_HOST="${MAILPIT_SMTP%:*}" SMTP_PORT="${MAILPIT_SMTP#*:}" SMTP_REQUIRE_TLS=0 NOTIFY_FROM=hello@anchordigi.com NOTIFY_TO=hello@anchordigi.com
fi
env -i PATH="$PATH" HOME="$HOME" "$@" node server/forms.mjs > "$T/server.log" 2>&1 &
PID=$!
trap 'kill $PID 2>/dev/null || true; rm -rf "$T"' EXIT
for i in $(seq 1 50); do curl -sf http://127.0.0.1:8300/api/forms/health >/dev/null && break; sleep 0.2; done
status=0
BASE_URL=http://127.0.0.1:8300 node tools/ci-browser-check.mjs || status=$?
echo "--- handler log"; cat "$T/server.log"
exit $status
