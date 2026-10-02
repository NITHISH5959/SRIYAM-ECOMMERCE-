'use client';

import { useEffect } from 'react';

export default function AuthFallbackHandler() {
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const { search, hash, origin } = window.location;
    const searchParams = new URLSearchParams(search);

    const code = searchParams.get('code');
    const tokenHash = searchParams.get('token_hash');
    const type = searchParams.get('type');
    const error = searchParams.get('error');

    // If query parameter fallback is detected (e.g. ?code=... or ?token_hash=...)
    if (code || tokenHash || error) {
      const next = searchParams.get('next') || '/reset-password';
      const target = new URL('/auth/confirm', origin);
      if (code) target.searchParams.set('code', code);
      if (tokenHash) target.searchParams.set('token_hash', tokenHash);
      if (type) target.searchParams.set('type', type);
      if (error) target.searchParams.set('error', error);
      target.searchParams.set('next', next);
      window.location.replace(target.toString());
      return;
    }

    // If hash fallback is detected (e.g. #access_token=... or #error=...)
    if (hash && (hash.includes('access_token') || hash.includes('error='))) {
      window.location.replace(`/auth/confirm${hash}`);
    }
  }, []);

  return null;
}
