// === Moon Eclipse: Test Runner ===
// Transpiles TypeScript tests + sources to ESM via esbuild (no extra deps),
// then runs them with the built-in Node test runner.

import * as esbuild from "esbuild";
import { readdirSync, rmSync, mkdirSync } from "fs";
import { spawnSync } from "child_process";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const testsDir = join(root, "tests");
const outDir = join(root, ".test-build");

rmSync(outDir, { recursive: true, force: true });
mkdirSync(outDir, { recursive: true });

const entryPoints = readdirSync(testsDir)
  .filter((f) => f.endsWith(".test.ts"))
  .map((f) => join(testsDir, f));

if (entryPoints.length === 0) {
  console.error("No *.test.ts files found in tests/");
  process.exit(1);
}

await esbuild.build({
  entryPoints,
  outdir: outDir,
  bundle: true,
  format: "esm",
  platform: "node",
  target: "node20",
  sourcemap: "inline",
  outExtension: { ".js": ".mjs" },
});

const built = readdirSync(outDir)
  .filter((f) => f.endsWith(".mjs"))
  .map((f) => join(outDir, f));

const res = spawnSync("node", ["--test", ...built], {
  stdio: "inherit",
  cwd: root,
  env: { ...process.env, TZ: "UTC" },
});

process.exit(res.status ?? 1);
