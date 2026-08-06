import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const PKG_ROOT = path.resolve(__dirname, '..');

export type GradeResult = { name: string; ok: boolean; detail: string };

export function walkFiles(dir: string, exts: Set<string>, out: string[] = []): string[] {
  if (!fs.existsSync(dir)) return out;
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    if (ent.name === 'node_modules' || ent.name === 'dist' || ent.name === 'data') continue;
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) walkFiles(full, exts, out);
    else if (exts.has(path.extname(ent.name))) out.push(full);
  }
  return out;
}

export function read(rel: string): string {
  return fs.readFileSync(path.join(PKG_ROOT, rel), 'utf8');
}

export function exists(rel: string): boolean {
  return fs.existsSync(path.join(PKG_ROOT, rel));
}

export function fail(name: string, detail: string): GradeResult {
  return { name, ok: false, detail };
}

export function pass(name: string, detail: string): GradeResult {
  return { name, ok: true, detail };
}
