import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
const root = resolve(import.meta.dirname, '..');
const notice = '© 2026 Patika Dergi. Tüm hakları saklıdır.';
const pageIds = ['index.html', 'doga.html', 'gezi.html', 'sanat.html', 'felsefe.html', 'hakkimizda.html', 'iletisim.html', '404.html', 'gizlilik.html'];

test('every Turkish page displays the Patika Dergi copyright notice', () => {
  for (const file of pageIds) {
    const source = readFileSync(resolve(root, file), 'utf8');
    assert.ok(source.includes(notice), `${file}: copyright`);
  }
});

test('copyright notice does not claim trademark registration', () => {
  assert.doesNotMatch(notice, /[®™]/);
});
