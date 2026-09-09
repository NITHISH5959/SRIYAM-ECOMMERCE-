/**
 * Order ID and sequence utilities for Sriyam Store.
 * 
 * Order Format Rules:
 * - Always prefix with 'SRI'
 * - At least 3 numeric digits zero-padded ('SRI001', 'SRI002', ..., 'SRI099', 'SRI100', ..., 'SRI999')
 * - When sequence reaches 1000+, naturally extends ('SRI1000', 'SRI1001', ...)
 * - Must strictly match regex: ^SRI\d{3,}$
 */

export const ORDER_NUMBER_PREFIX = 'SRI';
export const ORDER_NUMBER_REGEX = /^SRI\d{3,}$/;

/**
 * Formats an integer sequence number into a customer-facing Order ID.
 * @param seq Positive integer sequence (e.g., 1 -> 'SRI001', 99 -> 'SRI099', 1000 -> 'SRI1000')
 */
export function formatOrderNumber(seq: number): string {
  if (seq <= 0 || isNaN(seq)) {
    return `${ORDER_NUMBER_PREFIX}001`;
  }
  const digits = seq.toString();
  const padded = digits.length < 3 ? digits.padStart(3, '0') : digits;
  return `${ORDER_NUMBER_PREFIX}${padded}`;
}

/**
 * Validates if a string is a valid Sriyam Order Number.
 * @param orderNumber String to test
 */
export function isValidOrderNumber(orderNumber?: string | null): boolean {
  if (!orderNumber) return false;
  return ORDER_NUMBER_REGEX.test(orderNumber.trim().toUpperCase());
}

/**
 * Parses numeric sequence out of a valid order number.
 * @param orderNumber e.g., 'SRI001' -> 1, 'SRI1050' -> 1050
 */
export function parseOrderSequence(orderNumber?: string | null): number | null {
  if (!orderNumber || !isValidOrderNumber(orderNumber)) return null;
  const numStr = orderNumber.trim().toUpperCase().replace(/^SRI/, '');
  const parsed = parseInt(numStr, 10);
  return isNaN(parsed) ? null : parsed;
}
