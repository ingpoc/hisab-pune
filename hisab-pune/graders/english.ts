import path from 'node:path';
import { DEVANAGARI, FORBIDDEN_FIELD_NAMES } from './expect.ts';
import { fail, pass, walkFiles, PKG_ROOT, type GradeResult } from './lib.ts';
import fs from 'node:fs';

/** Browser QA: English-only UI + data — no Devanagari / Marathi field names. */
export function gradeEnglish(): GradeResult {
  const roots = ['src', 'server/src', 'index.html'].map((r) => path.join(PKG_ROOT, r));
  const files: string[] = [];
  for (const root of roots) {
    if (fs.existsSync(root) && fs.statSync(root).isFile()) files.push(root);
    else walkFiles(root, new Set(['.ts', '.tsx', '.css', '.html', '.json']), files);
  }

  const hits: string[] = [];
  for (const file of files) {
    const text = fs.readFileSync(file, 'utf8');
    if (DEVANAGARI.test(text)) {
      const line = text.split('\n').findIndex((l) => DEVANAGARI.test(l)) + 1;
      hits.push(`${path.relative(PKG_ROOT, file)}:${line} Devanagari`);
    }
    for (const field of FORBIDDEN_FIELD_NAMES) {
      const re = new RegExp(`\\b${field}\\b`);
      if (re.test(text)) hits.push(`${path.relative(PKG_ROOT, file)} forbidden field ${field}`);
    }
  }

  if (hits.length) return fail('english-only', hits.slice(0, 12).join('; '));
  return pass('english-only', `scanned ${files.length} files — no Devanagari / Marathi fields`);
}
