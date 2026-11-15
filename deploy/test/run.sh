#!/bin/sh
# Local end-to-end test of the proposed VPS setup (Docker). Nothing leaves this machine.
set -eu
cd "$(dirname "$0")/.."
P="env CERT_EMAIL=unused@example.test docker compose -p aiq-website-test -f compose.yaml -f test/compose.test.yaml"
C=test/letsencrypt/live/anchoriq.io
mkdir -p "$C"
openssl req -x509 -newkey ec -pkeyopt ec_paramgen_curve:prime256v1 -nodes -days 2 -subj /CN=anchoriq.io \
  -addext "subjectAltName=DNS:anchoriq.io,DNS:www.anchoriq.io" -keyout "$C/privkey.pem" -out "$C/fullchain.pem" 2>/dev/null
chmod 644 "$C/privkey.pem"
mkdir -p test/logs && chmod 777 test/logs
cleanup() { $P down -v --remove-orphans >/dev/null 2>&1 || true; rm -rf test/letsencrypt test/logs; }
trap cleanup EXIT
$P up -d --wait >/dev/null
ok=0; bad=0
check() { if [ "$2" = "$3" ]; then ok=$((ok+1)); echo "pass  $1"; else bad=$((bad+1)); echo "FAIL  $1: expected $3, got $2"; fi; }
H="--resolve anchoriq.io:9443:127.0.0.1 --resolve www.anchoriq.io:9443:127.0.0.1 --resolve app.anchoriq.io:9443:127.0.0.1 --cacert $C/fullchain.pem -s"
code() { curl $H -o /dev/null -w '%{http_code}' "$@"; }
check "release compose ships closed" "$(env CERT_EMAIL=x@example.test docker compose -f compose.yaml config 2>/dev/null | grep -c "FORMS_OPEN: \"0\"")" 1
check "home page"                  "$(code https://anchoriq.io:9443/)" 200
check "a page"                     "$(code https://anchoriq.io:9443/Pricing.dc.html)" 200
check "asset"                      "$(code https://anchoriq.io:9443/assets/vendor/react.production.min.js)" 200
check "sitemap"                    "$(code https://anchoriq.io:9443/sitemap.xml)" 200
for p in /LAUNCH.md /server/forms.mjs /deploy/compose.yaml /tools/copy-planned.py /.git/config /.gitignore /data/enquiries.sqlite /README.txt; do
  check "private $p is 404"        "$(code https://anchoriq.io:9443$p)" 404
done
hdr=$(curl $H -D - -o /dev/null https://anchoriq.io:9443/)
check "CSP header"                 "$(echo "$hdr" | grep -ci "^content-security-policy: default-src 'self'; script-src 'self' 'unsafe-eval'")" 1
check "HSTS header"                "$(echo "$hdr" | grep -ci '^strict-transport-security: max-age=31536000')" 1
check "www redirects to apex"      "$(curl $H -o /dev/null -w '%{http_code} %{redirect_url}' https://www.anchoriq.io:9443/Pricing.dc.html)" "301 https://anchoriq.io/Pricing.dc.html"
check "http redirects to https"    "$(curl -s -o /dev/null -w '%{http_code} %{redirect_url}' -H 'Host: anchoriq.io' http://127.0.0.1:9080/About.dc.html)" "301 https://anchoriq.io/About.dc.html"
check "app.anchoriq.io stays closed" "$(curl $H -o /dev/null -w '%{http_code}' https://app.anchoriq.io:9443/ 2>/dev/null || echo closed)" "000closed"
J='{"name":"Test Person","email":"test@example.test","company":"Example Co","industry":"Other","website":""}'
post() { curl $H -o /dev/null -w '%{http_code}' -H 'content-type: application/json' -d "$2" "https://anchoriq.io:9443/api/forms/$1"; }
check "demo request stored"        "$(post demo "$J")" 201
check "waitlist signup stored"     "$(post waitlist "$J")" 201
check "honeypot rejected"          "$(post demo '{"name":"Bot","email":"b@example.test","company":"B","industry":"Other","website":"x"}')" 400
check "invalid rejected"           "$(post demo '{"name":"","email":"x"}')" 422
check "unknown form path is 404"   "$(post other "$J")" 404
codes=""; for i in 1 2 3 4 5 6 7 8; do codes="$codes $(post demo "$J")"; done
check "rate limit reaches 429"     "$(echo "$codes" | grep -c 429)" 1
check "demo rows retrievable"      "$($P exec -T forms node /srv/site/server/enquiries.mjs list demo | grep -c '"email": "test@example.test"' | awk '{print ($1>=1)?"yes":"no"}')" yes
check "waitlist rows retrievable"  "$($P exec -T forms node /srv/site/server/enquiries.mjs list waitlist --csv | tail -n +2 | wc -l | tr -d ' ')" 1
check "honeypot row not stored"    "$($P exec -T forms node /srv/site/server/enquiries.mjs list demo | grep -c '"name": "Bot"')" 0
today=$(date -u +%F)
check "request log written for today"  "$(test -s test/logs/access-$today.log && echo yes || echo no)" yes
check "request log holds client, not edge" "$(grep -c '^172.30.22.2 ' test/logs/access-$today.log)" 0
check "edge logged site connections"  "$($P logs edge 2>/dev/null | grep -c " anchoriq.io " | awk '{print ($1>0)?"yes":"no"}')" yes
check "edge log has no client address" "$($P logs edge 2>/dev/null | grep -cE '^[^|]*\| [0-9]+\.[0-9]+\.[0-9]+\.[0-9]+ \[')" 0
# retention: a request log from 2020 and one exactly 14 days old are deleted; today's is kept
touch test/logs/access-2020-01-01.log
d14=$($P exec -T forms node -e "console.log(new Date(Date.now()-14*864e5).toISOString().slice(0,10))"); touch "test/logs/access-$d14.log"
$P exec -T forms node -e "const {DatabaseSync}=require('node:sqlite');const d=new DatabaseSync('/home/node/enquiries.sqlite');d.prepare(\"INSERT INTO enquiries (kind,created_at,name,email,company,industry) VALUES ('demo','2024-01-01T00:00:00Z','Old','expired@example.test','C','Other')\").run();d.close()"
check "backdated enquiry present before" "$($P exec -T forms sh -c 'cat /home/node/enquiries.sqlite* | grep -c expired@example.test')" 1
out=$(COMPOSE="$P" LOG_DIR=test/logs sh retention.sh)
echo "$out" | sed 's/^/      /'
check "retention deleted 1 enquiry"     "$(echo "$out" | grep -c 'deleted 1 enquiries older than 365 days')" 1
check "deleted enquiry gone from files" "$($P exec -T forms sh -c 'cat /home/node/enquiries.sqlite* | grep -c expired@example.test' || true)" 0
check "old request logs deleted"        "$(ls test/logs | grep -cE 'access-2020-01-01|access-'$d14)" 0
check "today's request log kept"        "$(test -s test/logs/access-$today.log && echo yes || echo no)" yes
echo "$ok passed, $bad failed"
[ "$bad" -eq 0 ]
