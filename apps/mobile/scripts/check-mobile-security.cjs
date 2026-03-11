#!/usr/bin/env node
/**
 * Mobile app security checks: no secrets in source, auth layouts enforce redirects.
 * Run: pnpm run check:security (from apps/mobile).
 */
const fs = require("fs");
const path = require("path");

const SRC = path.join(__dirname, "..", "src");
const FORBIDDEN = [
  { pattern: /\bsk_[a-zA-Z0-9]+\b/, message: "Clerk or other secret key (sk_*) must not appear in mobile source" },
  { pattern: /CLERK_SECRET_KEY\s*[:=]/, message: "CLERK_SECRET_KEY must only be used in server (API), not mobile" },
  { pattern: /["']sk_[^"']+["']/, message: "Hardcoded secret key string" },
  { pattern: /INGEST_API_KEY|SCRAPER_INGEST_API_TOKEN/, message: "Ingest API key must only be used server-side (scraper/API), not in mobile" },
];
const ALLOWED_PUBLISHABLE = /pk_test_|pk_live_|EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY/;

function walk(dir, ext, files = []) {
  if (!fs.existsSync(dir)) return files;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory() && e.name !== "node_modules" && !e.name.startsWith(".")) {
      walk(full, ext, files);
    } else if (e.isFile() && ext.some((ext) => e.name.endsWith(ext))) {
      files.push(full);
    }
  }
  return files;
}

function checkNoSecrets() {
  const errors = [];
  const files = walk(SRC, [".ts", ".tsx", ".js", ".jsx"]);
  for (const file of files) {
    const content = fs.readFileSync(file, "utf8");
    const rel = path.relative(path.join(__dirname, ".."), file);
    for (const { pattern, message } of FORBIDDEN) {
      if (pattern.test(content)) {
        errors.push(`${rel}: ${message}`);
      }
    }
  }
  return errors;
}

function checkAuthLayouts() {
  const errors = [];
  const authLayout = path.join(SRC, "app", "(auth)", "_layout.tsx");
  const homeLayout = path.join(SRC, "app", "(home)", "_layout.tsx");
  const rootIndex = path.join(SRC, "app", "index.tsx");

  const mustContain = (file, substrings, desc) => {
    if (!fs.existsSync(file)) {
      errors.push(`Missing: ${path.relative(SRC, file)}`);
      return;
    }
    const content = fs.readFileSync(file, "utf8");
    const rel = path.relative(path.join(__dirname, ".."), file);
    for (const s of substrings) {
      if (!content.includes(s)) {
        errors.push(`${rel}: ${desc} (expected to contain "${s}")`);
      }
    }
  };

  mustContain(authLayout, ["useAuth", "Redirect", "isSignedIn"], "Auth layout should use useAuth and redirect when signed in");
  mustContain(homeLayout, ["useAuth", "Redirect", "isSignedIn"], "Home layout should use useAuth and redirect when not signed in");
  mustContain(rootIndex, ["useAuth", "Redirect", "isSignedIn"], "Root index should redirect by auth state");
  return errors;
}

function checkClerkProvider() {
  const errors = [];
  const layoutPath = path.join(SRC, "app", "_layout.tsx");
  if (!fs.existsSync(layoutPath)) {
    errors.push("Missing root _layout.tsx");
    return errors;
  }
  const content = fs.readFileSync(layoutPath, "utf8");
  const rel = path.relative(path.join(__dirname, ".."), layoutPath);
  if (!content.includes("ClerkProvider")) {
    errors.push(`${rel}: Root layout should wrap app with ClerkProvider`);
  }
  if (!content.includes("tokenCache")) {
    errors.push(`${rel}: ClerkProvider should use tokenCache (secure storage)`);
  }
  return errors;
}

function main() {
  const allErrors = [
    ...checkNoSecrets(),
    ...checkAuthLayouts(),
    ...checkClerkProvider(),
  ];

  if (allErrors.length > 0) {
    console.error("Security check failed:\n");
    allErrors.forEach((e) => console.error("  " + e));
    process.exit(1);
  }

  console.log("Security check passed: no secrets in source, auth layouts and Clerk provider OK.");
  process.exit(0);
}

main();
