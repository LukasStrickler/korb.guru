#!/usr/bin/env node
/**
 * Full reset: wipe Postgres + Qdrant, start both, migrate, seed both.
 * Run from repo root: pnpm db:reset (loads root .env for DATABASE_URL / QDRANT_URL).
 */
import { spawn, spawnSync } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync } from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, '..');
const composeFile = join(rootDir, 'compose.yml');

function run(cmd, args, opts = {}) {
  return new Promise((resolve, reject) => {
    const p = spawn(cmd, args, { stdio: 'inherit', cwd: rootDir, ...opts });
    p.on('close', (code) => (code === 0 ? resolve() : reject(new Error(`${cmd} ${args.join(' ')} exited ${code}`))));
  });
}

const HEALTH_TIMEOUT_MS = 60_000;
const HEALTH_POLL_MS = 1_500;

async function waitFor(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function execOk(cmd, args, opts = {}) {
  const r = spawnSync(cmd, args, { cwd: rootDir, encoding: 'utf8', ...opts });
  return r.status === 0;
}

async function waitForPostgres() {
  const start = Date.now();
  while (Date.now() - start < HEALTH_TIMEOUT_MS) {
    const ok = execOk('docker', [
      'compose',
      '-f',
      composeFile,
      'exec',
      '-T',
      'postgres',
      'pg_isready',
      '-U',
      'user',
      '-d',
      'myapp',
    ]);
    if (ok) return;
    await waitFor(HEALTH_POLL_MS);
  }
  throw new Error('Postgres did not become ready within ' + HEALTH_TIMEOUT_MS / 1000 + 's');
}

async function waitForQdrant() {
  const start = Date.now();
  while (Date.now() - start < HEALTH_TIMEOUT_MS) {
    try {
      const res = await fetch('http://localhost:6333/readyz', { method: 'GET' });
      if (res.ok) return;
    } catch {
      // ignore
    }
    await waitFor(HEALTH_POLL_MS);
  }
  throw new Error('Qdrant did not become ready within ' + HEALTH_TIMEOUT_MS / 1000 + 's');
}

async function main() {
  if (!existsSync(composeFile)) {
    console.error('compose.yml not found. Run from repo root.');
    process.exit(1);
  }

  const assertLocal = spawn('node', [join(rootDir, 'scripts', 'db-assert-local.mjs'), 'reset'], {
    stdio: 'inherit',
    cwd: rootDir,
    env: process.env,
  });
  const assertCode = await new Promise((resolve) => assertLocal.on('close', resolve));
  if (assertCode !== 0) process.exit(assertCode ?? 1);

  console.log('Stopping and removing volumes...');
  await run('docker', ['compose', '-f', composeFile, 'down', '-v']);

  console.log('Starting Postgres and Qdrant...');
  await run('docker', ['compose', '-f', composeFile, 'up', '-d']);

  console.log('Waiting for Postgres and Qdrant to be ready...');
  await Promise.all([waitForPostgres(), waitForQdrant()]);

  console.log('Running Postgres migrations (Alembic)...');
  const apiDir = join(rootDir, 'apps', 'api');
  const migrate = spawn('uv', ['run', '--project', join(rootDir, 'apps', 'api'), 'alembic', 'upgrade', 'head'], {
    stdio: 'inherit',
    cwd: apiDir,
    env: process.env,
  });
  const migrateCode = await new Promise((resolve) => migrate.on('close', resolve));
  if (migrateCode !== 0) process.exit(migrateCode);

  console.log('Seeding Postgres...');
  const seedPg = spawn('node', [join(rootDir, 'scripts', 'db-seed-postgres.mjs')], {
    stdio: 'inherit',
    cwd: rootDir,
  });
  const seedPgCode = await new Promise((resolve) => seedPg.on('close', resolve));
  if (seedPgCode !== 0) process.exit(seedPgCode);

  console.log('Seeding Qdrant...');
  const seedQdrant = spawn('node', [join(rootDir, 'apps', 'qdrant', 'scripts', 'seed-qdrant.mjs')], {
    stdio: 'inherit',
    cwd: rootDir,
    env: process.env,
  });
  const seedQdrantCode = await new Promise((resolve) => seedQdrant.on('close', resolve));
  if (seedQdrantCode !== 0) process.exit(seedQdrantCode);

  console.log('Done. Local DB reset with example data.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
