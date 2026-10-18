PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS subscribers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL,
  email_normalized TEXT NOT NULL UNIQUE,
  locale TEXT NOT NULL CHECK (locale = 'tr'),
  status TEXT NOT NULL CHECK (status IN ('pending','confirmed','unsubscribed')),
  consented_at TEXT NOT NULL,
  confirmed_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS tokens (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  subscriber_id INTEGER NOT NULL REFERENCES subscribers(id) ON DELETE CASCADE,
  purpose TEXT NOT NULL CHECK (purpose IN ('confirm','unsubscribe')),
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TEXT NOT NULL,
  used_at TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS publications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  guid TEXT NOT NULL UNIQUE,
  locale TEXT NOT NULL CHECK (locale = 'tr'),
  title TEXT NOT NULL,
  summary TEXT NOT NULL,
  url TEXT NOT NULL,
  published_at TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS deliveries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  publication_id INTEGER NOT NULL REFERENCES publications(id) ON DELETE CASCADE,
  subscriber_id INTEGER NOT NULL REFERENCES subscribers(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued','sent')),
  attempts INTEGER NOT NULL DEFAULT 0,
  last_error TEXT,
  sent_at TEXT,
  created_at TEXT NOT NULL,
  UNIQUE(publication_id, subscriber_id)
);

CREATE TABLE IF NOT EXISTS delivery_attempts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  delivery_id INTEGER NOT NULL REFERENCES deliveries(id) ON DELETE CASCADE,
  attempted_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_subscribers_status_locale ON subscribers(status, locale);
CREATE INDEX IF NOT EXISTS idx_tokens_lookup ON tokens(token_hash, purpose, used_at);
CREATE INDEX IF NOT EXISTS idx_publications_locale_date ON publications(locale, published_at);
CREATE INDEX IF NOT EXISTS idx_deliveries_status ON deliveries(status, sent_at);
CREATE INDEX IF NOT EXISTS idx_delivery_attempts_date ON delivery_attempts(attempted_at);
