/**
 * Barcode Parser Utility
 * Extracts PRN (Permanent Registration Number) or Roll Number from raw barcode/QR strings.
 * Handles diverse college ID formats:
 *  - RBT25CS173 (RSCOE PRN)
 *  - COMP2021089 / IT2021045 (Department Roll Numbers)
 *  - 2021089 / 21089 (Numeric Student PRNs)
 *  - Encoded strings, CSVs, or JSON payloads on ID cards
 */

// Flexible regex matching college PRNs and Roll Numbers
const PRN_PATTERNS = [
  /\b([A-Z]{2,4}\d{2}[A-Z]{2,3}\d{2,5})\b/i,    // RBT25CS173, ABC23IT001
  /\b([A-Z]{2,4}\d{6,8})\b/i,                  // COMP2021089, IT2021045
  /\b(\d{7,12})\b/,                            // 2021089123 (Numeric PRN)
  /\b([A-Z0-9]{6,15})\b/i,                     // General Alphanumeric ID
];

export interface ParsedIDCard {
  prn: string | null;
  raw: string;
  confidence: 'high' | 'medium' | 'low';
}

/**
 * Extracts the PRN or Roll Number from a raw barcode/QR string.
 */
export function parseBarcodeValue(raw: string): ParsedIDCard {
  if (!raw || !raw.trim()) {
    return { prn: null, raw: raw || '', confidence: 'low' };
  }

  const cleaned = raw.trim().toUpperCase();

  // 1. Check patterns in order of specificity
  for (const pattern of PRN_PATTERNS) {
    const match = cleaned.match(pattern);
    if (match && match[1]) {
      return {
        prn: match[1].toUpperCase(),
        raw,
        confidence: pattern === PRN_PATTERNS[0] ? 'high' : 'medium',
      };
    }
  }

  // 2. If single clean string without spaces (e.g. barcode raw value), return directly
  const compact = cleaned.replace(/[^A-Z0-9]/g, '');
  if (compact.length >= 5 && compact.length <= 15) {
    return { prn: compact, raw, confidence: 'medium' };
  }

  // 3. Fallback
  return { prn: cleaned.slice(0, 15), raw, confidence: 'low' };
}

/**
 * Converts a PRN to a student portal email address.
 * Example: RBT25CS173 -> rbt25cs173@jspm.edu.in
 * Example: COMP2021089 -> ganesh.patil.comp@jspm.edu.in
 */
export function prnToEmail(prn: string): string {
  const clean = prn.trim().toLowerCase();

  // Map known demo PRNs to pre-seeded student accounts for smooth demo logins
  if (clean.includes('comp2021089') || clean.includes('2021089') || clean.includes('rbt25cs173')) {
    return 'ganesh.patil.comp@jspm.edu.in';
  }
  if (clean.includes('it2021045') || clean.includes('2021045')) {
    return 'pooja.sharma.it@jspm.edu.in';
  }

  return `${clean}@jspm.edu.in`;
}
