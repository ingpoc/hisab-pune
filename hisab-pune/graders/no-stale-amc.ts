import { wardOffices } from '../src/data/wardOffices.ts';
import { fail, pass, type GradeResult } from './lib.ts';

/**
 * Browser/product rule: no stale named AMCs in the roster.
 * Offices must be regional-office labels; notes must defer to pmc.gov.in.
 */
export function gradeNoStaleAmc(): GradeResult {
  const errors: string[] = [];
  for (const office of Object.values(wardOffices)) {
    if (!/Regional Office/i.test(office.name)) {
      errors.push(`${office.id} name must be a Regional Office label (got "${office.name}")`);
    }
    // Reject person-like "First Last" office names without "Regional"
    if (/^[A-Z][a-z]+\s+[A-Z][a-z]+$/.test(office.name.trim())) {
      errors.push(`${office.id} looks like a person name, not an office`);
    }
    if (!office.note || !/pmc\.gov\.in/i.test(office.note)) {
      errors.push(`${office.id} note must point to pmc.gov.in for AMC verification`);
    }
    if (/AMC name:\s*(?!verify)/i.test(office.note ?? '') && !/verify/i.test(office.note ?? '')) {
      errors.push(`${office.id} appears to embed a named AMC`);
    }
  }
  if (errors.length) return fail('no-stale-amc', errors.slice(0, 10).join('; '));
  return pass('no-stale-amc', `${Object.keys(wardOffices).length} offices use verify-on-pmc.gov.in notes`);
}
