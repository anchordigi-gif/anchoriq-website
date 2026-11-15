// Static checks for the anchoriq.io site (Node 24, no dependencies). Run from the repo root.
//   node tools/ci-site-check.mjs            PR checks
//   node tools/ci-site-check.mjs --release  also fails on unfinished policy text ([BRACKETED] fields)
import { readFileSync, existsSync, readdirSync } from 'node:fs';

const release = process.argv.includes('--release');
const pages = readdirSync('.').filter((f) => f.endsWith('.html')).sort();
const read = (f) => readFileSync(f, 'utf8');
const fails = [];
const notes = [];
const fail = (m) => fails.push(m);

// 1. Links, anchors and assets
const ids = Object.fromEntries(pages.map((f) => [f, new Set([...read(f).matchAll(/\sid="([^"{}]+)"/g)].map((m) => m[1]))]));
let links = 0, assets = 0;
for (const f of pages) {
  const s = read(f);
  for (const [, href] of s.matchAll(/\shref="([^"{}]+)"/g)) {
    if (/^(https?:|tel:|mailto:)/.test(href) || href.startsWith('assets/fonts/inter.css')) continue;
    links++;
    const [path, frag] = href.split('#');
    const target = path === '' || path === './' ? (path === '' ? f : 'index.html') : path.split('?')[0];
    if (!existsSync(target)) { fail(`${f}: link to missing ${href}`); continue; }
    if (frag && !ids[target]?.has(frag)) fail(`${f}: link ${href} has no #${frag} target`);
  }
  for (const [, a] of s.matchAll(/(?:src|poster|href)="(assets\/[^"{}]+)"/g)) { assets++; if (!existsSync(a)) fail(`${f}: missing asset ${a}`); }
  for (const [, a] of s.matchAll(/"assets\/([A-Za-z0-9_./-]+\.(?:jpg|png|mp4))"/g)) { assets++; if (!existsSync('assets/' + a)) fail(`${f}: missing asset assets/${a}`); }
  for (const [, id] of s.matchAll(/\["[^"]+", "(demo\/app-[a-z-]+|[0-9a-f]{32})"/g)) { assets++; if (!existsSync(`assets/${id}.jpg`)) fail(`${f}: missing app screen assets/${id}.jpg`); }
}
if (read('index.html') !== read('Main.dc.html')) fail('index.html and Main.dc.html differ');

// 2. Sitemap equals canonical URLs; robots points at it
const canon = Object.fromEntries(pages.map((f) => [f, (read(f).match(/<link rel="canonical" href="([^"]+)"/) || [])[1]]));
for (const [f, u] of Object.entries(canon)) {
  const want = 'https://anchoriq.io/' + (f === 'index.html' || f === 'Main.dc.html' ? '' : f);
  if (u !== want) fail(`${f}: canonical ${u} (want ${want})`);
}
const sitemap = [...read('sitemap.xml').matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
const canonSet = new Set(Object.values(canon));
if (sitemap.length !== canonSet.size || sitemap.some((u) => !canonSet.has(u))) fail(`sitemap (${sitemap.length}) does not equal the canonical URLs (${canonSet.size})`);
if (!/Sitemap: https:\/\/anchoriq\.io\/sitemap\.xml/.test(read('robots.txt'))) fail('robots.txt does not point at the sitemap');

// 3. Approved pricing in the source
const P = read('Pricing.dc.html').match(/const P = (\[\[.*?\]\]);/)?.[1];
const want = "[['Starter', 499, 149, 5, 'AED 5,000', ''], ['Professional', 1499, 119, 20, 'AED 8,000', ''], ['Enterprise', 3999, 99, 50, 'quoted separately', 'From ']]";
if (P !== want) fail(`pricing data changed: ${P}`);
const pr = read('Pricing.dc.html');
for (const s of ["y ? p[1] * 10 : p[1]", "y ? p[2] * 10 : p[2]", '>3 included<', '>5 included<', '>6 included at the starting price, more by quote<', '>AED 5,000<', '>AED 8,000<', '>Quoted separately<'])
  if (!pr.includes(s)) fail(`pricing: missing ${s}`);

// 4. Enquiry mode is consistent: the browser switch and every button label agree
const open = /AIQ_ENQUIRIES_OPEN = true/.test(read('assets/site-config.js'));
const all = pages.map(read).join('\n');
const count = (re) => (all.match(re) || []).length;
const openLabels = count(/>Book a demo</g) + count(/>Join the 7-day trial waitlist</g) + count(/>Talk to sales</g);
const closedLabels = count(/>Demos open soon</g) + count(/>Demos soon</g) + count(/>Trial waitlist opens soon</g) + count(/>Sales enquiries open soon</g);
if (open && closedLabels) fail(`enquiries open but ${closedLabels} "opens soon" labels remain`);
if (!open && openLabels) fail(`enquiries closed but ${openLabels} booking labels remain`);
notes.push(`enquiry mode: ${open ? 'OPEN' : 'closed'} (${open ? openLabels : closedLabels} labels)`);
for (const f of ['About.dc.html', 'index.html']) {
  const s = read(f);
  if (!/const OPEN = window\.AIQ_ENQUIRIES_OPEN === true;/.test(s) || !s.includes('if (!OPEN) return;')) fail(`${f}: form does not honour the enquiry switch`);
}
for (const [f, ep] of [['About.dc.html', "const FORM_ENDPOINT = '/api/forms/';"], ['index.html', "const FORM_ENDPOINT = '/api/forms/demo';"]])
  if (!read(f).includes(ep)) fail(`${f}: form endpoint changed`);

// 5. Security and content rules
for (const f of pages) {
  const s = read(f);
  // the enquiry switch must load before the page runtime on every page (a comment mentioning it does not count)
  if (!/<script src="assets\/site-config\.js"><\/script>\s*<script src="assets\/vendor\/resources\.js"><\/script>\s*<script src="\.\/support\.js"><\/script>/.test(s)) fail(`${f}: site-config.js not loaded before the runtime`);
  for (const m of s.matchAll(/<script(?![^>]*\bsrc=)(?![^>]*text\/x-dc)[^>]*>/g)) fail(`${f}: inline script ${m[0]}`);
  // Template event bindings (onclick="{{name}}") are attached by the runtime; any other on*= value would be a real inline handler.
  for (const m of s.matchAll(/\son[a-z]+="([^"]*)"/gi)) if (!/^\{\{[A-Za-z_$][\w$.]*\}\}$/.test(m[1])) fail(`${f}: inline event handler ${m[0]}`);
  for (const m of s.matchAll(/<(?:script|link|img|video|source|iframe)[^>]+(?:src|href)="(https?:\/\/(?!anchoriq\.io)[^"]+)"/g)) fail(`${f}: third-party resource ${m[1]}`);
  for (const m of s.matchAll(/googletagmanager|unpkg\.com|fonts\.googleapis|GTM-[A-Z0-9]+/g)) fail(`${f}: ${m[0]}`);
  for (const m of s.matchAll(/Dubai|Jumeirah|Goyzer|Property ?Finder|Bayut|Dubizzle|\bMeta\b|Google (?:Ads|Analytics)|TikTok|Snapchat|LinkedIn|WhatsApp|Salesforce|HubSpot|Savills/g)) fail(`${f}: names "${m[0]}"`);
}

// 6. Policy text
const published = ['Privacy.dc.html', 'Terms.dc.html'].filter((f) => existsSync(f));
const fields = [...new Set(published.flatMap((f) => [...read(f).matchAll(/\[(?:[A-Z][A-Z ]+|CONFIRM:[^\]]+)\]/g)].map((m) => m[0])))];
if (fields.length) (release ? fail : (m) => notes.push(m))(`unfinished policy text on public pages (${fields.length}): ${fields.join(' | ')}`);
if (open && !existsSync('Privacy.dc.html')) fail('enquiries are open but no Privacy page is published (tools/policy-pages.py publish)');
if (!published.length) notes.push('policy pages unpublished (drafts in legal/drafts/)');
for (const f of pages) if (/<a [^>]*href="(Privacy|Terms)\.dc\.html/.test(read(f)) && !published.length) fail(`${f}: links to an unpublished policy page`);

console.log(`checked ${pages.length} pages, ${links} links, ${assets} asset references, ${sitemap.length} sitemap URLs`);
for (const n of notes) console.log('note: ' + n);
for (const f of fails) console.log('FAIL: ' + f);
console.log(fails.length ? `${fails.length} failure(s)` : 'site checks passed');
process.exitCode = fails.length ? 1 : 0;
