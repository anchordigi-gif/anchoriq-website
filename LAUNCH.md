# anchoriq.io launch notes

Static marketing site with its own form handler, separate from app.anchoriq.io (own repo, own VPS project, no shared code, cookies or data).
**Local preview:** `PORT=8200 STATIC_DIR=. node server/forms.mjs`, then http://127.0.0.1:8200/. The site and the forms are served from one origin with the production CSP.
**Final local QA:** 15 November 2026, on the commit recorded in `docs/AnchorIQ_Project_Memory.md` (app repo).

## Type scale, hero and logo update (16 Nov 2026), awaiting owner approval before release
**Source:** the owner's new design-tool export (`~/Downloads/anchoriq-website.zip`, built 16 Nov). It was used as a reference only: its `support.js` is not used, and the current renderer, release process, privacy notice and closed forms are kept.

**How it was applied:** every line the export changed (old export to new) was ported onto the current templates where that line still existed. If our text had changed since, only the changed opening tag was ported. Replacements were simultaneous, with no chained edits.
- **Check:** the computed typography of every element with the same text matches the new export on 11 of 12 shared pages. The homepage differs only where intended.

**Homepage hero:** "Your entire BUSINESS." / "One INTELLIGENT view.", with light text, bold uppercase gradient words, the dotted wave and buttons in one row.
- **Kept from the approved design:** the hero paragraph (19–23 px), which the export had moved and shrunk, and the closed "Demos open soon" button.

**Owner type targets, checked in the browser on all pages at 1440, 1024, 768, 390 and 360 px:**
- **Inner-page h1:** 68 px at 1440. The export's 28 px phone minimum is kept.
- **h2:** at most 34 px. The export only capped homepage headings; inner pages had 44 px.
- **h3:** 18–24 px. The export had 16 and 29 px.
- **Inner-page intro:** 16 px.
- **Text:** body 14–15 px; nothing visible under 13 px (the homepage chart's 12 px labels became 13 px).
- **Inputs:** 16 px.
- **Logo:** 160 px desktop, 128 px at 520 px and narrower, 190 px footer, all from the existing 960×162 PNG.
- **Layout:** no horizontal overflow and no header overlap at any of those widths.

**Hero checks:**
- Each headline line stays on one row at 1024–1920 px.
- Fully legible with reduced motion, and with WebGL off (the fallback image shows).
- "Explore the platform" still jumps to `#journey`.

## Homepage AI Insights section fix (15 Nov 2026), section #ai "This is the panel in the dashboard."
**Panel restored:** the approved AI insights panel from the original ZIP is back, replacing the phone Insights screenshot (`insights-panel.jpg`, still used on Platform). It is now `assets/demo/ai-insights-panel.jpg`, 784×1920 like the original.
- **Fictional names:** two lines were re-set in the image's own font (Inter 12/13 px at 2×, calibrated against the original until the re-rendered original wording matched): "Dubai" became "Bayside", and "Meta spend grew" became "Social spend grew". Every other pixel of the original is unchanged.
- **Layout:** the markup, figure size, column widths and centring are exactly the original's. At 1440 px the figure is 438 px and the copy column 714 px.

**Copy beside the panel:**
- **Entrance:** same as the original (fade and 24 px rise, once, when 15% of the block is in view).
- **Trigger:** it now starts from the scroll position (`data-rv-sync`, `initCopySync` in `assets/pages/index.js`) instead of an IntersectionObserver callback, so it keeps pace with the scroll-linked panel.
- **Jumps:** if you jump past the block, it shows at once.
- **Rows:** their hover highlight is held off while the page scrolls. The live site lit up rows under a resting pointer on 17 frames of a slow scroll; now it lights none.
- **Checked:** reduced motion keeps the heading and four lines visible. A frame-by-frame wheel test in Chromium and WebKit at 1440, 1024, 768 and 390 px found no flicker, layout jump, clipping or horizontal overflow.

## LIVE: https://anchoriq.io (15 Nov 2026)
**Release:**
- First deployed commit: `9e0f3010e4768effe8ddb43990e43024b5143f70`, with CI run [43715051884](https://github.com/anchordigi-gif/anchoriq-website/actions/runs/43715051884) successful.
- That commit was released with `deploy/release.sh` after the one-time server setup in `deploy/README.md`.
- This docs-only follow-up commit is then released the same way. `docs/AnchorIQ_Project_Memory.md` (app repo) records the final deployed SHA and its run.

**Owner approvals (15 Nov):**
- **Launch:** publish the marketing-only site with www redirecting to the apex.
- **Notice:** the privacy notice wording, published as `Notice.dc.html` and linked in every footer. The owner signed off on:
  - Anchor Digital as the named operator, with the registered details to be added later by the owner;
  - no legal-basis statement for now;
  - the Mumbai disclosure as sufficient for launch.
- **IPv6:** serve IPv6 (DNS has an AAAA record for the VPS).

**Verified live:**
- **HTTPS:** HTTP/2 200 over IPv4 and IPv6, with a Let's Encrypt certificate for anchoriq.io and www.anchoriq.io (expires 13 Feb 2027, renewal timer installed, dry run passed).
- **Redirects:** `https://www.` and `http://` answer 301 to `https://anchoriq.io/…`.
- **Headers:** CSP `script-src 'self'`, HSTS, nosniff, referrer and permissions policies.
- **Pages:** all 14 pages, the assets, `robots.txt` and the sitemap (13 URLs, including the notice) answer 200.
- **Blocked paths:** Privacy, Terms, `legal/drafts/`, `support.js`, the repo files and `.git` answer 404.
- **Closed forms:** `POST /api/forms/{demo,waitlist}` answers 503, and health reports `open: false`. The About page has no form fields and shows the closed message.
- **CI browser check run against the live site:** passed (26 page views, pricing toggle and prices, forms closed). It saw no console errors and no third-party requests. The notice text matches the approved wording, with no brackets.
- **Rate limit:** still applies per IPv4 client (a 220-request burst got 57 × 429).
- **Kept private:** app.anchoriq.io gets no connection (80 and 443), port 8443 is closed from outside, and staging works only through the SSH tunnel.

**Server changes (all reversible, see the rollback in `deploy/README.md`):**
- created `/opt/projects/anchoriq-website`, with `.env` (CERT_EMAIL only);
- created the network `edge_anchoriq_website`;
- installed the public edge config (the previous one is kept as `/opt/platform/edge/*.pre-website`);
- `ufw allow 80,443/tcp`;
- the certificate;
- the timers `anchoriq-website-retention` (03:15 UTC daily; first run deleted nothing) and `anchoriq-website-cert-renew`.

**IPv6 note:** IPv6 visitors reach the site through Docker's proxy. Their request-log entries carry the edge's internal 172.19.x address, not theirs, and they are exempt from per-address limits; the edge connection cap still applies.

**Unchanged:**
- no DNS changes; mail DNS and MX untouched;
- GTM off;
- no paid services;
- no SMTP secret on the server (forms closed).

**Left for the owner:**
- the registered company name, address and number, for the notice and later the full policies;
- the remaining policy CONFIRM items before forms open.

## Marketing-only public release (15 Nov 2026), supersedes the forms-enabled release below
**Status:** live (above). The runtime blocker is resolved (see "Design-tool runtime removed").
**Why:** the Privacy and Terms pages still have unfinished fields, so the forms stay closed and the drafts are off the public site.
- **Forms closed in both places:** `assets/site-config.js` says closed (`tools/enquiries-mode.py closed`), and `FORMS_OPEN: '0'` in `deploy/compose.yaml` (every POST answers 503, nothing stored). The stack test checks that the release Compose file ships closed.
- **Policy drafts unpublished:** `python3 tools/policy-pages.py unpublish` moved `Privacy.dc.html` and `Terms.dc.html` to `legal/drafts/`. That path is not served: nginx allows top-level pages only, and `/legal/...` answers 404. It also removed the footer links, the form sentences and the two sitemap entries. `legal/drafts/policy-links.json` records what was removed. Once the bracketed fields are filled, `python3 tools/policy-pages.py publish` restores all of it exactly; that round trip was tested on a copy. `tools/legal-drafts.py` still writes the drafts in either place.
- **Release gate:** `ci-site-check --release` now reads policy fields only from published pages. It fails if any page links to an unpublished policy, and it fails if enquiries are open without a published Privacy page. To open the forms later, in this order: fill the fields, `policy-pages.py publish`, `enquiries-mode.py open`, `FORMS_OPEN: '1'`. CI runs this round trip on every commit.

### Audit (4 viewports: 1440, 1024, 768, 390; axe-core 4.10.3, Playwright 1.64.1, local preview with the production CSP)
**Fixed (all pages; the design is unchanged):**
- **Video:** the homepage film had no playback controls. The runtime dropped the empty `controls` attribute; it is now `controls="controls"`.
- **Diagrams:** the 8 sideways-scrolling diagrams (Executive, App, Marketing, Sales, Integrations, Listings, Platform, Teams) could not be reached by keyboard. They are now focusable labelled regions with a visible focus ring.
- **Form fields:** they had no visible keyboard focus (outline none). They now get a 2px ring on `:focus-visible` only.
- **Touch targets (touch screens only, `pointer: coarse`):** the header button is 44px. Nav, footer, phone, tab and period links have larger invisible hit areas, verified with `elementFromPoint` just outside each box. Mouse layouts are unchanged.
- **Phone link in the closed-forms notice:** it is now underlined. It was distinguishable from the surrounding text by colour alone (2.5:1).
- **Notices:** added `assets/THIRD-PARTY-NOTICES.txt`, covering three.js r160 (MIT), anime.js 4.5.0 (MIT), React and React DOM 18.3.1 (MIT) and Inter (OFL 1.1), with the MIT text.
- **Before-and-after screenshots:** video, footer, tablet header and tablet diagram, kept with the session's QA files. They are not committed.

**Passed with no change needed:**
- no layout shift above 0.05, no console errors, no horizontal overflow, no broken images, one h1 per page;
- skip link and visible focus on every Tab stop;
- mobile menu: Enter opens, Escape closes and returns focus, rapid taps;
- pricing toggle: Space, and 30 rapid clicks end on the last choice;
- calculator, with rapid plan changes and arrow keys;
- FAQs and gallery under rapid clicks;
- reduced motion: all text visible, no infinite animations, canvases static.

**Prices verified:**
- Starter AED 499/month or AED 4,990/year;
- Professional AED 1,499/month or AED 14,990/year;
- Enterprise from AED 3,999/month or AED 39,990/year;
- onboarding AED 5,000 for Starter and AED 8,000 for Professional;
- seat rates and connection allowances: `ci-site-check` and the browser check.

**Not issues:**
- the hero figcaption contrast result is measured mid-fade; the final colour #9A9CA5 is about 7.4:1;
- the CTA test flags "Sales and leads", which is a page link, not a call to action.

**Third-party requests:** none. Every page loads only same-origin files (checked in CI and in the audit).

### Hosted CI (15 Nov)
- `b8d1d86`: run [43709906647](https://github.com/anchordigi-gif/anchoriq-website/actions/runs/43709906647) **failed** in one step. The opposite-mode round trip opened the forms without publishing the policy pages, and the new gate rejected it, which is correct.
- Fixed in `4f09f8f` (publish first, then open). Run [43710316163](https://github.com/anchordigi-gif/anchoriq-website/actions/runs/43710316163): **success** on `4f09f8fa4db009a388402377ea6563c3c6c1d131` (site, stack 36/36, secrets).
- This note is a docs-only commit after that. Its own run is recorded in `docs/AnchorIQ_Project_Memory.md` (app repo).
- **Not deployed:** the site is not published, VPS, DNS, MX, GTM and billing are unchanged, and app.anchoriq.io and staging are still private.

### Design-tool runtime removed (15 Nov): `support.js` is no longer shipped
**Licence check:** I found no explicit permission to redistribute the generated runtime.
- Anthropic's Claude Design help pages ([Get started](https://support.claude.com/en/articles/14604416-get-started-with-claude-design), [Move from standalone Claude Design](https://support.claude.com/en/articles/17440474-move-from-standalone-claude-design-to-claude)) list the export options, including standalone HTML and sending to Netlify or Vercel.
- None of those pages addresses redistributing `support.js`, and the file itself carries no licence.
- So the pages were rebuilt so that the runtime is not needed.

**What replaced it:**
- **Templates:** each page keeps its approved template, now in an inert `<template id="page-template">`. Event bindings are spelled `data-on-<event>="{{fn}}"`.
- **Page logic:** each page's own logic (the design's component code, unchanged) moved to `assets/pages/<page>.js`.
- **Renderer:** `assets/page.js` (about 150 lines, written for this site) renders the template with React 18.3.1 (MIT, self-hosted). `support.js` and `assets/vendor/resources.js` are deleted.
- **CSP:** `'unsafe-eval'` is dropped; it is now `script-src 'self'`.
- **CI:** it no longer needs to ignore template console errors, and any console error fails.

**Same design, verified:**
- **Screenshots:** 14 pages × 4 viewports (1440, 1024, 768, 390), full page, reduced motion, canvases masked. 55 of 56 are pixel-identical.
- **Rendered DOM:** identical on all 14 pages. The only differences are the old runtime's `<span class="sc-interp">` wrappers and `playsinline=""`.
- **Homepage gauge:** it now shows **"11.8%"**. The old runtime put an HTML `<span>` inside an SVG `<text>`, so browsers drew only "%". This is the one visible change; it matches the template.
- **Retested:**
  - keyboard and visible focus;
  - skip link;
  - mobile menu, including Escape and rapid taps;
  - pricing toggle (30 rapid clicks) and calculator;
  - FAQs and gallery;
  - video controls;
  - reduced motion;
  - the axe audit at 4 viewports;
  - links and sitemap;
  - e2e in both enquiry modes, including real submissions in open mode;
  - the stack test (36/36).
- **Console errors:** none on any page or viewport. Before the rebuild there were 2,144 (the template placeholders).
- **Switch round trip:** `enquiries-mode.py` (now also covering `assets/pages/*.js`) and `policy-pages.py` restore the files byte for byte.

### Privacy notice for the request logs (approved and published 15 Nov as `Notice.dc.html`)
**Draft:** `legal/drafts/Notice.dc.html`, titled "Privacy notice". It is not served. It describes:
- what the request log records: IP address, time, path without query string, status and response time; no user agent, referrer or cookies;
- the rare crit-level server errors that can include an IP address, kept in a fixed-size rotating log;
- the purpose (security and operation);
- 14-day deletion;
- Hostinger, Mumbai, India;
- no cookies, tracking or third-party requests;
- closed forms and the phone contact.

**Publishing it:**
1. Move it to the site root.
2. Add a footer link "Privacy notice" and a sitemap entry.
3. Run the checks.
4. Run CI on that commit.
5. Release.

**When the full Privacy policy is published:** retire this notice.

## Forms-enabled release (16 Nov), now superseded by the marketing-only release above
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
**Unfinished: must be completed before publishing. The pages are unpublished (`legal/drafts/`) until then.** Fields to fill: `[COMPANY LEGAL NAME]`, `[REGISTERED ADDRESS]`, `[REGISTRATION NUMBER]`, `[CONTACT EMAIL]`, `[RESPONSE TIME]`, `[EFFECTIVE DATE]`.

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
