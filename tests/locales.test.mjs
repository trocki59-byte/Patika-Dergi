import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const pageIds = [
  'index.html', 'doga.html', 'gezi.html', 'sanat.html', 'felsefe.html',
  'hakkimizda.html', 'iletisim.html', '404.html', 'gizlilik.html',
  'yazilar/ormanin-hafizasi.html',
  'yazilar/istrancalarda-sessiz-bir-sabah.html',
  'yazilar/kiyikoy-bir-yolun-pesinde.html',
  'yazilar/geliboluda-ruzgarin-izleri.html',
  'yazilar/bir-resme-bakmanin-sessizligi.html',
  'yazilar/muzigin-gorunmeyen-cografyasi.html',
  'yazilar/ozgurluk-bir-varis-degil-bir-patikadir.html',
  'yazilar/spinoza-doganin-icindeki-insan.html'
];

test('site is Turkish-only with no language switchers or alternate editions', () => {
  for (const locale of ['en', 'fr', 'de', 'it']) {
    assert.equal(existsSync(resolve(root, locale)), false, `${locale}/ removed`);
  }
  for (const pageId of pageIds) {
    const source = readFileSync(resolve(root, pageId), 'utf8');
    assert.match(source, /<html lang="tr">/, pageId);
    assert.doesNotMatch(source, /language-switcher/, `${pageId}: no language switcher`);
    assert.doesNotMatch(source, /hreflang=/, `${pageId}: no hreflang`);
    assert.equal((source.match(/rel="canonical"/g) ?? []).length, 1, `${pageId}: one canonical`);
  }
});
