import { writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const pages = [
  '', 'doga.html', 'gezi.html', 'sanat.html', 'felsefe.html', 'hakkimizda.html', 'iletisim.html', 'gizlilik.html',
  'yazilar/ormanin-hafizasi.html', 'yazilar/istrancalarda-sessiz-bir-sabah.html',
  'yazilar/kiyikoy-bir-yolun-pesinde.html', 'yazilar/geliboluda-ruzgarin-izleri.html',
  'yazilar/bir-resme-bakmanin-sessizligi.html', 'yazilar/muzigin-gorunmeyen-cografyasi.html',
  'yazilar/ozgurluk-bir-varis-degil-bir-patikadir.html', 'yazilar/spinoza-doganin-icindeki-insan.html',
  'yazilar/bizi-kimse-yonetmesin.html', 'yazilar/rembrandt-isik-ve-golgenin-ressami.html',
  'yazilar/saray-laladere-ormanin-icinde-yavaslayan-zaman.html'
];
const nodes = pages.map(page => `  <url><loc>https://patikadergi.org/${page}</loc></url>`).join('\n');
await writeFile(resolve(root, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${nodes}\n</urlset>\n`);
