// Resource / load characterization. Thresholds are intentionally generous —
// they exist to catch catastrophic regressions, not to micro-benchmark.
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { generateCSS } from "../src/background/css-rules";
import { lighten } from "../src/background/color-utils";
import type { MoonSettings } from "../src/shared/types";

const s: MoonSettings = {
  enabled: true,
  backgroundColor: "#0d0d12",
  textColor: "#d0d0d8",
  scheduleEnabled: false,
  scheduleStart: "20:00",
  scheduleEnd: "06:00",
  excludeList: [],
};

test("generateCSS throughput (hot path on every page load)", () => {
  const N = 20_000;
  const t0 = performance.now();
  let bytes = 0;
  for (let i = 0; i < N; i++) bytes += generateCSS(s).length;
  const ms = performance.now() - t0;
  const opsPerSec = Math.round(N / (ms / 1000));
  console.log(
    `  generateCSS: ${N} calls in ${ms.toFixed(1)}ms ` +
      `(${opsPerSec.toLocaleString()} ops/sec)`,
  );
  assert.ok(bytes > 0);
  assert.ok(ms < 3000, `generateCSS too slow: ${ms.toFixed(1)}ms / ${N} calls`);
});

test("color math throughput", () => {
  const N = 100_000;
  const t0 = performance.now();
  for (let i = 0; i < N; i++) lighten("#0d0d12", i % 100);
  const ms = performance.now() - t0;
  console.log(`  lighten: ${N} calls in ${ms.toFixed(1)}ms`);
  assert.ok(ms < 3000, `lighten too slow: ${ms.toFixed(1)}ms / ${N} calls`);
});

test("shipped bundle size budget (<60KB total)", (t) => {
  const distDir = join(process.cwd(), "release", "dist");
  if (!existsSync(distDir)) {
    t.skip("release/dist not built — run `npm run build` first");
    return;
  }
  let total = 0;
  for (const f of readdirSync(distDir).filter((x) => x.endsWith(".js"))) {
    const size = statSync(join(distDir, f)).size;
    total += size;
    console.log(`  ${f}: ${(size / 1024).toFixed(1)} KB`);
  }
  console.log(`  total: ${(total / 1024).toFixed(1)} KB`);
  assert.ok(total < 60 * 1024, `bundles too large: ${(total / 1024).toFixed(1)} KB`);
});
