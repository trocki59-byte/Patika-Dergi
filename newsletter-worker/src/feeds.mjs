export const feedUrls = {tr: 'https://patikadergi.org/feed.xml'};

function decodeXml(value = '') {
  return value.replaceAll('&lt;', '<').replaceAll('&gt;', '>').replaceAll('&quot;', '"').replaceAll('&apos;', "'").replaceAll('&amp;', '&');
}

function field(block, name) {
  const match = block.match(new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${name}>`, 'i'));
  return decodeXml(match?.[1]?.replace(/^<!\[CDATA\[|\]\]>$/g, '').trim() || '');
}

export function parseFeed(xml, locale) {
  return [...xml.matchAll(/<item>([\s\S]*?)<\/item>/gi)].map(match => ({
    guid: field(match[1], 'guid'),
    locale,
    title: field(match[1], 'title'),
    summary: field(match[1], 'description'),
    url: field(match[1], 'link'),
    publishedAt: new Date(field(match[1], 'pubDate')).toISOString()
  })).filter(item => item.guid && item.title && item.url);
}

export async function enqueuePublication(item, env) {
  const now = new Date().toISOString();
  const inserted = await env.DB.prepare(`
    INSERT OR IGNORE INTO publications (guid,locale,title,summary,url,published_at,created_at)
    VALUES (?,?,?,?,?,?,?)
  `).bind(item.guid, item.locale, item.title, item.summary, item.url, item.publishedAt, now).run();
  if (!inserted.meta?.changes) return false;
  const publication = await env.DB.prepare('SELECT id FROM publications WHERE guid=?').bind(item.guid).first();
  await env.DB.prepare(`
    INSERT OR IGNORE INTO deliveries (publication_id,subscriber_id,status,created_at)
    SELECT ?,id,'queued',? FROM subscribers WHERE status='confirmed' AND locale=?
  `).bind(publication.id, now, item.locale).run();
  return true;
}

export async function pollFeeds(env) {
  let created = 0;
  for (const [locale, url] of Object.entries(feedUrls)) {
    const response = await fetch(url, {headers: {'user-agent': 'PatikaDergiNewsletter/1.0'}});
    if (!response.ok) throw new Error(`Feed request failed for ${locale}: ${response.status}`);
    for (const item of parseFeed(await response.text(), locale)) {
      if (await enqueuePublication(item, env)) created += 1;
    }
  }
  return created;
}
