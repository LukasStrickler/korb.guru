#!/usr/bin/env node
/**
 * Generate a new Alembic revision (autogenerate from current models).
 * Usage: pnpm db:migrate:generate [ "revision message" ]
 * Default message: "schema_changes"
 * Loads root .env so DATABASE_URL is set even when not run via pnpm.
 */
import { spawn } from 'child_process';
import { readFileSync, existsSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const rootDir = join(dirname(fileURLToPath(import.meta.url)), '..');
const envPath = join(rootDir, '.env');
if (existsSync(envPath)) {
  const lines = readFileSync(envPath, 'utf8').split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const eq = trimmed.indexOf('=');
      if (eq > 0) {
        const key = trimmed.slice(0, eq).trim();
        let val = trimmed.slice(eq + 1).trim();
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'")))
          val = val.slice(1, -1);
        if (!(key in process.env)) process.env[key] = val;
      }
    }
  }
}
const apiDir = join(rootDir, 'apps', 'api');
const message = process.argv.slice(2).join(' ').trim() || 'schema_changes';

const p = spawn(
  'uv',
  ['run', '--project', apiDir, 'alembic', 'revision', '--autogenerate', '-m', message],
  { stdio: 'inherit', cwd: apiDir, env: process.env }
);
p.on('close', (code) => process.exit(code ?? 0));
