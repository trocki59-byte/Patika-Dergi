import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { enqueuePublication, feedUrls } from '../src/feeds.mjs';
import { deliverQueued } from '../src/delivery.mjs';

class D1Statement {
  constructor(statement) { this.statement = statement; this.values = []; }
  bind(...values) { this.values = values; return this; }
  first() { return this.statement.get(...this.values) ?? null; }
  all() { return {results: this.statement.all(...this.values)}; }
  run() { const result = this.statement.run(...this.values); return {success: true, meta: {changes: result.changes, last_row_id: Number(result.lastInsertRowid)}}; }
}

function testEnv({fail = false} = {}) {
  const sqlite = new DatabaseSync(':memory:');
  sqlite.exec(readFileSync(resolve(import.meta.dirname, '../schema.sql'), 'utf8'));
  const mail = [];
  return {
    DB: {prepare: sql => new D1Statement(sqlite.prepare(sql))},
    TOKEN_SECRET: 'test-secret-at-least-32-characters-long',
    PUBLIC_URL: 'https://bulten.patikadergi.org',
    FROM_EMAIL: 'Patika Dergi <bulten@patikadergi.org>',
    SEND_EMAIL: async message => { mail.push(message); if (fail) throw new Error('resend unavailable'); },
    sqlite,
    mail
  };
}

function addSubscriber(env, index, locale = 'tr') {
  const now = new Date().toISOString();
  env.sqlite.prepare("INSERT INTO subscribers (email,email_normalized,locale,status,consented_at,confirmed_at,created_at,updated_at) VALUES (?,?,?,'confirmed',?,?,?,?)")
    .run(`reader${index}@example.com`, `reader${index}@example.com`, locale, now, now, now, now);
}

const item = (guid = 'patika:tr:new-story', locale = 'tr') => ({
  guid, locale, title: 'Yeni Yazı', summary: 'Yeni yazının özeti.',
  url: 'https://patikadergi.org/yazilar/yeni-yazi.html', publishedAt: '2026-09-19T08:00:00.000Z'
});

test('newsletter polls only the Turkish feed', () => {
  assert.deepEqual(feedUrls, {tr: 'https://patikadergi.org/feed.xml'});
});

test('same RSS guid is queued once for confirmed subscribers', async () => {
  const env = testEnv();
  addSubscriber(env, 1, 'tr');
  assert.equal(await enqueuePublication(item(), env), true);
  assert.equal(await enqueuePublication(item(), env), false);
  assert.equal(env.sqlite.prepare('SELECT count(*) AS count FROM publications').get().count, 1);
  const delivery = env.sqlite.prepare('SELECT s.locale FROM deliveries d JOIN subscribers s ON s.id=d.subscriber_id').get();
  assert.equal(delivery.locale, 'tr');
});

test('daily limit sends one hundred and leaves the next recipient queued', async () => {
  const env = testEnv();
  for (let index = 0; index < 101; index += 1) addSubscriber(env, index);
  await enqueuePublication(item(), env);
  const result = await deliverQueued(env, 100);
  assert.equal(result.sent, 100);
  assert.equal(result.remaining, 1);
  assert.equal(env.mail.length, 100);
  assert.equal(env.sqlite.prepare("SELECT count(*) AS count FROM deliveries WHERE status='queued'").get().count, 1);
});

test('provider errors keep delivery retryable and record the attempt', async () => {
  const env = testEnv({fail: true});
  addSubscriber(env, 1);
  await enqueuePublication(item(), env);
  const result = await deliverQueued(env, 100);
  assert.equal(result.sent, 0);
  const delivery = env.sqlite.prepare('SELECT status,attempts,last_error FROM deliveries').get();
  assert.equal(delivery.status, 'queued');
  assert.equal(delivery.attempts, 1);
  assert.match(delivery.last_error, /resend unavailable/);
});

test('failed provider calls also consume the hard daily attempt budget', async () => {
  const env = testEnv({fail: true});
  for (let index = 0; index < 101; index += 1) addSubscriber(env, index);
  await enqueuePublication(item(), env);
  const first = await deliverQueued(env, 100);
  const second = await deliverQueued(env, 100);
  assert.equal(first.attempted, 100);
  assert.equal(second.attempted, 0);
  assert.equal(env.mail.length, 100);
  assert.equal(env.sqlite.prepare('SELECT count(*) AS count FROM delivery_attempts').get().count, 100);
});
