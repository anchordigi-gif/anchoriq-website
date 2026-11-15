#!/bin/sh
# Local email-notification test. Serves an OPEN copy of the site at http://127.0.0.1:8202 with the real SMTP
# settings from ~/.config/anchoriq-website/smtp.env (password in a separate 600 file). The release preview stays closed.
set -eu
CFG=${AIQ_SMTP_ENV:-$HOME/.config/anchoriq-website/smtp.env}
[ -f "$CFG" ] || { echo "missing $CFG (see LAUNCH.md, 'Email notifications')"; exit 2; }
. "$CFG"
[ -f "${SMTP_PASS_FILE:-}" ] || { echo "missing password file SMTP_PASS_FILE=${SMTP_PASS_FILE:-unset}"; exit 2; }
for f in "$CFG" "$SMTP_PASS_FILE"; do
  p=$(stat -f %Lp "$f" 2>/dev/null || stat -c %a "$f"); [ "$p" = 600 ] || { echo "run: chmod 600 $f"; exit 2; }
done
T=$(mktemp -d)
rsync -a --exclude .git --exclude data "$(cd "$(dirname "$0")/.." && pwd)/" "$T/site/"
cd "$T/site"
python3 tools/enquiries-mode.py open >/dev/null
echo "enquiry store: $T/test-enquiries.sqlite"
exec env FORMS_OPEN=1 PORT=8202 STATIC_DIR=. DB_PATH="$T/test-enquiries.sqlite" node --env-file="$CFG" server/forms.mjs
