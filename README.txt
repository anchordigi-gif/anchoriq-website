AnchorIQ website (anchoriq.io)
Private repository: anchordigi-gif/anchoriq-website. Separate from the AnchorIQ app (app.anchoriq.io).
Release notes and open decisions: LAUNCH.md. Server setup: deploy/README.md.

CONTENTS
  index.html            Homepage (Main.dc.html is an identical copy; keep both the same)
  Platform.dc.html      Platform overview
  Sales.dc.html         Sales and leads
  Marketing.dc.html     Marketing
  Teams.dc.html         Agents and teams
  Listings.dc.html      Listings and portals
  Executive.dc.html     Executive and reporting
  Solutions.dc.html     Solutions
  Pricing.dc.html       Pricing
  Integrations.dc.html  Integrations
  App.dc.html           Mobile app
  About.dc.html         Company, demo request form and trial waitlist form (About.dc.html#contact)
  Privacy.dc.html       Privacy policy (draft until the bracketed fields are filled)
  Terms.dc.html         Terms of service (draft until the bracketed fields are filled)
  support.js            Page runtime; every page needs it
  assets/               Images, demo screenshots, film, fonts, React (self-hosted) and the enquiry switch
  server/               Form handler: saves demo requests and waitlist signups, emails hello@anchordigi.com
  deploy/               Hostinger VPS files: router, form handler, retention, edge, release and rollback
  tools/                Checks and maintenance scripts (not published)
  legal/                Privacy and Terms drafts as text (single source: tools/legal-drafts.py)

WHAT THE PAGES LOAD
  Everything comes from the site itself: pages, runtime, React, the Inter font, images and the film.
  The pages make no requests to other sites and use no cookies, analytics or tracking tags.

RUN IT LOCALLY (Node 24)
  PORT=8200 STATIC_DIR=. node server/forms.mjs
  then open http://127.0.0.1:8200/
  This serves the pages and the form handler from one address with the production security policy.
  Submissions are saved only when FORMS_OPEN=1 is set, and emailed only when SMTP settings are given;
  without them nothing is sent.

ENQUIRIES
  Demo requests: POST /api/forms/demo. Trial waitlist signups: POST /api/forms/waitlist.
  Each saved enquiry is emailed to hello@anchordigi.com through Hostinger Email.
  Subjects: "AnchorIQ — New demo request" and "AnchorIQ — New trial waitlist signup".
  Reply-To is the visitor's email address.
  If an email fails, the enquiry is kept. List the failures with
    node server/enquiries.mjs unnotified
  and resend them with
    node server/enquiries.mjs notify-retry
  Open or close the forms with both switches, set to the same value:
    python3 tools/enquiries-mode.py open|closed   (the buttons and forms on the pages)
    FORMS_OPEN '1' or '0' in deploy/compose.yaml  (the server)

CHECKS (CI: .github/workflows/verify.yml, on pull requests and pushes to main; no secrets)
  node --test server/forms.test.mjs   form handler, rate limits, honeypot, retention, email
  node tools/ci-site-check.mjs        links, assets, sitemap, pricing, enquiry switch, security rules
  sh tools/ci-e2e.sh                  real browser: every page, pricing, both forms, delivery to a
                                      local test mail server (needs Playwright: npm ci)
  sh deploy/test/run.sh               the VPS setup in Docker, including retention
  CI also scans the history and files for secrets.

RELEASE AND ROLLBACK (owner only; see deploy/README.md for the one-time server setup)
  sh deploy/release.sh <full commit SHA>
    Deploys one commit, and only if all three CI jobs (site, stack, secrets) passed for that exact
    commit and the Privacy and Terms pages have no unfinished fields.
  sh deploy/release.sh --rollback     back to the previous release
  sh deploy/release.sh --status       current release and history

NOTES
  Screenshots and the film use fictional demo data.
  After editing Main.dc.html or index.html, copy it over the other one; the checks fail if they differ.
  Never commit SMTP settings, passwords or enquiry data. On the server they live in deploy/secrets/,
  which Git ignores.
