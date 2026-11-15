#!/bin/sh
# Daily retention for anchoriq.io. Prints what it deleted (visible with: journalctl -u anchoriq-website-retention).
# COMPOSE and LOG_DIR may be overridden (the local test does); on the VPS the defaults apply.
set -eu
cd "$(dirname "$0")"
. ./retention.env
COMPOSE=${COMPOSE:-docker compose}
LOG_DIR=${LOG_DIR:-logs}
cli() { $COMPOSE exec -T forms node /srv/site/server/enquiries.mjs "$@"; }
# 1. Enquiries older than ENQUIRY_RETENTION_DAYS (secure delete + WAL checkpoint inside the store).
cli purge --older-than "$ENQUIRY_RETENTION_DAYS"
# 2. Request-log files access-YYYY-MM-DD.log: delete days at or before the cutoff (UTC).
cutoff=$($COMPOSE exec -T forms node -e "console.log(new Date(Date.now() - $LOG_RETENTION_DAYS * 864e5).toISOString().slice(0, 10))")
for f in "$LOG_DIR"/access-*.log; do
  [ -e "$f" ] || continue
  day=$(basename "$f" .log); day=${day#access-}
  if [ ! "$day" \> "$cutoff" ]; then rm -f -- "$f"; echo "deleted request log $f"; fi
done
# 3. Evidence for the journal: what remains.
cli stats
cli unnotified
echo "request logs kept: $(ls "$LOG_DIR" 2>/dev/null | tr '\n' ' ')"
