# anchoriq.io launch notes

Static marketing site with its own form handler, separate from app.anchoriq.io (own repo, own VPS project, no shared code, cookies or data).
**Local preview:** `PORT=8200 STATIC_DIR=. node server/forms.mjs`, then http://127.0.0.1:8200/. The site and the forms are served from one origin with the production CSP.
**Final local QA:** 15 November 2026, on the commit recorded in `docs/AnchorIQ_Project_Memory.md` (app repo).

## Forms-enabled release (16 Nov), supersedes the marketing-only release
- **What changed:** demo requests and 7-day trial waitlist signups are open. They are saved, then emailed to hello@anchordigi.com. The release commit is recorded in `docs/AnchorIQ_Project_Memory.md` (app repo).
- **Browser:** `assets/site-config.js` says open. Labels: "Book a demo", "Join the 7-day trial waitlist", "Talk to sales".
- **Server:** `FORMS_OPEN: '1'` in `deploy/compose.yaml`. `forms` is on `[internal, egress]` for SMTP only.
- **Closing again** takes both: `python3 tools/enquiries-mode.py closed` and `FORMS_OPEN: '0'`. CI checks the opposite mode on every run.
- **Fixed during this work:** the homepage and About never loaded `site-config.js`, so the open mode could not have worked there. The site check now requires the tag on every page; it was checked to fail on the old pages.
- **Added:** a tab icon (`assets/icon-64.png`, the approved AnchorIQ brand-kit icon). Without it every first visit asked for `/favicon.ico` and got a 404.

### Inbox delivery with the real mail service (15 Nov): **confirmed by the owner**
- **Setup:** existing Hostinger Email (`smtp.hostinger.com:465`, mailbox hello@anchordigi.com).
  - The password was entered at a hidden prompt into a 600 file outside both repos. It was never in chat, logs or Git.
  - Sent from a local open copy (`tools/local-email-test.sh`, port 8202).
- **Demo request #1** "SYNTHETIC TEST - demo request" (Reply-To synthetic-demo@example.test):
  - the first attempt got `535 Authentication failed`;
  - the enquiry was kept, and the failure was recorded and listed by `unnotified`;
  - it was then delivered with `notify-retry`.
- **Trial waitlist #2** "SYNTHETIC TEST - trial waitlist" (Reply-To synthetic-waitlist@example.test): delivered first time.
- **Result:** both arrived at hello@anchordigi.com, and the owner confirmed the subjects ("AnchorIQ — New demo request" / "AnchorIQ — New trial waitlist signup"), details and Reply-To are correct.
- **Note:** the cause of the first `535` is not proven. The same in-memory password later worked, so it looks like a one-off refusal by Hostinger.

### Correction: CSP console messages
- **What happens:** every page logs "Executing inline event handler violates … script-src-attr". So do some charts, with `<path> attribute d … "{{areaD}}"`.
- **Cause:** the page runtime parses the template markup (`onclick="{{binding}}"` placeholders) with `innerHTML`, and the browser refuses to compile those placeholders. They are never code, and every button, toggle and form works.
- **Earlier reports were wrong:** they said "no CSP violations"; the console reader used then did not surface these.
- **How CI handles it now:**
  - the static check fails on any `on…=` value that is not a `{{binding}}` (checked with a planted `onclick="alert(1)"`);
  - the browser check ignores only these placeholder messages and fails on every other console error or CSP violation.

## GitHub and CI result (16 Nov)
- **Repository:** `anchordigi-gif/anchoriq-website`, verified **private**, owned by anchordigi-gif (personal account).
- **What was pushed:** a clean single-commit history, `main` = **`b994c4aa26c338a270eb2f676d232d9387aea9ee`**, whose file tree is identical to local `9694b57`. The local development history (8 commits) stays local only.
- **Checked before the push:** that exact commit had no credentials (gitleaks), no enquiry data or credential files, and none of the 24 superseded assets.
  - Flagged for a follow-up PR: `README.txt` is the original ZIP's notes (it mentions unpkg and GTM-FVTFCL67). It is not served, and contains no secret.
- **CI run:** https://github.com/anchordigi-gif/anchoriq-website/actions/runs/43704649120 (event `push`, head SHA `b994c4a…`), **success**.
  - **`site`:**
    - 13 unit tests;
    - static checks (15 pages, 614 links, 312 asset references, 14 sitemap URLs);
    - browser checks in open mode (28 page views, pricing, demo, waitlist and homepage forms, 3 emails delivered to the Mailpit test server);
    - the closed-mode round trip (28 page views, no forms, server 503).
  - **`stack`:** 36/36 Docker checks.
  - **`secrets`:** no leaks in history or tree; no data or credential files tracked.
  - **Not used in CI:** SMTP credentials and the real mailbox.
- **Deployable commit:** `deploy/release.sh` accepts `b994c4a` only once the policy fields are filled; it will refuse until then.

## CI and releases
- **Workflow:** `.github/workflows/verify.yml` runs on pull requests and on pushes to main, with no secrets.
  - **`site`:**
    - unit tests;
    - static checks (links, assets, sitemap, pricing, enquiry mode, CSP rules, content);
    - Playwright 1.64.1 from the lockfile, covering every page at 1440 and 390, pricing and the calculator, and the demo, waitlist and homepage forms;
    - delivery to a Mailpit test server (3 emails to hello@anchordigi.com, both subjects, Reply-To);
    - the opposite enquiry mode.
  - **`stack`:** the Docker test of the VPS setup (`deploy/test/run.sh`).
  - **`secrets`:** gitleaks over history and tree, plus no tracked enquiry or credential files.
- **Releases:** `deploy/release.sh <sha>` (owner, manual) deploys only a commit whose three CI jobs passed and which passes `ci-site-check --release`. `--rollback` switches back.
- **Local results (15–16 Nov):**
  - **Unit tests:** 13 pass.
  - **Site check:** passes.
  - **Browser checks with Mailpit:** pass (28 page views, pricing, 3 forms, 3 emails).
  - **Docker stack:** 36 checks pass (run before the open switch; to be rerun on the release commit).
  - **Gitleaks:** no leaks in history or tree.
  - **Not yet run:** CI on GitHub, since the repository does not exist yet.

## Release settings
- **GTM and analytics:** off. No tag or placeholder in any page, and the CSP allows only same-origin scripts.
- **Email notifications:** on, to hello@anchordigi.com (see above).
- **Enquiry access:** owner only, over the existing key-only root SSH. There is no web, API or export endpoint (`deploy/README.md`).
- **Retention:**
  - enquiries 365 days (`ENQUIRY_RETENTION_DAYS`);
  - request logs 14 days (`LOG_RETENTION_DAYS`).
  - Both are set in `deploy/retention.env`; the daily job is `deploy/retention.sh` via the systemd timer.
  - Deletion is verified as described in `deploy/README.md` → "How deletion is verified".
- **app.anchoriq.io and staging:** private. The edge has no public entry for app.anchoriq.io, and staging stays on loopback port 8443.

## Images and video (all company-specific data removed)

| Asset | Was | Now |
|---|---|---|
| 11 dashboard screenshots (`assets/demo/*.jpg`, 2000×1333) | "Dubai" workspace, real Dubai places, Meta, Google Ads, Property Finder, Bayut, Goyzer | Captured from the fictional demo (Harbourline Realty, signed in as `demo-admin`) at the same size; no flagged word appears in any captured page's text |
| Insights composite (`assets/demo/insights-panel.jpg`, 784×1920) | "Dubai · Marketing analytics", Meta | The demo's Insights page at phone size (AI summary, anomaly alerts, follow-up priorities); alt text updated |
| 10 mobile-app mockups (`assets/demo/app-*.jpg`, 640×1385) | Dubai, Palm Jumeirah, Dubai Marina, Golden Mile, Frond E, Property Finder, Bayut, WhatsApp, Meta | Same design; only the flagged words were replaced, using the demo's fictional names (Marina, Lighthouse Bay, Kings Wharf, Harbour Point, Cedar Park, HomeFinder, Nestly) in Inter at the measured size, weight and colour. Tool: `tools/retext-mockups.py`. The demo has no native-app screens, so recapturing would have changed the design. |
| 2 mockups (Get the app, Forecast), the wave image and the logo | none flagged | unchanged |
| Product film (`assets/demo/product-film.mp4`, 30 s, 1920×1080) | Dubai, Bayut, Downtown Dubai, Meta, Google Ads, Snapchat, LinkedIn, TikTok in the dashboard footage | Kept the original logo intro (0–3.25 s), logo outro (25–30 s) and music. The middle is rebuilt from demo captures (Overview, Funnel, Marketing analytics, Insights, Heatmaps) with the same chapter and caption pills. |
| Video poster | the same flagged Overview | Frame from the new film |

**Demo changes (app repo, demo build only):** platform names became categories (Social, Search, Video, Network and Stories Ads; Message; Team chat), and the Dubai illustration labels became fictional places. The production build is unaffected; the demo-isolation test checks this.

**Removed from the site:** the 24 replaced files (11 screenshots, the composite, 10 mockups, the film and its poster). The 6 phone images thought to be unused in the last round are in fact used by the App page; they are now the edited versions.

## Forms (`server/`, Node 24, no dependencies)
- **Endpoints:** `POST /api/forms/demo` and `/api/forms/waitlist`, stored separately. A 201 is sent only after the row is committed.
- **Bot protection:** server-side validation, a honeypot field, and rate limits in both nginx and the handler.
- **Privacy:** no IP address is stored with an enquiry.
- **Deletion:** `PRAGMA secure_delete=ON` plus a WAL checkpoint on purge, so deleted text is overwritten.
- **Owner commands (over SSH):** `list demo|waitlist [--since] [--csv]`, `stats`, `purge --older-than DAYS`.
- **Tests:**
  - `node --test server/forms.test.mjs`: 9 pass. The retention test fails if `secure_delete` or the checkpoint is removed; checked.
  - `sh deploy/test/run.sh`: 35 Docker checks pass, including running `retention.sh` itself.

## Recheck on the final revision (16 Nov)
- **Pages:** all 14 at 1440 and 390 pass: no horizontal scroll, no broken images or links, no missing labels, one h1 each, and no console errors other than the template-placeholder messages explained under "Correction: CSP console messages".
- **Assets:** all 28 referenced images and the video return 200. The film plays (30 s, 1920×1080).
- **Forms (real clicks):**
  - Pricing → "Join the 7-day trial waitlist" → waitlist form → stored;
  - Sales → "Book a demo" → demo form → stored;
  - both shown by `list … --csv` and `stats`.
- **Pricing (monthly and yearly):** see the table below.
- **Sitemap:** the 14 sitemap URLs equal the 14 canonical URLs.
- **Text scan:** no platform names, Dubai or Palm Jumeirah, GTM, unpkg or Google Fonts anywhere in the site files.

| | Starter | Professional | Enterprise |
|---|---|---|---|
| Month / Year | AED 499 / 4,990 | AED 1,499 / 14,990 | From AED 3,999 / 39,990 |
| Seats / extra seat, month (year) | 5 / AED 149 (1,490) | 20 / AED 119 (1,190) | 50 / from AED 99 (990) |
| Connections | 3 | 5 | 6, more by quote |
| Onboarding | AED 5,000 | AED 8,000 | Quoted separately |

## Email notifications
- **Delivery:** to hello@anchordigi.com through the existing Hostinger Email (no DNS change). Inbox delivery was confirmed on 15 Nov (see above).
- **Behaviour:** the visitor sees "Request received" once the enquiry is saved; the email follows. A failed email keeps the enquiry; it is listed by `unnotified` and in the daily job's journal, and `notify-retry` resends.
- **Tests:** 13 unit tests, including a fake SMTP server, header injection and STARTTLS required; the CI browser check against Mailpit.

## Privacy and Terms (drafts; exact text in `legal/privacy-draft.md` and `legal/terms-draft.md`, single source `tools/legal-drafts.py`)
**Unfinished: must be completed before publishing (the pages show these brackets publicly today).** Fields to fill: `[COMPANY LEGAL NAME]`, `[REGISTERED ADDRESS]`, `[REGISTRATION NUMBER]`, `[CONTACT EMAIL]`, `[RESPONSE TIME]`, `[EFFECTIVE DATE]`.

**To confirm:**
- the Hostinger contracting entity and data terms (the Mumbai hosting is stated);
- the legal basis for storing data in India;
- the applicable data-protection laws and rights;
- the customer data-processing terms and the customer agreement name;
- limitation of liability;
- governing law and courts;
- the Hostinger Email data location and terms (the notification emails);
- how notification emails are deleted from the mailbox after 12 months.

## Earlier QA (still valid)
**Owner's 20-point checklist:** 13 Pass, 2 Fixed, 3 N/A, 1 Warn (line length), 1 Not adopted (OKLCH).

**Labels:**
- connector copy by category, with Planned and Demo preview badges;
- the marketplace lists 20 categories, all Planned.

## Owner approvals before publishing
See `deploy/README.md` and the approval checklist in the 15–16 Nov project memory entry.
