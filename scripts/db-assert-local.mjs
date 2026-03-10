#!/usr/bin/env node
/**
 * Assert DATABASE_URL and/or QDRANT_URL point at local hosts (localhost, 127.0.0.1, 10.0.2.2).
 * Exits 1 with a clear message if not, unless ALLOW_DESTRUCTIVE_DB=local.
 * Usage: node scripts/db-assert-local.mjs reset | seed:qdrant | migrate
 */
const mode = process.argv[2];
const allow = process.env.ALLOW_DESTRUCTIVE_DB === 'local';

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '10.0.2.2']);

function hostFromUrl(url, defaultHost = '') {
  if (!url || typeof url !== 'string') return defaultHost;
  try {
    const normalized = url.replace(/^postgres(ql)?:\/\//, 'http://');
    const u = new URL(normalized);
    return u.hostname || defaultHost;
  } catch {
    return defaultHost;
  }
}

function isLocal(host) {
  return LOCAL_HOSTS.has(host?.toLowerCase?.() ?? '');
}

if (allow) process.exit(0);

if (mode === 'reset') {
  const dbUrl = process.env.DATABASE_URL;
  const qdrantUrl = process.env.QDRANT_URL || 'http://localhost:6333';
  const dbHost = hostFromUrl(dbUrl, 'localhost');
  const qdrantHost = hostFromUrl(qdrantUrl, 'localhost');
  if (!isLocal(dbHost) || !isLocal(qdrantHost)) {
    console.error(
      'db:reset only allows local DATABASE_URL and QDRANT_URL (localhost, 127.0.0.1, 10.0.2.2).\n' +
        'Current: DATABASE_URL host=' +
        dbHost +
        ', QDRANT_URL host=' +
        qdrantHost +
        '.\n' +
        'Set ALLOW_DESTRUCTIVE_DB=local to override (use only for local dev).'
    );
    process.exit(1);
  }
} else if (mode === 'seed:qdrant') {
  const qdrantUrl = process.env.QDRANT_URL || 'http://localhost:6333';
  const host = hostFromUrl(qdrantUrl, 'localhost');
  if (!isLocal(host)) {
    console.error(
      'db:seed:qdrant only allows local QDRANT_URL (localhost, 127.0.0.1, 10.0.2.2).\n' +
        'Current host=' +
        host +
        '.\n' +
        'Set ALLOW_DESTRUCTIVE_DB=local to override (use only for local dev).'
    );
    process.exit(1);
  }
} else if (mode === 'migrate') {
  const dbUrl = process.env.DATABASE_URL;
  const dbHost = hostFromUrl(dbUrl, 'localhost');
  if (!isLocal(dbHost)) {
    console.error(
      'db:migrate only allows local DATABASE_URL by default (localhost, 127.0.0.1, 10.0.2.2).\n' +
        'Current host=' +
        dbHost +
        '.\n' +
        'For production deploy: run migrations in a one-off job with DATABASE_URL and ALLOW_DESTRUCTIVE_DB=local set by the platform.'
    );
    process.exit(1);
  }
} else {
  console.error('Usage: node scripts/db-assert-local.mjs reset | seed:qdrant | migrate');
  process.exit(1);
}
