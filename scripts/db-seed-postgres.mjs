#!/usr/bin/env node
/** Run apps/postgres/seed/example.sql via psql. Requires: pnpm db:up and pnpm db:migrate first. */
import { createReadStream } from 'fs';
import { spawn, spawnSync } from 'child_process';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const rootDir = join(dirname(fileURLToPath(import.meta.url)), '..');
const composeFile = join(rootDir, 'compose.yml');

function pgIsReady() {
  const r = spawnSync(
    'docker',
    ['compose', '-f', composeFile, 'exec', '-T', 'postgres', 'pg_isready', '-U', 'user', '-d', 'myapp'],
    { cwd: rootDir, encoding: 'utf8' }
  );
  return r.status === 0;
}

if (!pgIsReady()) {
  console.error(
    'Postgres is not ready or not running. Run: pnpm db:up then pnpm db:migrate (or pnpm db:ready).'
  );
  process.exit(1);
}

const proc = spawn(
  'docker',
  ['compose', '-f', composeFile, 'exec', '-T', 'postgres', 'psql', '-U', 'user', '-d', 'myapp'],
  { stdio: ['pipe', 'inherit', 'inherit'], cwd: rootDir }
);
createReadStream(join(rootDir, 'apps/postgres/seed/example.sql')).pipe(proc.stdin);
proc.on('close', (code) => process.exit(code ?? 0));
