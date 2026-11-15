// Browser checks for anchoriq.io against a running local server (node server/forms.mjs with STATIC_DIR=.).
//   BASE_URL=http://127.0.0.1:8300 [MAILPIT_URL=http://127.0.0.1:8025] node tools/ci-browser-check.mjs
// PLAYWRIGHT_MODULE: path or name of the playwright package (CI: playwright@1.64.1). CHROME_CHANNEL=chrome locally.
// Covers: every page at 1440 and 390 (console errors incl. CSP, horizontal overflow, one h1, images), pricing toggle
// and calculator, and the demo/waitlist/homepage forms in whichever mode the site is in (open: submit + Mailpit
// delivery to hello@anchordigi.com with the right subjects and Reply-To; closed: notice, no form, server 503).
import { readFileSync } from 'node:fs';

const BASE = process.env.BASE_URL || 'http://127.0.0.1:8300';
const MAILPIT = process.env.MAILPIT_URL || '';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const OPEN = /AIQ_ENQUIRIES_OPEN = true/.test(readFileSync('assets/site-config.js', 'utf8'));
const PAGES = ['index.html', 'Platform.dc.html', 'Sales.dc.html', 'Marketing.dc.html', 'Teams.dc.html', 'Listings.dc.html', 'Executive.dc.html',
  'Solutions.dc.html', 'Pricing.dc.html', 'Integrations.dc.html', 'App.dc.html', 'About.dc.html', 'Privacy.dc.html', 'Terms.dc.html'];
const fails = [];
const ok = (cond, msg) => { if (!cond) fails.push(msg); };
const browser = await chromium.launch(process.env.CHROME_CHANNEL ? { channel: process.env.CHROME_CHANNEL } : {});

async function page(viewport) {
  const ctx = await browser.newContext({ viewport, reducedMotion: 'reduce' });
  const p = await ctx.newPage();
  p.errors = [];
  p.on('pageerror', (e) => p.errors.push(e.message));
  p.on('response', (r) => { if (r.status() >= 400 && r.url().startsWith(BASE) && !r.url().includes('/api/forms/')) p.errors.push(`HTTP ${r.status()} ${r.url().slice(BASE.length)}`); });
  // The runtime parses each page template (onclick="{{binding}}" placeholders) with innerHTML; the CSP refuses to compile
  // those placeholder attributes (script-src-attr) and logs it. They are never code: the static check fails on any
  // on*= value that is not a {{binding}}. Every other console error, including any other CSP violation, fails.
  const TEMPLATE_ATTR = /^Executing inline event handler violates the following Content Security Policy directive 'script-src 'self' 'unsafe-eval''/;
  // Same for SVG attributes in the template (d="{{areaD}}" and the like): rejected only when the value is a {{binding}}.
  const TEMPLATE_SVG = /^Error: <[a-z]+> attribute [a-z][a-z0-9-]*: Expected [^,]+, "\{\{[A-Za-z_$][\w$.]*\}\}"\.$/;
  p.on('console', (m) => { if (m.type() === 'error' && !TEMPLATE_ATTR.test(m.text()) && !TEMPLATE_SVG.test(m.text())) p.errors.push(m.text()); });
  return p;
}

// 1. Every page at desktop and phone width
for (const vp of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) {
  const p = await page(vp);
  for (const f of PAGES) {
    p.errors.length = 0;
    await p.goto(`${BASE}/${f}`, { waitUntil: 'load' });
    await p.waitForTimeout(1500);
    const r = await p.evaluate(async () => {
      for (let y = 0; y < document.documentElement.scrollHeight; y += innerHeight) { scrollTo(0, y); await new Promise((r) => setTimeout(r, 30)); }
      await new Promise((r) => setTimeout(r, 400));
      const imgs = [...document.images].filter((i) => i.getBoundingClientRect().width > 0);
      return { over: document.documentElement.scrollWidth - innerWidth, h1: document.querySelectorAll('h1').length, broken: imgs.filter((i) => i.complete && !i.naturalWidth).map((i) => i.src) };
    });
    const where = `${f}@${vp.width}`;
    ok(r.over <= 0, `${where}: horizontal overflow ${r.over}px`);
    ok(r.h1 === 1, `${where}: ${r.h1} h1 elements`);
    ok(!r.broken.length, `${where}: broken images ${r.broken.join(', ')}`);
    ok(!p.errors.length, `${where}: console errors ${p.errors.join(' | ').slice(0, 300)}`);
  }
  await p.context().close();
}

// 2. Pricing: monthly, yearly and a calculator case
{
  const p = await page({ width: 1440, height: 900 });
  await p.goto(`${BASE}/Pricing.dc.html`); await p.waitForTimeout(1500);
  const prices = () => p.evaluate(() => [...document.body.innerText.replace(/\s+/g, ' ').matchAll(/(From\s+)?AED [\d,]+ (a year, paid upfront|a month)/g)].slice(0, 3).map((m) => m[0]));
  ok(JSON.stringify(await prices()) === JSON.stringify(['AED 499 a month', 'AED 1,499 a month', 'From AED 3,999 a month']), `pricing monthly: ${await prices()}`);
  await p.getByRole('button', { name: 'Yearly', exact: true }).click(); await p.waitForTimeout(200);
  ok(JSON.stringify(await prices()) === JSON.stringify(['AED 4,990 a year, paid upfront', 'AED 14,990 a year, paid upfront', 'From AED 39,990 a year, paid upfront']), `pricing yearly: ${await prices()}`);
  const seats = await p.evaluate(() => document.body.innerText.replace(/\s+/g, ' ').match(/AED 1,490 per user a year.*AED 1,190 per user a year.*From AED 990 per user a year/) !== null);
  ok(seats, 'pricing: yearly extra-seat rates');
  await p.getByRole('button', { name: 'Monthly', exact: true }).click();
  await p.getByRole('button', { name: 'Starter', exact: true }).click();
  await p.locator('#seats').evaluate((el) => { Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(el, '8'); el.dispatchEvent(new Event('input', { bubbles: true })); });
  await p.waitForTimeout(200);
  const calc = await p.locator('#seats').evaluate((el) => el.closest('.panel').innerText.replace(/\s+/g, ' '));
  ok(/3 extra seats at AED 149 AED 447 Total a month AED 946/.test(calc), `pricing calculator (Starter, 8 users): ${calc.slice(0, 160)}`);
  await p.context().close();
}

// 3. Forms
async function submit(start, button, expectTitle, who) {
  const p = await page({ width: 1440, height: 900 });
  await p.goto(`${BASE}/${start}`); await p.waitForTimeout(1500);
  if (button) { await p.getByRole('link', { name: button }).first().click(); await p.waitForLoadState('load'); await p.waitForTimeout(1500); }
  if (expectTitle) ok((await p.locator('#contact h2').innerText()).includes(expectTitle), `${who}: heading is not "${expectTitle}"`);
  await p.fill('#f-name', `CI TEST - ${who}`);
  await p.fill('#f-email', `ci-${who}@example.test`);
  await p.fill('#f-company', 'CI TEST company');
  await p.selectOption('#f-industry', 'Other');
  await p.locator('form button[type=submit], form button:not([type=button])').last().click();
  const done = await p.getByText('Request received.').waitFor({ timeout: 10000 }).then(() => true, () => false);
  ok(done, `${who}: no "Request received"`);
  await p.context().close();
}
if (OPEN) {
  await submit('About.dc.html#contact', null, 'Book a demo.', 'demo');
  await submit('Pricing.dc.html', 'Join the 7-day trial waitlist', 'Join the 7', 'waitlist');
  await submit('index.html#pricing', null, null, 'home-demo');
  if (MAILPIT) {
    let msgs = [];
    for (let i = 0; i < 50 && msgs.length < 3; i++) { await new Promise((r) => setTimeout(r, 200)); msgs = (await (await fetch(`${MAILPIT}/api/v1/messages`)).json()).messages || []; }
    ok(msgs.length === 3, `mail: ${msgs.length} messages, want 3`);
    const subj = msgs.map((m) => m.Subject).sort();
    ok(JSON.stringify(subj) === JSON.stringify(['AnchorIQ — New demo request', 'AnchorIQ — New demo request', 'AnchorIQ — New trial waitlist signup']), `mail subjects: ${subj}`);
    for (const m of msgs) {
      const full = await (await fetch(`${MAILPIT}/api/v1/message/${m.ID}`)).json();
      ok(full.To?.map((t) => t.Address).join() === 'hello@anchordigi.com', `mail to: ${JSON.stringify(full.To)}`);
      ok(/^ci-(demo|waitlist|home-demo)@example\.test$/.test(full.ReplyTo?.[0]?.Address || ''), `mail reply-to: ${JSON.stringify(full.ReplyTo)}`);
      ok(/Company:\s+CI TEST company/.test(full.Text || ''), 'mail body lacks the submitted details');
    }
  }
} else {
  const p = await page({ width: 1440, height: 900 });
  for (const f of ['About.dc.html', 'About.dc.html?intent=waitlist', 'index.html']) {
    await p.goto(`${BASE}/${f}`); await p.waitForTimeout(1500);
    ok((await p.locator('form').count()) === 0, `${f}: a form is shown while enquiries are closed`);
  }
  await p.context().close();
  for (const k of ['demo', 'waitlist']) {
    const r = await fetch(`${BASE}/api/forms/${k}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' });
    ok(r.status === 503, `${k}: server accepted a submission while closed (${r.status})`);
  }
}
await browser.close();
for (const f of fails) console.log('FAIL: ' + f);
console.log(fails.length ? `${fails.length} failure(s)` : `browser checks passed (${PAGES.length * 2} page views, pricing, forms ${OPEN ? 'open' : 'closed'}${MAILPIT ? ', mail delivery' : ''})`);
process.exitCode = fails.length ? 1 : 0;
