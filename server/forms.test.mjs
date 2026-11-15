// node --test server/   (Node 24, no dependencies)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createApp, rateLimiter, validate } from './forms.mjs';
import { openStore } from './store.mjs';

const good = { intent: 'demo', name: 'Test Person', email: 'test@example.test', company: 'Example Co', industry: 'Real estate and property',
  size: '', challenge: 'Lead quality by campaign', message: 'Hello', page: '/About.dc.html', sentAt: '2026-11-16T00:00:00Z', website: '' };

test('validate: accepts a complete demo request and drops unknown fields', () => {
  const { value, errors } = validate('demo', good);
  assert.equal(errors, undefined);
  assert.equal(value.name, 'Test Person');
  assert.equal('sentAt' in value, false);
});

test('validate: required fields, email shape, listed options, lengths, intent and honeypot', () => {
  assert.deepEqual(Object.keys(validate('demo', {}).errors).sort(), ['company', 'email', 'industry', 'name']);
  assert.ok(validate('demo', { ...good, email: 'nope' }).errors.email);
  assert.ok(validate('demo', { ...good, industry: 'Spaceflight' }).errors.industry);
  assert.ok(validate('demo', { ...good, size: '9000' }).errors.size);
  assert.ok(validate('demo', { ...good, message: 'x'.repeat(2001) }).errors.message);
  assert.ok(validate('demo', { ...good, name: { $gt: '' } }).errors.name);
  assert.ok(validate('waitlist', good).errors.intent);
  assert.ok(validate('demo', { ...good, website: 'http://spam.example' }).errors.website);
  assert.ok(validate('demo', [good]).errors.body);
});

test('rateLimiter: per-key window, then global ceiling', () => {
  let t = 0;
  const lim = rateLimiter({ perKey: 2, windowS: 60, globalPerHour: 3, now: () => t });
  assert.equal(lim('a'), 0); assert.equal(lim('a'), 0);
  assert.equal(lim('a'), 60);
  assert.equal(lim('b'), 0);
  assert.ok(lim('c') > 0, 'global ceiling reached');
  t = 3600e3; assert.equal(lim('a'), 0);
});

async function withServer(opts, fn) {
  const dir = mkdtempSync(join(tmpdir(), 'aiq-forms-'));
  const store = opts.store || openStore(join(dir, 'e.sqlite'));
  const app = createApp({ store, limit: opts.limit || rateLimiter({ perKey: 100 }), log: {}, open: opts.open ?? true, notifier: opts.notifier ?? null });
  await new Promise((r) => app.listen(0, '127.0.0.1', r));
  const base = `http://127.0.0.1:${app.address().port}`;
  const post = (kind, body, headers = {}) => fetch(`${base}/api/forms/${kind}`, { method: 'POST', headers: { 'content-type': 'application/json', ...headers }, body: typeof body === 'string' ? body : JSON.stringify(body) });
  try { await fn({ post, store, base }); } finally { app.close(); if (!opts.store) store.close(); rmSync(dir, { recursive: true, force: true }); }
}

test('HTTP: demo and waitlist are stored separately; 201 only after the row exists', () => withServer({}, async ({ post, store }) => {
  const r1 = await post('demo', good);
  assert.equal(r1.status, 201);
  const { id } = await r1.json();
  const r2 = await post('waitlist', { ...good, intent: 'waitlist' });
  assert.equal(r2.status, 201);
  assert.deepEqual(store.list('demo').map((r) => r.id), [id]);
  assert.equal(store.list('waitlist').length, 1);
  assert.equal(store.list('waitlist')[0].kind, 'waitlist');
}));

test('HTTP: honeypot, invalid, wrong type, oversize and bad JSON are rejected and not stored', () => withServer({}, async ({ post, store }) => {
  assert.equal((await post('demo', { ...good, website: 'x' })).status, 400);
  const bad = await post('demo', { ...good, email: 'x' });
  assert.equal(bad.status, 422);
  assert.ok((await bad.json()).fields.email);
  assert.equal((await post('demo', 'name=x', { 'content-type': 'application/x-www-form-urlencoded' })).status, 415);
  assert.equal((await post('demo', { ...good, message: 'x'.repeat(9000) })).status, 413);
  assert.equal((await post('demo', '{nope')).status, 400);
  assert.equal(store.list('demo').length, 0);
}));

test('HTTP: rate limit returns 429 with Retry-After', () => withServer({ limit: rateLimiter({ perKey: 2, windowS: 600 }) }, async ({ post }) => {
  assert.equal((await post('demo', good)).status, 201);
  assert.equal((await post('demo', good)).status, 201);
  const r = await post('demo', good);
  assert.equal(r.status, 429);
  assert.ok(+r.headers.get('retry-after') > 0);
}));

test('HTTP: a failed write never reports success', () => withServer({ store: { insert() { throw Object.assign(new Error('disk'), { code: 'SQLITE_FULL' }); } } }, async ({ post }) => {
  assert.equal((await post('demo', good)).status, 503);
}));

test('HTTP: only POST to the two form paths; GET health', () => withServer({}, async ({ base }) => {
  assert.equal((await fetch(`${base}/api/forms/demo`)).status, 405);
  assert.equal((await fetch(`${base}/api/forms/other`, { method: 'POST' })).status, 404);
  assert.equal((await fetch(`${base}/api/forms/health`)).status, 200);
}));

test('retention: purge removes enquiries older than the limit and leaves no trace in the database files', async () => {
  const { DatabaseSync } = await import('node:sqlite');
  const { readFileSync, existsSync } = await import('node:fs');
  const dir = mkdtempSync(join(tmpdir(), 'aiq-retention-'));
  const path = join(dir, 'e.sqlite');
  const store = openStore(path);
  const v = (email) => ({ name: 'N', email, company: 'C', industry: 'Other' });
  store.insert('demo', v('old-enquiry@example.test'));
  store.insert('waitlist', v('recent-enquiry@example.test'));
  const raw = new DatabaseSync(path);
  raw.exec("UPDATE enquiries SET created_at = '2024-01-01T00:00:00Z' WHERE email = 'old-enquiry@example.test'");
  raw.close();
  assert.equal(store.purge(365), 1);
  assert.deepEqual(store.stats().map((r) => [r.kind, r.count]), [['waitlist', 1]]);
  store.close();
  for (const f of [path, path + '-wal', path + '-shm']) {
    if (existsSync(f)) assert.equal(readFileSync(f).includes('old-enquiry@example.test'), false, `${f} still holds the deleted address`);
  }
  assert.equal(readFileSync(path).includes('recent-enquiry@example.test') || readFileSync(path + '-wal').includes('recent-enquiry@example.test'), true);
  rmSync(dir, { recursive: true, force: true });
});

test('HTTP: closed (marketing-only release) answers 503 and stores nothing', () => withServer({ open: false }, async ({ post, store, base }) => {
  const r = await post('demo', good);
  assert.equal(r.status, 503);
  assert.equal((await r.json()).error, 'closed');
  assert.equal((await post('waitlist', { ...good, intent: 'waitlist' })).status, 503);
  assert.equal(store.list('demo').length + store.list('waitlist').length, 0);
  assert.deepEqual(await (await fetch(`${base}/api/forms/health`)).json(), { ok: true, open: false, notifications: false });
}));

// A local fake SMTP server (plain text, no TLS) for the notification tests.
async function fakeSmtp({ failAuth = false } = {}) {
  const net = await import('node:net');
  const mails = [];
  const server = net.createServer((s) => {
    s.setEncoding('utf8'); let buf = ''; let data = false; let mail = '';
    s.write('220 fake ESMTP\r\n');
    s.on('data', (d) => {
      buf += d;
      let i;
      while ((i = buf.indexOf('\r\n')) >= 0) {
        const line = buf.slice(0, i); buf = buf.slice(i + 2);
        if (data) {
          if (line === '.') { data = false; mails.push(mail); mail = ''; s.write('250 queued\r\n'); } else mail += line + '\r\n';
          continue;
        }
        const c = line.slice(0, 4).toUpperCase();
        if (c === 'EHLO') s.write('250-fake\r\n250 AUTH PLAIN\r\n');
        else if (c === 'AUTH') s.write(failAuth ? '535 5.7.8 authentication failed\r\n' : '235 ok\r\n');
        else if (c === 'MAIL' || c === 'RCPT') s.write('250 ok\r\n');
        else if (c === 'DATA') { data = true; s.write('354 go\r\n'); }
        else if (c === 'QUIT') { s.write('221 bye\r\n'); s.end(); }
        else s.write('500 ?\r\n');
      }
    });
  });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  return { port: server.address().port, mails, close: () => server.close() };
}
const decode = (raw) => {
  const [head, body] = raw.split('\r\n\r\n');
  const subj = head.match(/^Subject: =\?UTF-8\?B\?([^?]+)\?=/m);
  return { head, subject: subj ? Buffer.from(subj[1], 'base64').toString('utf8') : null, body: Buffer.from(body.replace(/\r\n/g, ''), 'base64').toString('utf8') };
};

test('notify: each saved enquiry emails hello@ with its own subject, the details and Reply-To the visitor', async () => {
  const { createNotifier } = await import('./notify.mjs');
  const smtp = await fakeSmtp();
  const notifier = createNotifier({ host: '127.0.0.1', port: smtp.port, user: 'sender@anchordigi.com', pass: 'x', from: 'sender@anchordigi.com', to: 'hello@anchordigi.com', requireTls: false });
  await withServer({ notifier }, async ({ post, store }) => {
    assert.equal((await post('demo', { ...good, name: 'Demo\r\nBcc: evil@example.test' })).status, 201);
    assert.equal((await post('waitlist', { ...good, intent: 'waitlist', email: 'wait@example.test' })).status, 201);
    for (let i = 0; i < 50 && smtp.mails.length < 2; i++) await new Promise((r) => setTimeout(r, 20));
    const [a, b] = smtp.mails.map(decode);
    assert.equal(a.subject, 'AnchorIQ — New demo request');
    assert.equal(b.subject, 'AnchorIQ — New trial waitlist signup');
    assert.match(a.head, /^To: <hello@anchordigi\.com>$/m);
    assert.match(a.head, /^Reply-To: <test@example\.test>$/m);
    assert.match(b.head, /^Reply-To: <wait@example\.test>$/m);
    assert.doesNotMatch(a.head, /Bcc|evil/);           // visitor text never reaches the headers
    assert.match(a.body, /Company:\s+Example Co/);
    assert.match(a.body, /Message:\r\nHello/);
    for (let i = 0; i < 50 && store.unnotified().length; i++) await new Promise((r) => setTimeout(r, 20));
    assert.equal(store.unnotified().length, 0);
  });
  smtp.close();
});

test('notify: if email fails the enquiry is kept, the visitor still gets 201, and the failure is recorded', async () => {
  const { createNotifier } = await import('./notify.mjs');
  const smtp = await fakeSmtp({ failAuth: true });
  const notifier = createNotifier({ host: '127.0.0.1', port: smtp.port, user: 'sender@anchordigi.com', pass: 'wrong', from: 'sender@anchordigi.com', to: 'hello@anchordigi.com', requireTls: false });
  const errors = [];
  await withServer({ notifier }, async ({ post, store }) => {
    assert.equal((await post('demo', good)).status, 201);
    for (let i = 0; i < 50 && !store.unnotified()[0]?.notify_error; i++) await new Promise((r) => setTimeout(r, 20));
    const [u] = store.unnotified();
    assert.equal(store.list('demo').length, 1);
    assert.match(u.notify_error, /SMTP 535 after AUTH/);
    assert.doesNotMatch(u.notify_error, /wrong/);       // the password is never recorded
  });
  smtp.close();
});

test('notify: STARTTLS is required on submission ports unless explicitly disabled', async () => {
  const { createNotifier } = await import('./notify.mjs');
  const smtp = await fakeSmtp();
  const n = createNotifier({ host: '127.0.0.1', port: smtp.port, user: 'u@anchordigi.com', pass: 'x', from: 'u@anchordigi.com', to: 'hello@anchordigi.com' });
  await assert.rejects(n.send('demo', 1, { ...good }), /does not offer STARTTLS/);
  assert.equal(smtp.mails.length, 0);
  smtp.close();
});
