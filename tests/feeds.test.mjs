import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
test('Turkish feed publishes eleven stable article items including the Laladere feature', () => {
  const source = readFileSync(resolve(root, 'feed.xml'), 'utf8');
  assert.match(source, /<rss version="2\.0"/);
  assert.equal((source.match(/<item>/g) ?? []).length, 11);
  assert.equal((source.match(/<guid isPermaLink="false">patika:tr:/g) ?? []).length, 11);
  assert.equal((source.match(/<pubDate>/g) ?? []).length, 11);
  assert.match(source, /<title>Bizi Kimse Yönetmesin<\/title>/);
  assert.match(source, /yazilar\/bizi-kimse-yonetmesin\.html/);
  assert.match(source, /Sun, 20 Sep 2026 09:00:00 GMT/);
  assert.match(source, /<title>Rembrandt: Işık ve Gölgenin Ressamı<\/title>/);
  assert.match(source, /yazilar\/rembrandt-isik-ve-golgenin-ressami\.html/);
  assert.match(source, /<title>Saray Laladere: Ormanın İçinde Yavaşlayan Zaman<\/title>/);
  assert.match(source, /yazilar\/saray-laladere-ormanin-icinde-yavaslayan-zaman\.html/);
});
