// Read or prune stored enquiries. Run on the server (over SSH), never exposed on the web.
//   node server/enquiries.mjs list demo|waitlist [--since 2026-11-01] [--csv]
//   node server/enquiries.mjs purge --older-than 365
//   node server/enquiries.mjs stats                  counts and oldest/newest per kind (verifies retention)
//   node server/enquiries.mjs unnotified             enquiries whose email was not delivered, with the error
//   node server/enquiries.mjs notify-retry           resend those emails (needs the SMTP settings)
// DB_PATH as for forms.mjs.
import { resolve } from 'node:path';
import { openStore } from './store.mjs';
import { notifierFromEnv } from './notify.mjs';

const [cmd, kind, ...rest] = process.argv.slice(2);
const opt = (k) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : undefined; };
const store = openStore(resolve(process.env.DB_PATH || './data/enquiries.sqlite'));
const COLS = ['id', 'created_at', 'name', 'email', 'company', 'industry', 'size', 'challenge', 'message', 'page', 'notified_at', 'notify_error'];
const csv = (v) => { const s = String(v ?? ''); return /[",\n\r]/.test(s) || /^[=+\-@]/.test(s) ? '"' + s.replace(/^([=+\-@])/, "'$1").replace(/"/g, '""') + '"' : s; };

if (cmd === 'list' && (kind === 'demo' || kind === 'waitlist')) {
  const rows = store.list(kind, opt('--since') || '0000');
  if (rest.includes('--csv')) {
    console.log(COLS.join(','));
    for (const r of rows) console.log(COLS.map((c) => csv(r[c])).join(','));
  } else console.log(JSON.stringify(rows, null, 2));
} else if (cmd === 'unnotified') {
  const rows = store.unnotified();
  console.log(rows.length ? JSON.stringify(rows, null, 2) : 'all enquiries were emailed');
} else if (cmd === 'notify-retry') {
  const n = notifierFromEnv();
  if (!n) { console.error('email notifications are not configured (SMTP_HOST, NOTIFY_TO)'); process.exitCode = 2; }
  else for (const r of store.unnotified()) {
    const rec = store.get(r.id);
    try { await n.send(rec.kind, rec.id, rec); store.markNotified(rec.id); console.log(`emailed ${rec.kind} #${rec.id}`); }
    catch (e) { store.markNotifyFailed(rec.id, e.message); console.log(`FAILED ${rec.kind} #${rec.id}: ${e.message}`); process.exitCode = 1; }
  }
} else if (cmd === 'stats') {
  console.log(JSON.stringify(store.stats(), null, 2));
} else if (cmd === 'purge' && +opt('--older-than') > 0) {
  console.log(`deleted ${store.purge(+opt('--older-than'))} enquiries older than ${opt('--older-than')} days`);
} else {
  console.error('usage: list demo|waitlist [--since YYYY-MM-DD] [--csv] | stats | unnotified | notify-retry | purge --older-than DAYS');
  process.exitCode = 2;
}
store.close();
