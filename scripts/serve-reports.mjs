#!/usr/bin/env node
/**
 * Serve test reports (coverage, mutation) on a fixed port for remote VPS + VS Code port forwarding.
 * Kills any process already on the port, then serves project root so:
 *   - http://localhost:PORT/apps/mobile/coverage/index.html
 *   - http://localhost:PORT/apps/mobile/coverage/mutations/mutation-report.html
 * Usage: node scripts/serve-reports.mjs [PORT]   (default 9327; PORT must be 1–65535)
 */
import { createServer } from 'node:http';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { join, extname, resolve, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const root = join(__dirname, '..');
const rawPort = process.argv[2] || '9327';
const PORT = parseInt(rawPort, 10);
if (Number.isNaN(PORT) || PORT < 1 || PORT > 65535) {
  console.error('Port must be an integer between 1 and 65535.');
  process.exit(1);
}

const REPORT_PATHS = [
  { name: 'Mobile coverage (HTML)', path: '/apps/mobile/coverage/index.html' },
  { name: 'Mobile coverage (JSON)', path: '/apps/mobile/coverage/coverage-final.json' },
  { name: 'Mobile mutation (HTML)', path: '/apps/mobile/coverage/mutations/mutation-report.html' },
  { name: 'Mobile mutation (JSON)', path: '/apps/mobile/coverage/mutations/mutation-report.json' },
];

function getReportMeta() {
  return REPORT_PATHS.map(({ name, path: p }) => {
    const full = join(root, p.replace(/^\//, ''));
    let mtime = null;
    let relative = null;
    if (existsSync(full)) {
      try {
        mtime = statSync(full).mtime;
        const sec = (Date.now() - mtime.getTime()) / 1000;
        if (sec < 60) relative = 'just now';
        else if (sec < 3600) relative = `${Math.round(sec / 60)} min ago`;
        else if (sec < 86400) relative = `${Math.round(sec / 3600)} h ago`;
        else relative = `${Math.round(sec / 86400)} d ago`;
      } catch (_) {}
    }
    return { name, path: p, mtime, relative };
  });
}

function formatMtime(mtime) {
  return mtime ? mtime.toISOString().replace('T', ' ').slice(0, 19) + ' UTC' : null;
}

const MIME = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.ico': 'image/x-icon',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
};

function killPort(port) {
  try {
    if (process.platform === 'win32') {
      const cmd = `for /f "tokens=5" %a in ('netstat -ano ^| findstr :${port}') do taskkill /PID %a 2>nul`;
      execSync(cmd, { shell: 'cmd.exe', stdio: 'ignore' });
      const deadline = Date.now() + 1500;
      while (Date.now() < deadline) {}
      execSync(
        `for /f "tokens=5" %a in ('netstat -ano ^| findstr :${port}') do taskkill /F /PID %a 2>nul`,
        { shell: 'cmd.exe', stdio: 'ignore' }
      );
    } else {
      const out = execSync(`lsof -ti:${port} 2>/dev/null || true`, { encoding: 'utf-8' }).trim();
      if (!out) return;
      const pids = out.split(/\s+/).filter(Boolean).map((p) => parseInt(p, 10)).filter((n) => !Number.isNaN(n));
      for (const pid of pids) {
        try {
          process.kill(pid, 'SIGTERM');
        } catch (_) {}
      }
      const deadline = Date.now() + 1000;
      while (Date.now() < deadline) {}
      for (const pid of pids) {
        try {
          process.kill(pid, 'SIGKILL');
        } catch (_) {}
      }
    }
  } catch (_) {}
}

const server = createServer((req, res) => {
  const pathname = (req.url || '/').replace(/\?.*/, '');
  if (pathname === '/' || pathname === '') {
    const meta = getReportMeta();
    const rows = meta
      .map((m) => {
        const hasFile = m.mtime != null;
        const cellClass = hasFile ? '' : ' class="muted"';
        const link = hasFile ? `<a href="${m.path}">${m.name}</a>` : `${m.name} <span class="badge">not generated</span>`;
        return `<tr${cellClass}><td>${link}</td><td>${m.mtime ? formatMtime(m.mtime) : '—'}</td><td>${m.relative || '—'}</td></tr>`;
      })
      .join('');
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Test reports</title><style>body{font-family:system-ui,sans-serif;padding:2rem;max-width:56rem;margin:0 auto;line-height:1.5} h1{margin-top:0} table{border-collapse:collapse;width:100%} th,td{border:1px solid #ccc;padding:0.5rem 0.75rem;text-align:left} th{background:#f5f5f5} a{color:#0066cc} a:hover{text-decoration:underline} tr.muted{color:#666} .badge{font-size:0.85em;color:#888} .help{margin-top:1.5rem;padding:0.75rem;background:#f9f9f9;border-radius:4px;font-size:0.9em}</style></head><body><h1>Test reports</h1><p>Mobile coverage and mutation reports. Port ${PORT} · <a href="https://code.visualstudio.com/docs/editor/port-forwarding">Forward in VS Code</a> if remote.</p><table><thead><tr><th>Report</th><th>Last generated</th><th>Delta</th></tr></thead><tbody>${rows}</tbody></table><div class="help"><strong>Generate reports:</strong> From repo root run <code>pnpm --filter @korb/mobile test:coverage</code> (coverage) or <code>pnpm --filter @korb/mobile test:mutation</code> (mutation). Then refresh this page.</div></body></html>`;
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(html);
    return;
  }
  try {
    const safePath = pathname.replace(/\.\./g, '').replace(/^\//, '');
    const filePath = resolve(root, safePath);
    const rel = relative(root, filePath);
    if (rel.startsWith('..') || rel.startsWith('/')) {
      res.writeHead(403).end();
      return;
    }
    if (!existsSync(filePath)) {
      res.writeHead(404).end('Not found');
      return;
    }
    let resolvedPath = filePath;
    const stat = statSync(filePath);
    if (stat.isDirectory()) {
      resolvedPath = join(filePath, 'index.html');
      if (!existsSync(resolvedPath)) {
        res.writeHead(404).end('Not found');
        return;
      }
    }
    const content = readFileSync(resolvedPath);
    const mime = MIME[extname(resolvedPath)] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': mime });
    res.end(content);
  } catch (err) {
    console.error(err);
    res.writeHead(500).end('Internal server error');
  }
});

let listenRetries = 0;
const MAX_LISTEN_RETRIES = 2;

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE' && listenRetries < MAX_LISTEN_RETRIES) {
    listenRetries += 1;
    console.error(`Port ${PORT} is in use. Killing process and retrying (${listenRetries}/${MAX_LISTEN_RETRIES})...`);
    killPort(PORT);
    const delay = listenRetries * 1000;
    setTimeout(() => {
      server.listen(PORT, printAndListen);
    }, delay);
  } else if (err.code === 'EADDRINUSE') {
    console.error(`Port ${PORT} still in use after ${MAX_LISTEN_RETRIES} retries. Free it manually or use another port: node scripts/serve-reports.mjs <PORT>`);
    process.exit(1);
  } else {
    console.error(err);
    process.exit(1);
  }
});

function printAndListen() {
  const host = `http://localhost:${PORT}`;
  const meta = getReportMeta();
  console.log('');
  console.log('Test reports (forward this port in VS Code if on remote):');
  console.log('  Port: %s', PORT);
  console.log('');
  console.log('Links (last generated):');
  meta.forEach((m) => {
    const when = m.relative ? `${formatMtime(m.mtime)} (${m.relative})` : 'not generated';
    console.log('  %s: %s%s — %s', m.name, host, m.path, when);
  });
  console.log('');
  console.log('Index (with timestamps): %s', host);
  console.log('Press Ctrl+C to stop.');
}

killPort(PORT);
server.listen(PORT, printAndListen);
