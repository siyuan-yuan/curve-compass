CREATE TABLE IF NOT EXISTS email_subscribers (
 id TEXT PRIMARY KEY, email TEXT NOT NULL UNIQUE, active INTEGER NOT NULL DEFAULT 0,
 pending_hash TEXT, expires_at INTEGER, created_at INTEGER NOT NULL, verified_at INTEGER
);
CREATE TABLE IF NOT EXISTS email_delivery (
 subscriber_id TEXT NOT NULL, signal_date TEXT NOT NULL, signal TEXT NOT NULL,
 status TEXT NOT NULL, lease_until INTEGER NOT NULL DEFAULT 0, attempts INTEGER NOT NULL DEFAULT 0,
 provider_id TEXT, PRIMARY KEY(subscriber_id,signal_date,signal)
);
CREATE TABLE IF NOT EXISTS email_limits (key TEXT PRIMARY KEY, count INTEGER NOT NULL, expires_at INTEGER NOT NULL);
