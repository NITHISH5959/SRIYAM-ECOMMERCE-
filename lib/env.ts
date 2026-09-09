/**
 * Environment variable validator for production safety.
 * Call validateEnv() at the top of any API route that uses secrets.
 * Throws a descriptive error at startup/first-request if any required
 * variable is missing or still set to its placeholder value.
 */

const PLACEHOLDERS = [
  'placeholder',
  'your-supabase-project-id',
  'rzp_test_placeholder',
];

function isPlaceholder(value: string): boolean {
  return PLACEHOLDERS.some((p) => value.toLowerCase().includes(p));
}

interface EnvVar {
  key: string;
  /** If true, the build will still work but a warning is emitted in dev. */
  optional?: boolean;
}

const REQUIRED_SERVER_VARS: EnvVar[] = [
  { key: 'NEXT_PUBLIC_SUPABASE_URL' },
  { key: 'NEXT_PUBLIC_SUPABASE_ANON_KEY' },
  { key: 'RAZORPAY_KEY_ID' },
  { key: 'RAZORPAY_KEY_SECRET' },
  { key: 'RAZORPAY_WEBHOOK_SECRET', optional: true },
  { key: 'DELHIVERY_API_TOKEN', optional: true },
];

let validated = false;

export function validateEnv(): void {
  // Only validate once per process lifetime
  if (validated) return;
  validated = true;

  const isDev = process.env.NODE_ENV === 'development';
  const errors: string[] = [];
  const warnings: string[] = [];

  for (const { key, optional } of REQUIRED_SERVER_VARS) {
    const value = process.env[key];

    if (!value) {
      const msg = `Missing environment variable: ${key}`;
      optional ? warnings.push(msg) : errors.push(msg);
      continue;
    }

    if (!isDev && isPlaceholder(value)) {
      const msg = `Environment variable ${key} is still set to a placeholder value. Replace it with real credentials before deploying.`;
      optional ? warnings.push(msg) : errors.push(msg);
    }
  }

  if (warnings.length > 0) {
    warnings.forEach((w) => console.warn(`[ENV WARNING] ${w}`));
  }

  if (errors.length > 0) {
    const message = [
      '==========================================',
      'FATAL: Missing or invalid environment variables detected.',
      'The application cannot start safely without these.',
      '',
      ...errors.map((e) => `  ✖ ${e}`),
      '',
      'Set these in .env.local (development) or your deployment platform environment (production).',
      '==========================================',
    ].join('\n');

    throw new Error(message);
  }
}
