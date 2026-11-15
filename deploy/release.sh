#!/bin/sh
# Owner-run release of ONE commit of the website to the Hostinger VPS, over the owner's key-only SSH (no CI
# credentials exist for the website). Refuses unless every GitHub Actions check passed for exactly that commit and
# the policy pages have no unfinished [BRACKETED] fields. Releases are kept side by side; `site` points at one.
#   sh deploy/release.sh <full 40-character sha>   deploy that commit
#   sh deploy/release.sh --rollback                switch back to the previous release
#   sh deploy/release.sh --status                  current release and history
# Env: AIQ_VPS (default anchoriq-vps), AIQ_REPO (default anchordigi-gif/anchoriq-website).
set -eu
HOST=${AIQ_VPS:-anchoriq-vps}
REPO=${AIQ_REPO:-anchordigi-gif/anchoriq-website}
DIR=/opt/projects/anchoriq-website

remote() { ssh -o BatchMode=yes "$HOST" sh -s; }

REMOTE_SWITCH='
set -eu
cd /opt/projects/anchoriq-website
target=$1; action=$2
[ -d "releases/$target" ] || { echo "no release $target on the server"; exit 1; }
for f in compose.yaml web.nginx.conf csp.conf page-headers.conf retention.env retention.sh; do
  if ! cmp -s "releases/$target/deploy/$f" "$f"; then
    echo "deploy/$f differs from the installed copy: review and install it first (deploy/README.md)"; exit 1; fi
done
ln -sfn "releases/$target" site.next && mv -Tf site.next site
docker compose up -d --force-recreate web forms >/dev/null
for i in 1 2 3 4 5 6 7 8 9 10; do
  code=$(curl -s -o /dev/null -w "%{http_code}" --resolve anchoriq.io:443:127.0.0.1 https://anchoriq.io/api/forms/health || true)
  [ "$code" = 200 ] && break; sleep 2
done
[ "$code" = 200 ] || { echo "health check failed ($code)"; exit 1; }
echo "$(date -u +%FT%TZ) $target $action" >> releases.log
echo "live: $target ($action)"
'

case "${1:-}" in
  --status)
    remote <<'EOF'
cd /opt/projects/anchoriq-website && echo "site -> $(readlink site)" && tail -n 10 releases.log 2>/dev/null || true
EOF
    exit 0 ;;
  --rollback)
    prev=$(remote <<'EOF'
cd /opt/projects/anchoriq-website
cur=$(basename "$(readlink site)")
awk '$3 == "deploy" {print $2}' releases.log | grep -vx "$cur" | tail -n 1
EOF
)
    [ -n "$prev" ] || { echo "no earlier release to roll back to"; exit 1; }
    printf '%s' "$REMOTE_SWITCH" | ssh -o BatchMode=yes "$HOST" sh -s -- "$prev" rollback
    exit 0 ;;
esac

SHA=${1:-}
echo "$SHA" | grep -Eq '^[0-9a-f]{40}$' || { echo "usage: sh deploy/release.sh <full sha> | --rollback | --status"; exit 2; }

# 1. CI passed for exactly this commit: the site, stack and secrets jobs, all successful.
runs=$(gh api "repos/$REPO/commits/$SHA/check-runs" --jq '[.check_runs[] | select(.app.slug == "github-actions") | "\(.name)=\(.conclusion)"] | sort | join(" ")')
for job in secrets site stack; do
  echo "$runs" | tr ' ' '\n' | grep -qx "$job=success" || { echo "CI job '$job' has not passed for $SHA (got: ${runs:-none})"; exit 1; }
done
echo "CI passed for $SHA: $runs"

# 2. Release check on exactly that commit (includes: no unfinished policy text).
T=$(mktemp -d); trap 'rm -rf "$T"' EXIT
git archive "$SHA" | tar -x -C "$T"
(cd "$T" && node tools/ci-site-check.mjs --release)

# 3. Upload the commit as a new release directory, then switch to it (configs must match the installed copies).
git archive "$SHA" | ssh -o BatchMode=yes "$HOST" "set -e; d=$DIR/releases/$SHA; mkdir -p \$d; tar -x -C \$d; rm -rf \$d/.github \$d/tools/local-email-test.sh"
printf '%s' "$REMOTE_SWITCH" | ssh -o BatchMode=yes "$HOST" sh -s -- "$SHA" deploy
