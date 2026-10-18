import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const homes = [['index.html', 'tr', 'gizlilik.html']];

test('Turkish home page exposes a complete newsletter form', () => {
  for (const [file, locale, privacy] of homes) {
    const source = readFileSync(resolve(root, file), 'utf8');
    assert.match(source, /data-newsletter-form/, file);
    assert.match(source, /type="email"[^>]+name="email"/, `${file}: email`);
    assert.match(source, new RegExp(`name="locale" value="${locale}"`), `${file}: locale`);
    assert.match(source, /type="checkbox"[^>]+name="consent"/, `${file}: consent`);
    assert.match(source, /name="website"[^>]+tabindex="-1"/, `${file}: honeypot`);
    assert.match(source, /data-newsletter-submit/, `${file}: submit`);
    assert.match(source, /data-newsletter-status[^>]+aria-live="polite"/, `${file}: status`);
    assert.ok(source.includes(`href="${privacy}"`), `${file}: privacy link`);
  }
});

test('Turkish privacy page exists with the correct language', () => {
  const pages = [['gizlilik.html', 'tr']];
  for (const [file, locale] of pages) {
    assert.ok(existsSync(resolve(root, file)), file);
    const source = readFileSync(resolve(root, file), 'utf8');
    assert.match(source, new RegExp(`<html lang="${locale}">`));
    assert.ok(source.includes('trocki22@outlook.com'));
  }
  const sitemap = readFileSync(resolve(root, 'sitemap.xml'), 'utf8');
  for (const [file] of pages) assert.ok(sitemap.includes(`https://patikadergi.org/${file}`));
});

test('release text files contain no API key or live token', () => {
  const files = [];
  const walk = directory => {
    for (const name of readdirSync(directory)) {
      if (['.git', '.worktrees', '.superpowers', 'node_modules', 'dist', 'docs'].includes(name)) continue;
      const path = resolve(directory, name);
      if (statSync(path).isDirectory()) walk(path);
      else if (/\.(?:html|js|mjs|jsonc|md|sql|xml|txt)$/i.test(name)) files.push(path);
    }
  };
  walk(root);
  for (const file of files) {
    const source = readFileSync(file, 'utf8');
    assert.doesNotMatch(source, /RESEND_API_KEY\s*=/, file);
    assert.doesNotMatch(source, /\bre_[A-Za-z0-9_-]{20,}\b/, file);
  }
});
