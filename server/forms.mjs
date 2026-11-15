// AnchorIQ website form handler: demo requests and trial waitlist signups.
// Node 24, no dependencies. Stores each enquiry in SQLite and answers 201 only after the row is committed.
//
//   POST /api/forms/demo       demo request
//   POST /api/forms/waitlist   7-day trial waitlist signup
//   GET  /api/forms/health     liveness
//
// Environment:
//   PORT=8300                 listen port (127.0.0.1 unless HOST is set; in Docker HOST=0.0.0.0)
//   DB_PATH=./data/enquiries.sqlite
//   TRUST_PROXY=1             use X-Real-IP from the website router (production); otherwise the socket address
//   STATIC_DIR=..             also serve the static site (local preview only; production uses nginx)
//   FORMS_OPEN=1              accept submissions (default: closed, every POST answers 503 and nothing is stored)
//   SMTP_* / NOTIFY_TO        email each saved enquiry (see notify.mjs); off when unset
//   RATE_PER_IP=5  RATE_WINDOW_S=600  RATE_GLOBAL_PER_HOUR=200
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { mkdirSync, readFileSync } from 'node:fs';
import { dirname, extname, join, normalize, resolve, sep } from 'node:path';
import { openStore } from './store.mjs';
import { notifierFromEnv } from './notify.mjs';

export const INDUSTRIES = ['Real estate and property', 'Marketing or advertising agency', 'Automotive', 'Education and training', 'Healthcare and clinics',
  'Financial services and insurance', 'Retail and e-commerce', 'Hospitality and travel', 'Technology and software', 'Professional services',
  'Construction and home services', 'Recruitment and staffing', 'Multi-location or franchise business', 'Other'];
export const SIZES = ['Just me', '2 to 10', '11 to 50', '51 to 200', '201 to 500', 'More than 500'];
export const CHALLENGES = ['Lead quality by campaign', 'Marketing spend and return', 'Pipeline and conversion visibility', 'Slow or missed lead follow-up',
  'Agent and team performance', 'Reporting across several tools', 'Reporting still done in spreadsheets', 'Listings and portals',
  'Client reporting for an agency', 'Leadership and board reporting', 'Other'];
const EMAIL = /^[^@\s]{1,64}@[^@\s]+\.[^@\s]{2,}$/;
const MAX_BODY = 8 * 1024;

/** Returns { value } with a clean record, or { errors } keyed by field. Pure: unit-tested. */
export function validate(kind, b) {
  if (!b || typeof b !== 'object' || Array.isArray(b)) return { errors: { body: 'Expected a JSON object.' } };
  const str = (k) => (typeof b[k] === 'string' ? b[k].trim() : b[k] == null ? '' : null);
  const e = {};
  const v = {};
  const text = (k, max, required) => {
    const s = str(k);
    if (s === null) e[k] = 'Must be text.';
    else if (required && !s) e[k] = 'Required.';
    else if (s.length > max) e[k] = `At most ${max} characters.`;
    else v[k] = s;
  };
  const oneOf = (k, list, required) => {
    const s = str(k);
    if (s === null || (s && !list.includes(s)) || (required && !s)) e[k] = required ? 'Choose one of the listed options.' : 'Not a listed option.';
    else v[k] = s;
  };
  text('name', 120, true);
  text('email', 254, true);
  if (v.email && !EMAIL.test(v.email)) e.email = 'Not a valid email address.';
  text('company', 160, true);
  oneOf('industry', INDUSTRIES, true);
  oneOf('size', SIZES, false);
  oneOf('challenge', CHALLENGES, false);
  text('message', 2000, false);
  text('page', 200, false);
  if (b.intent != null && b.intent !== kind) e.intent = 'Does not match the form.';
  if (str('website')) e.website = 'Rejected.'; // honeypot: hidden from people, filled by bots
  return Object.keys(e).length ? { errors: e } : { value: v };
}

/** Fixed-window limiter per key plus a global ceiling. In memory: resets on restart (fine for one process). */
export function rateLimiter({ perKey = 5, windowS = 600, globalPerHour = 200, now = () => Date.now() } = {}) {
  const hits = new Map();
  let g = { start: 0, n: 0 };
  return (key) => {
    const t = now();
    if (t - g.start >= 3600e3) g = { start: t, n: 0 };
    let h = hits.get(key);
    if (!h || t - h.start >= windowS * 1e3) h = { start: t, n: 0 };
    if (h.n >= perKey) return Math.ceil((h.start + windowS * 1e3 - t) / 1e3);
    if (g.n >= globalPerHour) return Math.ceil((g.start + 3600e3 - t) / 1e3);
    h.n++; g.n++; hits.set(key, h);
    if (hits.size > 10000) for (const [k, x] of hits) if (t - x.start >= windowS * 1e3) hits.delete(k);
    return 0;
  };
}

const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.xml': 'application/xml',
  '.txt': 'text/plain; charset=utf-8', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.mp4': 'video/mp4', '.woff2': 'font/woff2' };

export function createApp({ store, limit, trustProxy = false, staticDir = null, log = console, open = false, notifier = null }) {
  // Local preview enforces the production CSP (single source: deploy/csp.conf).
  let CSP = staticDir ? (readFileSync(join(staticDir, 'deploy/csp.conf'), 'utf8').match(/Content-Security-Policy "([^"]+)"/) || [])[1] : null;
  // QA_ALLOW_FRAMES=1 (local audits only): let same-origin test frames load pages; everything else stays as in production.
  if (CSP && process.env.QA_ALLOW_FRAMES === '1') CSP = CSP.replace("frame-ancestors 'none'", "frame-ancestors 'self'");
  const send = (res, status, body, headers = {}) => {
    res.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', ...headers });
    res.end(JSON.stringify(body));
  };
  return createServer(async (req, res) => {
    const url = new URL(req.url, 'http://x');
    const m = url.pathname.match(/^\/api\/forms\/(demo|waitlist|health)$/);
    if (m) {
      if (m[1] === 'health') return req.method === 'GET' ? send(res, 200, { ok: true, open, notifications: !!notifier }) : send(res, 405, { error: 'method' }, { Allow: 'GET' });
      if (req.method !== 'POST') return send(res, 405, { error: 'method' }, { Allow: 'POST' });
      // Marketing-only release: nothing is read, validated or stored until enquiries are opened (FORMS_OPEN=1).
      if (!open) return send(res, 503, { error: 'closed' }, { 'Retry-After': '86400' });
      if (!/^application\/json\b/i.test(req.headers['content-type'] || '')) return send(res, 415, { error: 'content-type' });
      const ip = (trustProxy && req.headers['x-real-ip']) || req.socket.remoteAddress || 'unknown';
      const wait = limit(ip);
      if (wait) return send(res, 429, { error: 'rate-limited' }, { 'Retry-After': String(wait) });
      let raw = '';
      try {
        for await (const chunk of req) { raw += chunk; if (raw.length > MAX_BODY) return send(res, 413, { error: 'too-large' }); }
      } catch { return send(res, 400, { error: 'read' }); }
      let body;
      try { body = JSON.parse(raw); } catch { return send(res, 400, { error: 'json' }); }
      const { value, errors } = validate(m[1], body);
      if (errors) return send(res, errors.website ? 400 : 422, { error: 'invalid', fields: errors.website ? undefined : errors });
      try {
        const id = store.insert(m[1], value);
        log.info?.(`stored ${m[1]} #${id}`); // no personal data in logs
        send(res, 201, { ok: true, id });   // the visitor's request is saved: answer before emailing
        if (notifier) {
          const record = store.get(id);
          notifier.send(m[1], id, record).then(
            () => { store.markNotified(id); log.info?.(`emailed ${m[1]} #${id}`); },
            (err) => { store.markNotifyFailed(id, err.message); log.error?.(`NOTIFY FAILED ${m[1]} #${id}: ${err.message}`); });
        }
        return;
      } catch (err) {
        log.error?.(`store failed: ${err.code || err.message}`);
        return send(res, 503, { error: 'store' });
      }
    }
    if (staticDir && (req.method === 'GET' || req.method === 'HEAD')) {
      let p = decodeURIComponent(url.pathname);
      if (p.endsWith('/')) p += 'index.html';
      const file = normalize(join(staticDir, p));
      if (!file.startsWith(staticDir + sep) || /\/(\.|server\/|tools\/|data\/|deploy\/)|\.md$/.test(file.slice(staticDir.length))) return send(res, 404, { error: 'not-found' });
      try {
        const buf = await readFile(file);
        const html = extname(file) === '.html';
        res.writeHead(200, { 'Content-Type': TYPES[extname(file)] || 'application/octet-stream', ...(html && CSP ? { 'Content-Security-Policy': CSP } : {}) });
        return res.end(req.method === 'HEAD' ? undefined : buf);
      } catch { return send(res, 404, { error: 'not-found' }); }
    }
    return send(res, 404, { error: 'not-found' });
  });
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const env = process.env;
  const dbPath = resolve(env.DB_PATH || './data/enquiries.sqlite');
  mkdirSync(dirname(dbPath), { recursive: true });
  const app = createApp({
    store: openStore(dbPath),
    limit: rateLimiter({ perKey: +env.RATE_PER_IP || 5, windowS: +env.RATE_WINDOW_S || 600, globalPerHour: +env.RATE_GLOBAL_PER_HOUR || 200 }),
    trustProxy: env.TRUST_PROXY === '1',
    open: env.FORMS_OPEN === '1',
    notifier: notifierFromEnv(env),
    staticDir: env.STATIC_DIR ? resolve(env.STATIC_DIR) : null,
  });
  const port = +env.PORT || 8300;
  app.listen(port, env.HOST || '127.0.0.1', () => console.log(`forms listening on ${env.HOST || '127.0.0.1'}:${port}${env.STATIC_DIR ? ' (serving the site)' : ''}; enquiries ${env.FORMS_OPEN === '1' ? 'OPEN' : 'closed'}; email notifications ${env.SMTP_HOST && env.NOTIFY_TO ? 'on' : 'off'}`));
}
