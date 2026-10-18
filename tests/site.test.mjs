import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const pages = ['index.html', 'doga.html', 'gezi.html', 'sanat.html', 'felsefe.html', 'hakkimizda.html', 'iletisim.html'];
const articles = [
  'yazilar/ormanin-hafizasi.html',
  'yazilar/istrancalarda-sessiz-bir-sabah.html',
  'yazilar/kiyikoy-bir-yolun-pesinde.html',
  'yazilar/geliboluda-ruzgarin-izleri.html',
  'yazilar/bir-resme-bakmanin-sessizligi.html',
  'yazilar/muzigin-gorunmeyen-cografyasi.html',
  'yazilar/ozgurluk-bir-varis-degil-bir-patikadir.html',
  'yazilar/spinoza-doganin-icindeki-insan.html',
  'yazilar/bizi-kimse-yonetmesin.html',
  'yazilar/rembrandt-isik-ve-golgenin-ressami.html',
  'yazilar/saray-laladere-ormanin-icinde-yavaslayan-zaman.html'
];
const html = file => readFileSync(resolve(root, file), 'utf8');

test('all required publication files exist', () => {
  for (const file of [...pages, ...articles, '404.html', 'robots.txt', 'sitemap.xml', 'assets/images/logo-mark.svg']) {
    assert.ok(existsSync(resolve(root, file)), file);
  }
});

test('every page uses shared design and complete navigation', () => {
  for (const file of [...pages, ...articles]) {
    const source = html(file);
    assert.match(source, /style\.css/);
    assert.match(source, /main\.js/);
    for (const label of ['Ana Sayfa', 'Doğa', 'Gezi', 'Sanat', 'Felsefe', 'Hakkımızda', 'İletişim']) {
      assert.ok(source.includes(label), `${file}: ${label}`);
    }
  }
});

test('internal links and assets resolve to files', () => {
  for (const file of [...pages, ...articles, '404.html']) {
    for (const match of html(file).matchAll(/(?:href|src)="([^"]+)"/g)) {
      const target = match[1];
      if (/^(?:https?:|mailto:|#|data:)/.test(target)) continue;
      const clean = target.split(/[?#]/)[0];
      const resolved = clean.startsWith('/') ? resolve(root, clean.slice(1)) : resolve(root, dirname(file), clean);
      assert.ok(existsSync(resolved), `${file} -> ${target}`);
    }
  }
});

test('each page has accessible document metadata', () => {
  for (const file of [...pages, ...articles, '404.html']) {
    const source = html(file);
    assert.match(source, /<html lang="tr">/);
    assert.match(source, /<meta name="viewport"/);
    assert.match(source, /<meta name="description" content="[^"]+"/);
    assert.match(source, /<title>[^<]+<\/title>/);
  }
});

test('published pages expose canonical and social metadata', () => {
  for (const file of [...pages, ...articles]) {
    const source = html(file);
    assert.match(source, /<link rel="canonical" href="https:\/\/patikadergi\.org\/[^"]*">/, `${file}: canonical`);
    assert.match(source, /<meta property="og:title" content="[^"]+">/, `${file}: og:title`);
    assert.match(source, /<meta property="og:description" content="[^"]+">/, `${file}: og:description`);
  }
});

test('approved identity and contact details are present', () => {
  assert.ok(html('index.html').includes('Doğadan İnsana, İnsandan Özgürlüğe.'));
  assert.ok(html('iletisim.html').includes('mailto:trocki22@outlook.com'));
  assert.ok(html('iletisim.html').includes('https://www.instagram.com/trocki22/'));
  assert.match(html('iletisim.html'), /data-visitor-count/);
});

test('visitor counter appears only on home and contact', () => {
  for (const file of [...pages, ...articles, '404.html']) {
    const source = html(file);
    const expected = file === 'index.html' || file === 'iletisim.html';
    assert.equal(source.includes('data-visitor-count'), expected, file);
    assert.equal(source.includes('counter.browser.min.js'), expected, `${file}: counter service`);
  }
});

test('felsefe publishes Bizi Kimse Yönetmesin as a complete signed long read', () => {
  const articlePath = resolve(root, 'yazilar/bizi-kimse-yonetmesin.html');
  assert.ok(existsSync(articlePath), 'yazilar/bizi-kimse-yonetmesin.html');
  const listing = html('felsefe.html');
  const article = html('yazilar/bizi-kimse-yonetmesin.html');

  assert.match(listing, /href="yazilar\/bizi-kimse-yonetmesin\.html"/);
  assert.match(listing, /<h3>Bizi Kimse Yönetmesin<\/h3>/);
  assert.match(article, /<h1 class="article-title">Bizi Kimse Yönetmesin<\/h1>/);
  assert.ok(article.includes('Bilinçli Bir Toplumun Kendi Kendini Yönetmesi Üzerine'));
  assert.ok(article.includes('ORTAK YAŞAMIMIZI BİRLİKTE NASIL YÖNETECEĞİZ?'));
  assert.match(article, /<p class="article-signature">Troçki<\/p>/);
  assert.match(article, /href="https:\/\/theanarchistlibrary\.org\/library\/murray-bookchin-the-meaning-of-confederalism"/);
  assert.match(article, /href="https:\/\/www\.ditext\.com\/proudhon\/federation\/federation\.html"/);
  assert.ok(article.includes('../assets/images/bizi-kimse-yonetmesin-kapak.png'));
});

test('sanat page exposes the four approved editorial categories', () => {
  const source = html('sanat.html');
  for (const category of [
    'Heykel',
    'Sanat Tarihi',
    'Resim ve Ressamlar',
    'Yağlı Boya Tablolar ve Yorumları'
  ]) {
    assert.ok(source.includes(category), `sanat.html: ${category}`);
  }
  assert.match(source, /id="sanat-kategorileri"/);
});

test('heykel category card opens the sculpture collection', () => {
  const source = html('sanat.html');
  assert.match(
    source,
    /<a class="article-card" id="heykel" href="#heykel-eserleri"[\s\S]*?<h3>Heykel<\/h3>[\s\S]*?<\/a>/
  );
});

test('remaining art category cards open their illustrated collections', () => {
  const source = html('sanat.html');
  const collections = [
    {
      card: 'sanat-tarihi',
      target: 'sanat-tarihi-eserleri',
      image: 'assets/images/sanat-tarihi-beytullahim-yildizi.jpg'
    },
    {
      card: 'resim-ve-ressamlar',
      target: 'resim-ve-ressamlar-eserleri',
      image: 'assets/images/resim-ve-ressamlar-soyut-kompozisyon.jpg'
    },
    {
      card: 'yagli-boya-tablo-yorumlari',
      target: 'yagli-boya-eserleri',
      image: 'assets/images/yagli-boya-akiskan-soyut.jpg'
    }
  ];

  for (const collection of collections) {
    assert.match(source, new RegExp(`<a class="article-card" id="${collection.card}" href="#${collection.target}"`));
    assert.match(source, new RegExp(`id="${collection.target}"`));
    assert.ok(source.includes(collection.image), `sanat.html: ${collection.image}`);
    assert.ok(existsSync(resolve(root, collection.image)), collection.image);
  }

  assert.equal((source.match(/data-lightbox-image/g) ?? []).length, 5);
});

test('sanat page publishes the two approved Renaissance sculptures', () => {
  const source = html('sanat.html');
  const sculptures = [
    {
      title: 'Lux Animae – Ruhun Işığı',
      artist: 'Atölye di Troçki, Michelangelo ekolünden',
      date: '1498',
      image: 'assets/images/lux-animae-ruhun-isigi.jpg'
    },
    {
      title: 'Pondus Scientiae – Bilginin Yükü',
      artist: 'Maestro Pierre di Notte, Donatello geleneğinden',
      date: '1512',
      image: 'assets/images/pondus-scientiae-bilginin-yuku.jpg'
    }
  ];

  assert.match(source, /id="heykel-eserleri"/);
  for (const sculpture of sculptures) {
    assert.ok(source.includes(sculpture.title), `sanat.html: ${sculpture.title}`);
    assert.ok(source.includes(sculpture.artist), `sanat.html: ${sculpture.artist}`);
    assert.ok(source.includes(sculpture.date), `sanat.html: ${sculpture.date}`);
    assert.ok(source.includes(sculpture.image), `sanat.html: ${sculpture.image}`);
    assert.ok(existsSync(resolve(root, sculpture.image)), sculpture.image);
  }
  assert.ok(source.includes('İkisi birlikte Rönesans’ın iki yüzü'));
});

test('sanat page publishes the two approved Renaissance oil paintings', () => {
  const paintings = [
    {
      image: 'assets/images/lux-animae-ruhun-isigi-yagli-boya.jpg',
      markers: ['Lux Animae – Ruhun Işığı', 'Atölye di Troçki, Floransa ekolü', '1503, tuval üzerine yağlı boya']
    },
    {
      image: 'assets/images/pondus-scientiae-bilginin-yuku-yagli-boya.jpg',
      markers: ['Pondus Scientiae – Bilginin Yükü', 'Maestro Pierre di Notte, Venedik atölyesi', '1517, ahşap panel üzerine yağlı boya']
    }
  ];

  const source = html('sanat.html');
  assert.match(source, /id="yagli-boya-eserleri"/);
  for (const painting of paintings) {
    assert.ok(source.includes(painting.image), `sanat.html: ${painting.image}`);
    assert.ok(existsSync(resolve(root, painting.image)), painting.image);
    for (const marker of painting.markers) {
      assert.ok(source.includes(marker), `sanat.html: ${marker}`);
    }
  }

  for (const painting of paintings) {
    assert.match(
      source,
      new RegExp(`data-lightbox-image[^>]+data-full-src="${painting.image.replaceAll('.', '\\.')}"`)
    );
  }
  assert.match(source, /role="dialog"/);
  assert.match(source, /data-lightbox-close/);
  assert.match(source, /assets\/css\/style\.css\?v=oil-lightbox-2/);
  assert.match(source, /assets\/js\/main\.js\?v=oil-lightbox-2/);
  assert.match(html('assets/js/main.js'), /setupImageLightbox/);
});

test('resim ve ressamlar publishes the complete Rembrandt feature', () => {
  const listing = html('sanat.html');
  const articlePath = 'yazilar/rembrandt-isik-ve-golgenin-ressami.html';
  const article = html(articlePath);
  const artworks = [
    ['Dr. Nicolaes Tulp’un Anatomi Dersi', 'assets/images/rembrandt-anatomi-dersi.jpg'],
    ['Gece Devriyesi', 'assets/images/rembrandt-gece-devriyesi.jpg'],
    ['Yahudi Gelin', 'assets/images/rembrandt-yahudi-gelin.jpg'],
    ['Otoportre', 'assets/images/rembrandt-otoportre-1659.jpg']
  ];

  assert.match(listing, /id="resim-ve-ressamlar-eserleri"[\s\S]*?href="yazilar\/rembrandt-isik-ve-golgenin-ressami\.html"/);
  assert.match(listing, /<h3>Rembrandt: Işık ve Gölgenin Ressamı<\/h3>/);
  assert.match(article, /<h1 class="article-title">Rembrandt: Işık ve Gölgenin Ressamı<\/h1>/);
  assert.ok(article.includes('1606–1669'));
  assert.match(article, /href="https:\/\/www\.mauritshuis\.nl\/en\/our-collection\/our-masters\/rembrandt"/);
  assert.match(article, /href="https:\/\/www\.rijksmuseum\.nl\/en\/collection\/SK-C-5"/);
  assert.match(article, /href="https:\/\/www\.nga\.gov\/artworks\/79-self-portrait"/);

  for (const [title, image] of artworks) {
    assert.ok(article.includes(title), `${articlePath}: ${title}`);
    assert.ok(article.includes(`../${image}`), `${articlePath}: ${image}`);
    assert.ok(existsSync(resolve(root, image)), image);
  }
  assert.equal((article.match(/data-lightbox-image/g) ?? []).length, 4);
  assert.match(article, /role="dialog"/);
  assert.match(article, /data-lightbox-close/);
});

test('gezi publishes the complete Saray Laladere feature', () => {
  const listing = html('gezi.html');
  const articlePath = 'yazilar/saray-laladere-ormanin-icinde-yavaslayan-zaman.html';
  const article = html(articlePath);
  const images = [
    'assets/images/laladere-orman-parki-1.jpg',
    'assets/images/laladere-orman-parki-2.jpg',
    'assets/images/laladere-orman-parki-3.jpg',
    'assets/images/laladere-orman-parki-4.jpg'
  ];

  assert.match(listing, /href="yazilar\/saray-laladere-ormanin-icinde-yavaslayan-zaman\.html"/);
  assert.match(listing, /<h3>Saray Laladere: Ormanın İçinde Yavaşlayan Zaman<\/h3>/);
  assert.match(article, /<h1 class="article-title">Saray Laladere: Ormanın İçinde Yavaşlayan Zaman<\/h1>/);
  assert.ok(article.includes('Güngörmez Mahallesi'));
  assert.ok(article.includes('geceleme ve ateş kuralları'));
  assert.match(article, /href="https:\/\/benimormanim\.ogm\.gov\.tr\/orman-parklari\/laladere-orman-parki-661"/);
  assert.match(article, /href="https:\/\/www\.saray\.bel\.tr\/icerik\/dogal-guzellikler"/);

  for (const image of images) {
    assert.ok(article.includes(`../${image}`), `${articlePath}: ${image}`);
    assert.ok(existsSync(resolve(root, image)), image);
  }
  assert.equal((article.match(/data-lightbox-image/g) ?? []).length, 4);
  assert.equal((article.match(/temsili görsel/g) ?? []).length, 4);
  assert.match(article, /role="dialog"/);
  assert.match(article, /data-lightbox-close/);
});

test('articles expose reading metadata and related reading', () => {
  for (const file of articles) {
    const source = html(file);
    assert.match(source, /(?:18|20) Eylül 2026/);
    assert.match(source, /\d+ dk okuma/);
    assert.match(source, /Patikada devam et/);
  }
});

test('launch articles meet the long-form editorial contract', () => {
  for (const file of articles) {
    const source = html(file);
    const prose = source.match(/<article class="prose">([\s\S]*?)<\/article>/)?.[1] ?? '';
    const words = prose.replace(/<[^>]+>/g, ' ').trim().split(/\s+/).filter(Boolean);
    assert.ok(words.length >= 650, `${file}: ${words.length} words`);
    assert.ok((prose.match(/<h2>/g) ?? []).length >= 3, `${file}: at least three sections`);
    assert.match(prose, /<blockquote>/);
  }
});
