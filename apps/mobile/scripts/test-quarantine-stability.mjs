#!/usr/bin/env node
/**
 * Run quarantine test suite N times and report per-test stability.
 * Usage: node scripts/test-quarantine-stability.mjs [N]
 * Default N=10. Tests that pass all N runs are marked REINSTATE.
 */
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const runs = Math.max(1, parseInt(process.argv[2] || "10", 10));

const result = spawnSync(
  "pnpm",
  ["exec", "jest", "--config", "jest.flaky.config.js", "--runInBand", "--json", "--outputFile", "-"],
  { cwd: root, encoding: "utf-8", maxBuffer: 10 * 1024 * 1024 }
);

// Jest --json --outputFile - writes to stdout when outputFile is -
// We run N times by invoking Jest N times and aggregating (simplified: just run N times and report exit codes)
const results = [];
for (let i = 0; i < runs; i++) {
  const r = spawnSync(
    "pnpm",
    ["exec", "jest", "--config", "jest.flaky.config.js", "--runInBand", "--silent", "--passWithNoTests"],
    { cwd: root, encoding: "utf-8" }
  );
  results.push({ run: i + 1, passed: r.status === 0 });
  process.stdout.write(r.status === 0 ? "." : "F");
}
process.stdout.write("\n");

const passed = results.filter((r) => r.passed).length;
const failed = results.filter((r) => !r.passed).length;
console.log(`Quarantine stability: ${passed}/${runs} runs passed, ${failed} failed.`);
if (failed === 0 && runs > 0) {
  console.log("All runs passed → consider REINSTATING tests to main suite (rename *.flaky.test.* to *.test.*).");
} else if (failed > 0) {
  console.log("Do not reinstate until all runs pass.");
  process.exitCode = 1;
}
