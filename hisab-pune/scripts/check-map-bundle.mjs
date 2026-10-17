import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

// In maplibre. MapPage only dynamic-imports it and uses maplibregl-* class names.
const marker = 'Unable to perform style diff';
const dist = process.argv[2] ?? 'dist';
const assetsDir = join(dist, 'assets');
const fail = (reason) => { console.error(reason); process.exit(1); };

let names;
try { names = readdirSync(assetsDir); } catch { fail(`missing ${assetsDir}`); }

if (!names.some((name) => /^maplibre-gl-(?!worker).+\.js$/.test(name))) {
  fail('no separate maplibre-gl-*.js chunk');
}

for (const name of names.filter((name) => /^MapPage-.+\.js$/.test(name))) {
  if (readFileSync(join(assetsDir, name), 'utf8').includes(marker)) {
    fail(`${name} contains maplibre library code`);
  }
}

let html;
try { html = readFileSync(join(dist, 'index.html'), 'utf8'); }
catch { fail(`missing ${join(dist, 'index.html')}`); }

const tags = html.match(/<link\b[^>]*>|<script\b[^>]*>[\s\S]*?<\/script>/gi) ?? [];
for (const tag of tags) {
  const listed = /\brel=["'](?:modulepreload|preload)["']/i.test(tag) || /^<script\b/i.test(tag);
  if (listed && /maplibre|gl-worker/i.test(tag)) {
    fail('index.html references maplibre or gl-worker in a preload or script tag');
  }
}
