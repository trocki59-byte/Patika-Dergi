import { createToken, hashToken } from './tokens.mjs';

const supportedLocales = new Set(['tr']);
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/u;

export function normalizeEmail(email) {
  return typeof email === 'string' ? email.trim().toLowerCase() : '';
}

function response(status, payload) {
  return Response.json(payload, {status});
}

function error(code, message, status = 400) {
  return response(status, {ok: false, error: {code, message}});
}

async function sendConfirmation(email, locale, token, env) {
  const publicUrl = env.PUBLIC_URL || 'https://bulten.patikadergi.org';
  const confirmUrl = `${publicUrl}/v1/confirm?token=${encodeURIComponent(token)}`;
  const message = {email, locale, confirmUrl};
  if (typeof env.SEND_EMAIL === 'function') return env.SEND_EMAIL(message);
  if (!env.RESEND_API_KEY) return;
  const apiResponse = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {'authorization': `Bearer ${env.RESEND_API_KEY}`, 'content-type': 'application/json'},
    body: JSON.stringify({
      from: env.FROM_EMAIL || 'Patika Dergi <bulten@patikadergi.org>',
      to: [email],
      subject: 'Patika Dergi bülten aboneliğini doğrula',
      html: `<p>Patika Dergi bültenine katılmak için bağlantıyı açın:</p><p><a href="${confirmUrl}">Aboneliği doğrula</a></p>`
    })
  });
  if (!apiResponse.ok) throw new Error(`Confirmation email failed: ${apiResponse.status}`);
}

export async function subscribe(request, env) {
  let data;
  try { data = await request.json(); } catch { return error('invalid_json', 'Geçerli bir JSON gövdesi gönderin.'); }
  const email = normalizeEmail(data.email);
  if (data.website) return response(202, {ok: true, status: 'pending_confirmation'});
  if (!emailPattern.test(email) || email.length > 254) return error('invalid_email', 'Geçerli bir e-posta adresi girin.');
  if (!supportedLocales.has(data.locale)) return error('invalid_locale', 'Desteklenmeyen dil.');
  if (data.consent !== true) return error('consent_required', 'Bülten onayı gereklidir.');

  const now = new Date().toISOString();
  const subscriber = await env.DB.prepare(`
    INSERT INTO subscribers (email,email_normalized,locale,status,consented_at,created_at,updated_at)
    VALUES (?,?,?,'pending',?,?,?)
    ON CONFLICT(email_normalized) DO UPDATE SET
      email=excluded.email, locale=excluded.locale,
      status=CASE WHEN subscribers.status='confirmed' THEN 'confirmed' ELSE 'pending' END,
      consented_at=excluded.consented_at, updated_at=excluded.updated_at
    RETURNING id,status
  `).bind(email, email, data.locale, now, now, now).first();

  if (subscriber.status === 'confirmed') return response(200, {ok: true, status: 'already_confirmed'});
  await env.DB.prepare("UPDATE tokens SET used_at=? WHERE subscriber_id=? AND purpose='confirm' AND used_at IS NULL")
    .bind(now, subscriber.id).run();
  const token = createToken();
  const tokenHash = await hashToken(token, env.TOKEN_SECRET);
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  await env.DB.prepare("INSERT INTO tokens (subscriber_id,purpose,token_hash,expires_at,created_at) VALUES (?,'confirm',?,?,?)")
    .bind(subscriber.id, tokenHash, expiresAt, now).run();
  await sendConfirmation(email, data.locale, token, env);
  return response(202, {ok: true, status: 'pending_confirmation'});
}

async function consumeToken(token, purpose, env) {
  if (typeof token !== 'string' || token.length < 32) return null;
  const tokenHash = await hashToken(token, env.TOKEN_SECRET);
  const row = await env.DB.prepare(`
    SELECT t.id AS token_id,t.subscriber_id,t.expires_at,s.status
    FROM tokens t JOIN subscribers s ON s.id=t.subscriber_id
    WHERE t.token_hash=? AND t.purpose=? AND t.used_at IS NULL
  `).bind(tokenHash, purpose).first();
  if (!row || Date.parse(row.expires_at) <= Date.now()) return null;
  return row;
}

export async function confirm(token, env) {
  const row = await consumeToken(token, 'confirm', env);
  if (!row) return error('invalid_token', 'Doğrulama bağlantısı geçersiz veya süresi dolmuş.');
  const now = new Date().toISOString();
  await env.DB.prepare('UPDATE tokens SET used_at=? WHERE id=? AND used_at IS NULL').bind(now, row.token_id).run();
  await env.DB.prepare("UPDATE subscribers SET status='confirmed',confirmed_at=?,updated_at=? WHERE id=?")
    .bind(now, now, row.subscriber_id).run();
  return response(200, {ok: true, status: 'confirmed'});
}

export async function unsubscribe(token, env) {
  const row = await consumeToken(token, 'unsubscribe', env);
  if (!row) return error('invalid_token', 'Abonelikten çıkma bağlantısı geçersiz veya süresi dolmuş.');
  const now = new Date().toISOString();
  await env.DB.prepare('UPDATE tokens SET used_at=? WHERE id=? AND used_at IS NULL').bind(now, row.token_id).run();
  await env.DB.prepare("UPDATE subscribers SET status='unsubscribed',updated_at=? WHERE id=?")
    .bind(now, row.subscriber_id).run();
  return response(200, {ok: true, status: 'unsubscribed'});
}
