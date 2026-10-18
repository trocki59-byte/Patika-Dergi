import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const archive = resolve(root, 'PATIKA_DERGI_YAYIN.zip');

test('release zip contains the Turkish site, artwork, feed and worker', () => {
  assert.ok(existsSync(archive), 'PATIKA_DERGI_YAYIN.zip');
  const entries = new Set(execFileSync('unzip', ['-Z1', archive], {encoding: 'utf8'}).trim().split('\n'));
  for (const required of [
    'index.html', 'assets/images/lux-animae-ruhun-isigi.jpg',
    'assets/images/pondus-scientiae-bilginin-yuku.jpg',
    'assets/images/lux-animae-ruhun-isigi-yagli-boya.jpg',
    'assets/images/pondus-scientiae-bilginin-yuku-yagli-boya.jpg',
    'assets/images/bizi-kimse-yonetmesin-kapak.png',
    'assets/images/rembrandt-anatomi-dersi.jpg',
    'assets/images/rembrandt-gece-devriyesi.jpg',
    'assets/images/rembrandt-yahudi-gelin.jpg',
    'assets/images/rembrandt-otoportre-1659.jpg',
    'assets/images/laladere-orman-parki-1.jpg',
    'assets/images/laladere-orman-parki-2.jpg',
    'assets/images/laladere-orman-parki-3.jpg',
    'assets/images/laladere-orman-parki-4.jpg',
    'yazilar/bizi-kimse-yonetmesin.html',
    'yazilar/rembrandt-isik-ve-golgenin-ressami.html',
    'yazilar/saray-laladere-ormanin-icinde-yavaslayan-zaman.html',
    'feed.xml',
    'newsletter-worker/src/index.mjs', 'newsletter-worker/schema.sql',
    'newsletter-worker/wrangler.jsonc', 'BULTEN_KURULUM.md'
  ]) assert.ok(entries.has(required), required);
  for (const removed of ['en/index.html', 'fr/index.html', 'de/index.html', 'it/index.html']) {
    assert.equal(entries.has(removed), false, removed);
  }
});
