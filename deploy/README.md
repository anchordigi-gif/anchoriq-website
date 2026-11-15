# Publishing anchoriq.io on the existing Hostinger VPS (prepared, NOT applied)

Target: the VPS that already hosts private staging (Hostinger KVM 4, Mumbai, India; `srv2156868`, 189.72.152.35).
The website is a separate project. It shares only the edge, which routes TLS by name and holds no keys.
**app.anchoriq.io and staging stay private:** the edge has no public entry for app.anchoriq.io (its connections are
dropped) and staging stays on the loopback-only port 8443.

Tested locally with `sh deploy/test/run.sh`: 36 checks; the same test runs in CI (`stack` job), using Docker, the real proposed configs and a self-signed certificate.

## Settings for this release

| Setting | Value | Where |
|---|---|---|
| Who can read enquiries | **Owner only**, over the existing key-only root SSH (`ssh anchoriq-vps`). There is no web page, API or export endpoint for enquiries. | Docker volume `anchoriq_website_enquiries` (root-only on the host); project directory `chmod 700`, owned by root. The `deploy` and `agents` users get no access. |
| Demo and waitlist submissions | **Open.** Saved, and emailed to hello@anchordigi.com. To close them later: `FORMS_OPEN: '0'` plus `python3 tools/enquiries-mode.py closed` (keep both the same). | `FORMS_OPEN: '1'` in `deploy/compose.yaml`; browser switch `assets/site-config.js` |
| Email notifications | **On**, through the existing Hostinger Email (`smtp.hostinger.com:465`, mailbox hello@anchordigi.com, DKIM already set up; no DNS change). Subjects "AnchorIQ — New demo request" / "AnchorIQ — New trial waitlist signup", Reply-To the visitor. A failed email keeps the enquiry and is listed by `enquiries.mjs unnotified` and in the daily job's journal; `notify-retry` resends. Inbox delivery of both subjects confirmed by the owner on 15 Nov. | `./secrets/smtp.env` (root, 600, never in Git); `forms` on `[internal, egress]` for SMTP only |
| Google Tag Manager / analytics | **Off.** No tag in any page, and the CSP blocks third-party scripts. | `deploy/csp.conf` (`script-src 'self'`) |
| Enquiry retention | **365 days** (12 months) after sending, then deleted | `deploy/retention.env` → `ENQUIRY_RETENTION_DAYS=365` |
| Request-log retention | **14 days**: one file per UTC day; files 14 or more days old are deleted | `deploy/retention.env` → `LOG_RETENTION_DAYS=14`; logs written by `deploy/web.nginx.conf` to `./logs/access-YYYY-MM-DD.log` |
| Where client addresses are kept | Only in those daily request-log files. The edge's public log and the containers' logs carry none, and enquiries never store them. | `deploy/edge.nginx.public-website.conf` (`sni_public` format); `deploy/compose.yaml` |
| Retention job | Daily at 03:15 UTC | `deploy/systemd/anchoriq-website-retention.timer` → `deploy/retention.sh` |

### How deletion is verified
- **The job's own record.** Each run prints:
  - "deleted N enquiries older than 365 days";
  - each deleted log file;
  - the remaining counts with the oldest and newest dates per kind.

  To read it: `journalctl -u anchoriq-website-retention --since -2d`.
- **On demand:**
  - `docker compose exec -T forms node /srv/site/server/enquiries.mjs stats`: `oldest` must be within the last 365 days.
  - `ls logs/`: only the last 14 days.
- **Nothing left behind.** The store uses SQLite `secure_delete` plus a WAL checkpoint, so deleted text is overwritten in the database files. To check a deleted address: `docker compose exec -T forms sh -c 'cat /home/node/enquiries.sqlite* | grep -c <address>'` must print 0.
- **Tested:**
  - `node --test server/forms.test.mjs` backdates an enquiry, purges, and searches the raw database bytes. A deliberately weakened store fails this test.
  - `deploy/test/run.sh` runs the real `retention.sh` against the containers. It confirms: 1 enquiry deleted and gone from the files; the 2020 log and the exactly-14-days-old log deleted; today's log kept.

## DNS (Hostinger DNS zone for anchoriq.io): no change is needed to go live

| Record | Today | Change |
|---|---|---|
| `anchoriq.io` A | 189.72.152.35 | none |
| `www.anchoriq.io` CNAME | anchoriq.io | none |
| `app.anchoriq.io` A | 189.72.152.35 | none (stays closed at the edge) |
| AAAA | none | none (the edge listens on IPv4 only) |
| `anchoriq.io` MX | `10 anchoriq.io` (no mail server runs there) | **owner decision**, not changed by this release |
| TXT `google-site-verification=…` | none | after launch, only with owner approval |

## Credentials (kept separate)
- **Website:** only `./secrets/smtp.env` on the server (the hello@anchordigi.com mailbox password). Website CI uses no secrets at all. Releases go through the owner's own SSH key (`deploy/release.sh`).
- **App staging and production:** separate deploy keys and repository secrets (`STAGING_*` and `PRODUCTION_*`) in anchordigi-gif/anchoriq, with separate server approval lists.

**Creating the SMTP file on the server.** The owner runs this over `ssh anchoriq-vps`. The password is typed twice at a hidden prompt and never shown:
```sh
cd /opt/projects/anchoriq-website && install -d -m 700 secrets && umask 077
read -rsp 'Mailbox password for hello@anchordigi.com: ' p; echo; read -rsp 'Again: ' q; echo
p=$(printf '%s' "$p" | sed 's/\$/$$/g')   # Compose reads $$ as a literal $
[ "$p" = "$(printf '%s' "$q" | sed 's/\$/$$/g')" ] && printf 'SMTP_HOST=smtp.hostinger.com\nSMTP_PORT=465\nSMTP_USER=hello@anchordigi.com\nSMTP_PASS=%s\nNOTIFY_FROM=hello@anchordigi.com\nNOTIFY_TO=hello@anchordigi.com\n' "$p" > secrets/smtp.env && echo saved || echo "did not match"; unset p q
```

## Releases (after the one-time setup below)
- **Deploy:** `sh deploy/release.sh <full sha>` (from the owner's Mac). It deploys one commit only if:
  - the `site`, `stack` and `secrets` CI jobs all passed for that exact commit;
  - `tools/ci-site-check.mjs --release` passes on it (no unfinished policy text);
  - its `deploy/` configs match the copies installed on the server.

  It uploads the commit to `releases/<sha>`, switches the `site` link, recreates `web` and `forms`, runs a health check, and logs the release in `releases.log`.
- **Rollback:** `sh deploy/release.sh --rollback` switches back to the previous release.
- **Status:** `--status` shows the current release and the history.

## Server changes, in order (each needs the owner's approval)

1. **Directory:** `install -d -m 700 -o root -g root /opt/projects/anchoriq-website` and `install -d releases`. The first `deploy/release.sh` uploads the approved commit into `releases/<sha>` and points `./site` at it; copy in `deploy/compose.yaml`, `web.nginx.conf`, `csp.conf`, `page-headers.conf`, `retention.env` and `retention.sh`. Then `install -d -o 101 -g 101 -m 750 logs` (the nginx user), and `mkdir letsencrypt acme-webroot`.
2. **Edge network:** `docker network create --internal --subnet 172.30.22.0/24 --ip-range 172.30.22.128/25 edge_anchoriq_website`
3. **Edge:** install `deploy/edge.nginx.public-website.conf` as `/opt/platform/edge/nginx.conf` and `deploy/edge.compose.public-website.yaml` as `/opt/platform/edge/compose.yaml`, then run `docker compose up -d` in `/opt/platform/edge`.
4. **Firewall:** `ufw allow 80/tcp && ufw allow 443/tcp` (today only SSH is open).
5. **First certificate:** in the project directory, `CERT_EMAIL=<owner address> docker compose --profile tools run --rm certbot-issue` (free Let's Encrypt; HTTP-01 for anchoriq.io and www).
6. **Start:** `docker compose up -d`.
   - Check that `curl -sI https://anchoriq.io/` shows the CSP and HSTS headers.
   - Check that `https://www.anchoriq.io/` redirects to the apex.
   - Check that `https://app.anchoriq.io/` does not connect.
7. **Timers:**
   - Copy `deploy/systemd/anchoriq-website-retention.{service,timer}` to `/etc/systemd/system/`, then run `systemctl enable --now anchoriq-website-retention.timer`.
   - Add a renewal timer that runs `docker compose --profile tools run --rm certbot renew --webroot -w /var/www/acme && docker compose exec web nginx -s reload` twice a day.

**Rollback:**
- restore the previous `/opt/platform/edge/nginx.conf` and `compose.yaml`, then run `docker compose up -d` in the edge directory;
- `ufw delete allow 80/tcp; ufw delete allow 443/tcp`;
- `docker compose down` in the project directory.

## Reading enquiries (owner, over SSH)

```sh
ssh anchoriq-vps
cd /opt/projects/anchoriq-website
docker compose exec -T forms node /srv/site/server/enquiries.mjs list demo
docker compose exec -T forms node /srv/site/server/enquiries.mjs list waitlist --since 2026-12-01 --csv > waitlist.csv
docker compose exec -T forms node /srv/site/server/enquiries.mjs stats
docker compose exec -T forms node /srv/site/server/enquiries.mjs unnotified     # emails not delivered
docker compose exec -T forms node /srv/site/server/enquiries.mjs notify-retry   # resend them
```
CSV cells that start with `= + - @` are prefixed with `'`, so spreadsheet apps don't run them as formulas.
