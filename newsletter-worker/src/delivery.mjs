import { createToken, hashToken } from './tokens.mjs';

const copy = {tr: ['Yazıyı oku', 'Abonelikten çık']};

function escapeHtml(value) {
  return String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
}

async function send(env, message) {
  if (typeof env.SEND_EMAIL === 'function') return env.SEND_EMAIL(message);
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {'authorization': `Bearer ${env.RESEND_API_KEY}`, 'content-type': 'application/json'},
    body: JSON.stringify({
      from: env.FROM_EMAIL || 'Patika Dergi <bulten@patikadergi.org>',
      to: [message.to], subject: message.subject, html: message.html,
      headers: {'List-Unsubscribe': `<${message.unsubscribeUrl}>`, 'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click'}
    })
  });
  if (!response.ok) throw new Error(`Resend request failed: ${response.status}`);
}

async function unsubscribeUrl(row, env) {
  const raw = createToken();
  const hash = await hashToken(raw, env.TOKEN_SECRET);
  const now = new Date().toISOString();
  const expires = new Date(Date.now() + 3650 * 24 * 60 * 60 * 1000).toISOString();
  await env.DB.prepare("INSERT INTO tokens (subscriber_id,purpose,token_hash,expires_at,created_at) VALUES (?,'unsubscribe',?,?,?)")
    .bind(row.subscriber_id, hash, expires, now).run();
  return `${env.PUBLIC_URL || 'https://bulten.patikadergi.org'}/v1/unsubscribe?token=${encodeURIComponent(raw)}`;
}

export async function deliverQueued(env, maxPerDay = 100) {
  const today = new Date().toISOString().slice(0, 10);
  const attemptsToday = Number((await env.DB.prepare("SELECT count(*) AS count FROM delivery_attempts WHERE substr(attempted_at,1,10)=?").bind(today).first())?.count || 0);
  const capacity = Math.max(0, maxPerDay - attemptsToday);
  const queued = capacity ? (await env.DB.prepare(`
    SELECT d.id,p.title,p.summary,p.url,s.id AS subscriber_id,s.email,s.locale
    FROM deliveries d
    JOIN publications p ON p.id=d.publication_id
    JOIN subscribers s ON s.id=d.subscriber_id
    WHERE d.status='queued' AND s.status='confirmed'
    ORDER BY d.id LIMIT ?
  `).bind(capacity).all()).results : [];
  let sent = 0;
  for (const row of queued) {
    const attemptedAt = new Date().toISOString();
    await env.DB.prepare('INSERT INTO delivery_attempts (delivery_id,attempted_at) VALUES (?,?)').bind(row.id, attemptedAt).run();
    try {
      const optOut = await unsubscribeUrl(row, env);
      const [readLabel, unsubscribeLabel] = copy[row.locale] || copy.tr;
      const html = `<div lang="${row.locale}"><p>${escapeHtml(row.summary)}</p><p><a href="${escapeHtml(row.url)}">${readLabel}</a></p><hr><p>Patika Dergi · <a href="${escapeHtml(optOut)}">${unsubscribeLabel}</a></p></div>`;
      await send(env, {to: row.email, subject: row.title, html, unsubscribeUrl: optOut});
      const now = new Date().toISOString();
      await env.DB.prepare("UPDATE deliveries SET status='sent',sent_at=?,attempts=attempts+1,last_error=NULL WHERE id=?")
        .bind(now, row.id).run();
      sent += 1;
    } catch (cause) {
      await env.DB.prepare("UPDATE deliveries SET attempts=attempts+1,last_error=? WHERE id=?")
        .bind(String(cause?.message || cause).slice(0, 500), row.id).run();
    }
  }
  const remaining = Number((await env.DB.prepare("SELECT count(*) AS count FROM deliveries WHERE status='queued'").first())?.count || 0);
  return {sent, attempted: queued.length, remaining, capacity};
}
