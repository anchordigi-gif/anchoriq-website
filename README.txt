AnchorIQ website: page files
Built 14 November 2026

CONTENTS
  index.html            Homepage (same file as Main.dc.html)
  Main.dc.html          Homepage
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
  About.dc.html         Company and the demo form (About.dc.html#contact)
  Privacy.dc.html       Privacy policy (draft)
  Terms.dc.html         Terms of service (draft)
  support.js            Page runtime. Every page needs it.
  assets/               Logo, screenshots, app screens, video and two script libraries

HOW TO RUN
  Upload the whole folder to any static web host and keep the structure as it is.
  Open index.html through the web address. Opening a file by double click will not work,
  because the pages load their parts over http.
  To test on a computer: run "python3 -m http.server 8000" inside this folder,
  then open http://localhost:8000

WHAT THE PAGES LOAD FROM THE INTERNET
  React and Babel from unpkg.com (requested by support.js)
  The Inter font from Google Fonts
  Google Tag Manager, container GTM-FVTFCL67

BEFORE LAUNCH
  1. Demo form: set FORM_ENDPOINT near the top of the script in Main.dc.html, index.html and
     About.dc.html. Until it is set, the form reports that it could not send.
  2. Homepage security section still carries a "CONFIRM BEFORE LAUNCH" note.
  3. Privacy and Terms are drafts with items marked TO CONFIRM.
  4. Screenshots show sample data.
  5. If you edit Main.dc.html, copy it over index.html again.
