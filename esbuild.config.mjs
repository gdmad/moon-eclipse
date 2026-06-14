import * as esbuild from "esbuild";
import { cpSync, existsSync, mkdirSync, rmSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const isWatch = process.argv.includes("--watch");
const __dirname = dirname(fileURLToPath(import.meta.url));

const common = {
  bundle: true,
  format: "iife",
  platform: "browser",
  minify: true,
  target: "es2020",
  outdir: "release/dist",
};

const entryPoints = {
  background: "src/background/background.ts",
  content: "src/content/content.ts",
  popup: "src/popup/popup.ts",
};

// Files to copy from project root to release/ after build
const STATIC_FILES = [
  "manifest.json",
  "src/popup/popup.html",
  "src/popup/popup.css",
];

function copyStatic() {
  for (const file of STATIC_FILES) {
    const src = join(__dirname, file);
    const dest = join(__dirname, "release", file);
    mkdirSync(dirname(dest), { recursive: true });
    cpSync(src, dest);
  }
  // Copy icons
  const srcIcons = join(__dirname, "icons");
  const destIcons = join(__dirname, "release", "icons");
  if (existsSync(srcIcons)) {
    mkdirSync(destIcons, { recursive: true });
    cpSync(srcIcons, destIcons, { recursive: true });
  }
  console.log("[Moon Eclipse] Static files copied.");
}

async function build() {
  try {
    // Start clean so removed entry points / static files never linger.
    rmSync(join(__dirname, "release"), { recursive: true, force: true });

    const ctx = await esbuild.context({
      ...common,
      entryPoints,
    });

    if (isWatch) {
      // Watch mode: only rebuild JS, copy static once initially
      copyStatic();
      await ctx.watch();
      console.log("[Moon Eclipse] Watching for changes...");
    } else {
      await ctx.rebuild();
      copyStatic();
      console.log("[Moon Eclipse] Build complete.");
      await ctx.dispose();
    }
  } catch (err) {
    console.error("[Moon Eclipse] Build failed:", err);
    process.exit(1);
  }
}

build();
