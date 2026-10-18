import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { normalizeEmail, subscribe, confirm, unsubscribe } from '../src/subscribers.mjs';
import { createToken, hashToken } from '../src/tokens.mjs';
import worker from '../src/index.mjs';

class D1Statement {
  constructor(statement) { this.statement = statement; this.values = []; }
  bind(...values) { this.values = values; return this; }
  first() { return this.statement.get(...this.values) ?? null; }
  all() { return {results: this.statement.all(...this.values)}; }
  run() { const result = this.statement.run(...this.values); return {success: true, meta: {changes: result.changes}}; }
}

function testEnv() {
  const sqlite = new DatabaseSync(':memory:');
  sqlite.exec(readFileSync(resolve(import.meta.dirname, '../schema.sql'), 'utf8'));
  const mail = [];
  return {
    DB: {prepare: sql => new D1Statement(sqlite.prepare(sql))},
    TOKEN_SECRET: 'test-secret-at-least-32-characters-long',
    PUBLIC_URL: 'https://bulten.patikadergi.org',
    SEND_EMAIL: async message => { mail.push(message); },
    sqlite,
    mail
  };
}

function request(body) {
  return new Request('https://bulten.patikadergi.org/v1/subscribe', {
    method: 'POST', headers: {'content-type': 'application/json'}, body: JSON.stringify(body)
  });
}

test('email normalization is stable', () => {
  assert.equal(normalizeEmail('  Ada.Example@Example.COM '), 'ada.example@example.com');
});

test('subscription rejects invalid input and honeypot submissions create no rows', async () => {
  const env = testEnv();
  for (const body of [
    {email: 'bad', locale: 'tr', consent: true, website: ''},
    {email: 'a@example.com', locale: 'es', consent: true, website: ''},
    {email: 'a@example.com', locale: 'en', consent: true, website: ''},
    {email: 'a@example.com', locale: 'tr', consent: false, website: ''}
  ]) {
    const response = await subscribe(request(body), env);
    assert.equal(response.status, 400);
    assert.equal((await response.json()).ok, false);
  }
  const trap = await subscribe(request({email: 'bot@example.com', locale: 'tr', consent: true, website: 'spam'}), env);
  assert.equal(trap.status, 202);
  assert.equal(env.sqlite.prepare('SELECT count(*) AS count FROM subscribers').get().count, 0);
});

test('duplicate email variants remain one pending subscription', async () => {
  const env = testEnv();
  const first = await subscribe(request({email: 'Reader@Example.com', locale: 'tr', consent: true, website: ''}), env);
  const second = await subscribe(request({email: ' reader@example.COM ', locale: 'tr', consent: true, website: ''}), env);
  assert.equal(first.status, 202);
  assert.equal(second.status, 202);
  const row = env.sqlite.prepare('SELECT count(*) AS count, locale FROM subscribers').get();
  assert.equal(row.count, 1);
  assert.equal(row.locale, 'tr');
  assert.equal(env.mail.length, 2);
});

test('confirmation token works once while tampered and expired tokens change nothing', async () => {
  const env = testEnv();
  await subscribe(request({email: 'reader@example.com', locale: 'tr', consent: true, website: ''}), env);
  const token = new URL(env.mail[0].confirmUrl).searchParams.get('token');
  assert.equal((await confirm(`${token}x`, env)).status, 400);
  assert.equal(env.sqlite.prepare('SELECT status FROM subscribers').get().status, 'pending');
  assert.equal((await confirm(token, env)).status, 200);
  assert.equal(env.sqlite.prepare('SELECT status FROM subscribers').get().status, 'confirmed');
  assert.equal((await confirm(token, env)).status, 400);

  const expired = createToken();
  const expiredHash = await hashToken(expired, env.TOKEN_SECRET);
  env.sqlite.prepare("INSERT INTO tokens (subscriber_id,purpose,token_hash,expires_at,created_at) VALUES (1,'confirm',?,?,?)")
    .run(expiredHash, new Date(Date.now() - 60_000).toISOString(), new Date().toISOString());
  assert.equal((await confirm(expired, env)).status, 400);
});

test('valid unsubscribe token changes a confirmed subscription only once', async () => {
  const env = testEnv();
  env.sqlite.prepare("INSERT INTO subscribers (email,email_normalized,locale,status,consented_at,created_at,updated_at) VALUES (?,?,?,?,?,?,?)")
    .run('reader@example.com', 'reader@example.com', 'tr', 'confirmed', new Date().toISOString(), new Date().toISOString(), new Date().toISOString());
  const token = createToken();
  const tokenHash = await hashToken(token, env.TOKEN_SECRET);
  env.sqlite.prepare("INSERT INTO tokens (subscriber_id,purpose,token_hash,expires_at,created_at) VALUES (1,'unsubscribe',?,?,?)")
    .run(tokenHash, new Date(Date.now() + 60_000).toISOString(), new Date().toISOString());
  assert.equal((await unsubscribe(token, env)).status, 200);
  assert.equal(env.sqlite.prepare('SELECT status FROM subscribers').get().status, 'unsubscribed');
  assert.equal((await unsubscribe(token, env)).status, 400);
});

test('worker allows only the two production origins and returns structured errors', async () => {
  const env = testEnv();
  const denied = await worker.fetch(new Request('https://bulten.patikadergi.org/v1/subscribe', {
    method: 'POST', headers: {origin: 'https://example.com', 'content-type': 'application/json'},
    body: JSON.stringify({email: 'a@example.com', locale: 'tr', consent: true, website: ''})
  }), env);
  assert.equal(denied.status, 403);
  assert.equal((await denied.json()).error.code, 'origin_not_allowed');

  const allowed = await worker.fetch(new Request('https://bulten.patikadergi.org/v1/missing', {
    headers: {origin: 'https://www.patikadergi.org'}
  }), env);
  assert.equal(allowed.status, 404);
  assert.equal(allowed.headers.get('access-control-allow-origin'), 'https://www.patikadergi.org');
  assert.deepEqual(Object.keys((await allowed.json()).error).sort(), ['code', 'message']);
});
