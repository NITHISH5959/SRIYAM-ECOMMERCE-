import { Address } from '@/types';

/**
 * Standard list of all 28 Indian States & 8 Union Territories
 */
export const INDIAN_STATES = [
  'Andaman and Nicobar Islands',
  'Andhra Pradesh',
  'Arunachal Pradesh',
  'Assam',
  'Bihar',
  'Chandigarh',
  'Chhattisgarh',
  'Dadra and Nagar Haveli and Daman and Diu',
  'Delhi',
  'Goa',
  'Gujarat',
  'Haryana',
  'Himachal Pradesh',
  'Jammu and Kashmir',
  'Jharkhand',
  'Karnataka',
  'Kerala',
  'Ladakh',
  'Lakshadweep',
  'Madhya Pradesh',
  'Maharashtra',
  'Manipur',
  'Meghalaya',
  'Mizoram',
  'Nagaland',
  'Odisha',
  'Puducherry',
  'Punjab',
  'Rajasthan',
  'Sikkim',
  'Tamil Nadu',
  'Telangana',
  'Tripura',
  'Uttar Pradesh',
  'Uttarakhand',
  'West Bengal',
] as const;

export type IndianState = (typeof INDIAN_STATES)[number];

export const SHIPPING_RATES = {
  TAMIL_NADU: 150,
  OTHER_STATES: 200,
} as const;

/**
 * Normalizes and checks whether a given state string is Tamil Nadu.
 */
export function isTamilNadu(state?: string | null): boolean {
  if (!state) return false;
  const normalized = state.trim().toLowerCase().replace(/[^a-z]/g, '');
  return normalized === 'tamilnadu';
}

/**
 * Instant state-based shipping rate calculation:
 * - Free shipping coupon applied -> ₹0
 * - State is Tamil Nadu -> ₹150
 * - Any other Indian state -> ₹200
 */
export function calculateShippingFee(state?: string | null, isFreeShipping = false): number {
  if (isFreeShipping) return 0;
  if (!state || state.trim() === '') return SHIPPING_RATES.OTHER_STATES;
  return isTamilNadu(state) ? SHIPPING_RATES.TAMIL_NADU : SHIPPING_RATES.OTHER_STATES;
}

export interface AddressValidationResult {
  valid: boolean;
  isValid: boolean;
  errors: Record<string, string>;
}

/**
 * Comprehensive client & server address validation.
 */
export function validateAddress(address: Partial<Address>): AddressValidationResult {
  const errors: Record<string, string> = {};

  // 1. Name validation (2-100 characters, must contain alphabetical characters, not pure numbers)
  const name = (address.name || '').trim();
  if (!name) {
    errors.name = 'Full name is required.';
  } else if (name.length < 2) {
    errors.name = 'Full name must be at least 2 characters.';
  } else if (name.length > 100) {
    errors.name = 'Full name must be under 100 characters.';
  } else if (!/[a-zA-Z]/.test(name)) {
    errors.name = 'Full name must contain letters.';
  }

  // 2. Phone validation (exactly 10 digits, numeric only)
  const phone = (address.phone || '').trim();
  if (!phone) {
    errors.phone = 'Phone number is required.';
  } else if (!/^\d{10}$/.test(phone)) {
    errors.phone = 'Phone number must be exactly 10 digits (numbers only).';
  }

  // 3. Address Line 1 validation (min 5 characters)
  const line1 = (address.line1 || '').trim();
  if (!line1) {
    errors.line1 = 'Address Line 1 is required.';
  } else if (line1.length < 5) {
    errors.line1 = 'Address Line 1 must be at least 5 characters.';
  }

  // 4. City validation (letters and spaces only, no digits)
  const city = (address.city || '').trim();
  if (!city) {
    errors.city = 'City is required.';
  } else if (city.length < 2) {
    errors.city = 'City name must be at least 2 characters.';
  } else if (!/^[a-zA-Z\s.'-]+$/.test(city) || /\d/.test(city)) {
    errors.city = 'City name should only contain letters and spaces.';
  }

  // 5. State validation (must match an Indian state from list)
  const state = (address.state || '').trim();
  if (!state) {
    errors.state = 'Please select a state.';
  } else {
    const matchedState = INDIAN_STATES.find(
      (s) => s.toLowerCase() === state.toLowerCase()
    );
    if (!matchedState) {
      errors.state = 'Please select a valid Indian state from the list.';
    }
  }

  // 6. Pincode validation (exactly 6 digits, numeric only)
  const pincode = (address.pincode || '').trim();
  if (!pincode) {
    errors.pincode = 'Pincode is required.';
  } else if (!/^\d{6}$/.test(pincode)) {
    errors.pincode = 'Pincode must be exactly 6 digits.';
  }

  const isValid = Object.keys(errors).length === 0;

  return {
    valid: isValid,
    isValid,
    errors,
  };
}
