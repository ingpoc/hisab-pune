/**
 * Fail-closed government escalation helpers.
 * No public PMC CARE write API — never invent success.
 */

export type GovSubmitResult =
  | { ok: true; externalId: string; channel: string }
  | {
      ok: false;
      reason: 'unsupported' | 'auth' | 'validation' | 'upstream';
      retryable: boolean;
      message: string;
    };

export const PMC_CARE_HOME = 'https://pmccare.in/cep/home';
export const PMC_CARE_WHATSAPP =
  'https://api.whatsapp.com/send/?phone=918888251001&text=hi&type=phone_number&app_absent=0';

export function pmcCareSubmitUnsupported(): GovSubmitResult {
  return {
    ok: false,
    reason: 'unsupported',
    retryable: false,
    message:
      'PMC CARE has no public partner write API. File on CARE yourself, then paste the ticket number.',
  };
}

/** Citizen-owned CARE path — evidence pack as WhatsApp draft text. */
export function buildCareWhatsAppUrl(pack: {
  localityName: string;
  wardId: number;
  categoryLabel: string;
  note: string;
}): string {
  const text = [
    'PMC CARE grievance (via Hisab)',
    `Locality: ${pack.localityName}`,
    `Ward: ${pack.wardId}`,
    `Type: ${pack.categoryLabel}`,
    pack.note,
  ].join('\n');
  return `https://api.whatsapp.com/send/?phone=918888251001&text=${encodeURIComponent(text)}&type=phone_number&app_absent=0`;
}
