import { readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const articleIds = [
  'yazilar/ormanin-hafizasi.html', 'yazilar/istrancalarda-sessiz-bir-sabah.html',
  'yazilar/kiyikoy-bir-yolun-pesinde.html', 'yazilar/geliboluda-ruzgarin-izleri.html',
  'yazilar/bir-resme-bakmanin-sessizligi.html', 'yazilar/muzigin-gorunmeyen-cografyasi.html',
  'yazilar/ozgurluk-bir-varis-degil-bir-patikadir.html', 'yazilar/spinoza-doganin-icindeki-insan.html',
  'yazilar/bizi-kimse-yonetmesin.html', 'yazilar/rembrandt-isik-ve-golgenin-ressami.html',
  'yazilar/saray-laladere-ormanin-icinde-yavaslayan-zaman.html'
];
const escapeXml = value => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&apos;');
const extract = (html, pattern) => html.match(pattern)?.[1]?.trim() || '';
const items = [];
for (const pageId of articleIds) {
  const html = await readFile(resolve(root, pageId), 'utf8');
  const title = extract(html, /<h1 class="article-title">([\s\S]*?)<\/h1>/) || extract(html, /<title>([\s\S]*?)<\/title>/).split(' — ')[0];
  const summary = extract(html, /<meta name="description" content="([^"]+)"/);
  const url = `https://patikadergi.org/${pageId}`;
  const pubDate = ['yazilar/bizi-kimse-yonetmesin.html', 'yazilar/rembrandt-isik-ve-golgenin-ressami.html', 'yazilar/saray-laladere-ormanin-icinde-yavaslayan-zaman.html'].includes(pageId)
    ? 'Sun, 20 Sep 2026 09:00:00 GMT'
    : 'Fri, 18 Sep 2026 09:00:00 GMT';
  items.push(`<item><title>${escapeXml(title)}</title><description>${escapeXml(summary)}</description><link>${escapeXml(url)}</link><guid isPermaLink="false">patika:tr:${escapeXml(pageId)}</guid><pubDate>${pubDate}</pubDate></item>`);
}
const feed = `<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom"><channel><title>Patika Dergi</title><link>https://patikadergi.org/</link><description>Patika Dergi — doğa, gezi, sanat ve felsefe.</description><language>tr</language><atom:link href="https://patikadergi.org/feed.xml" rel="self" type="application/rss+xml"/>${items.join('')}</channel></rss>\n`;
await writeFile(resolve(root, 'feed.xml'), feed);
