/**
 * Invoice business information.
 * All values can be overridden via environment variables so they can be
 * changed without a code modification — just redeploy with the new value.
 */

export const BUSINESS = {
  legalName: process.env.BUSINESS_LEGAL_NAME || 'Templeint Labs',
  brandName: process.env.BUSINESS_BRAND_NAME || 'Sriyam Store',
  parentLine: process.env.BUSINESS_PARENT_LINE || 'A unit of Templeint Labs',
  address: process.env.BUSINESS_ADDRESS || 'Dharmapuri - 636701, Tamil Nadu, India',
  phone: process.env.BUSINESS_PHONE || '+91 88703 08265',
  email: process.env.BUSINESS_EMAIL || 'sridhar.g@templeint.in',
  /** Leave BUSINESS_GSTIN empty/unset to hide the line entirely. */
  gstin: process.env.BUSINESS_GSTIN || '',
} as const;

export const STORE_NAME = BUSINESS.brandName;
export const STORE_TAGLINE = 'Bringing Divinity to Every Home';
