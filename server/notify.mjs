// Email notification for a saved enquiry, over authenticated SMTP (Node built-ins only).
// Port 465: TLS from the start. Other ports: STARTTLS, required unless SMTP_REQUIRE_TLS=0 (tests only).
// Configuration (environment; the password never appears in code, logs or the database):
//   SMTP_HOST, SMTP_PORT (465), SMTP_USER, SMTP_PASS or SMTP_PASS_FILE, NOTIFY_FROM (default SMTP_USER), NOTIFY_TO
import net from 'node:net';
import tls from 'node:tls';
import { readFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';

export const SUBJECTS = { demo: 'AnchorIQ — New demo request', waitlist: 'AnchorIQ — New trial waitlist signup' };
const EMAIL = /^[^@\s<>"(),;:\\]{1,64}@[^@\s<>"(),;:\\]+\.[^@\s<>"(),;:\\]{2,}$/;

export function notifierFromEnv(env = process.env) {
  if (!env.SMTP_HOST || !env.NOTIFY_TO) return null;
  const pass = env.SMTP_PASS_FILE ? readFileSync(env.SMTP_PASS_FILE, 'utf8').trim() : env.SMTP_PASS;
  return createNotifier({
    host: env.SMTP_HOST, port: +env.SMTP_PORT || 465, user: env.SMTP_USER, pass,
    from: env.NOTIFY_FROM || env.SMTP_USER, to: env.NOTIFY_TO, requireTls: env.SMTP_REQUIRE_TLS !== '0',
    servername: env.SMTP_TLS_SERVERNAME, ca: env.SMTP_TLS_CA_FILE ? readFileSync(env.SMTP_TLS_CA_FILE) : undefined,
  });
}

const b64 = (s) => Buffer.from(s, 'utf8').toString('base64');
const encWord = (s) => (/^[\x20-\x7e]*$/.test(s) ? s : `=?UTF-8?B?${b64(s)}?=`);
const wrap = (s) => s.replace(/.{1,76}/g, '$&\r\n');

/** Builds the message. Every header value is constant or validated; visitor text goes only into the base64 body. */
export function buildMessage({ kind, id, record, from, to, now = new Date() }) {
  if (!SUBJECTS[kind]) throw new Error('unknown kind');
  for (const a of [from, to]) if (!EMAIL.test(a)) throw new Error('bad configured address');
  const replyTo = EMAIL.test(record.email) ? record.email : null;
  const label = kind === 'demo' ? 'Demo request' : 'Trial waitlist signup';
  const lines = [
    `${label} #${id}, saved ${record.created_at || now.toISOString()}`,
    '',
    `Name:      ${record.name}`,
    `Email:     ${record.email}`,
    `Company:   ${record.company}`,
    `Industry:  ${record.industry}`,
    `Team size: ${record.size || '-'}`,
    `Challenge: ${record.challenge || '-'}`,
    `Page:      ${record.page || '-'}`,
    '',
    'Message:',
    record.message || '-',
    '',
    'Reply to this email to answer the visitor directly.',
  ];
  const headers = [
    `From: AnchorIQ website <${from}>`,
    `To: <${to}>`,
    ...(replyTo ? [`Reply-To: <${replyTo}>`] : []),
    `Subject: ${encWord(SUBJECTS[kind])}`,
    `Date: ${now.toUTCString().replace('GMT', '+0000')}`,
    `Message-ID: <${randomUUID()}@${from.split('@')[1]}>`,
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset=utf-8',
    'Content-Transfer-Encoding: base64',
    'Auto-Submitted: auto-generated',
  ];
  return headers.join('\r\n') + '\r\n\r\n' + wrap(b64(lines.join('\r\n')));
}

/** Minimal SMTP client: EHLO, (STARTTLS), AUTH PLAIN, MAIL, RCPT, DATA, QUIT. Throws with the SMTP reply on failure. */
export function createNotifier({ host, port = 465, user, pass, from, to, requireTls = true, servername, ca, timeoutMs = 20000 }) {
  async function session(message) {
    let sock = port === 465 ? tls.connect({ host, port, servername: servername || host, ca }) : net.connect({ host, port });
    let buf = '';
    let waiter = null;
    const onData = (d) => { buf += d; flush(); };
    const flush = () => {
      if (!waiter) return;
      const m = buf.match(/(?:^|\r\n)(\d{3}) [^\r\n]*\r\n/);
      if (!m) return;
      const end = buf.indexOf(m[0]) + m[0].length;
      const reply = buf.slice(0, end); buf = buf.slice(end);
      const w = waiter; waiter = null; w.resolve({ code: +m[1], text: reply.trim() });
    };
    const attach = (s) => { s.setEncoding('utf8'); s.on('data', onData); s.on('error', (e) => waiter && waiter.reject(e)); s.setTimeout(timeoutMs, () => s.destroy(new Error('SMTP timeout'))); };
    attach(sock);
    const read = () => new Promise((resolve, reject) => { waiter = { resolve, reject }; flush(); });
    const cmd = async (line, ok) => {
      if (line !== null) sock.write(line + '\r\n');
      const r = await read();
      if (!ok.includes(r.code)) throw Object.assign(new Error(`SMTP ${r.code} after ${line === null ? 'greeting' : line.split(' ')[0]}: ${r.text.split('\r\n').pop()}`), { code: `SMTP_${r.code}` });
      return r;
    };
    try {
      await new Promise((resolve, reject) => { sock.once(port === 465 ? 'secureConnect' : 'connect', resolve); sock.once('error', reject); });
      await cmd(null, [220]);
      let ehlo = await cmd('EHLO anchoriq.io', [250]);
      if (port !== 465) {
        if (/STARTTLS/i.test(ehlo.text)) {
          await cmd('STARTTLS', [220]);
          sock.removeListener('data', onData);
          sock = tls.connect({ socket: sock, servername: servername || host, ca });
          await new Promise((resolve, reject) => { sock.once('secureConnect', resolve); sock.once('error', reject); });
          attach(sock);
          ehlo = await cmd('EHLO anchoriq.io', [250]);
        } else if (requireTls) throw new Error('SMTP server does not offer STARTTLS');
      }
      if (user) await cmd('AUTH PLAIN ' + b64(`\0${user}\0${pass}`), [235]);
      await cmd(`MAIL FROM:<${from}>`, [250]);
      await cmd(`RCPT TO:<${to}>`, [250, 251]);
      await cmd('DATA', [354]);
      await cmd(message.replace(/\r\n$/, '').replace(/^\./gm, '..') + '\r\n.', [250]);
      await cmd('QUIT', [221]).catch(() => {});
    } finally {
      sock.destroy();
    }
  }
  return {
    to, from,
    async send(kind, id, record) { await session(buildMessage({ kind, id, record, from, to })); },
  };
}
