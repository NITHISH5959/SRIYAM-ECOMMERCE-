'use client';

import { useState, useCallback } from 'react';

/**
 * Returns an `addWithFeedback` wrapper that fires the real addToCart
 * then sets `isAdded = true` for `durationMs` (default 550ms).
 *
 * Usage in a button:
 *   const { isAdded, trigger } = useAddFeedback(() => addToCart(product, 1));
 *   <button onClick={trigger} className={isAdded ? 'animate-btn-success' : ''}>
 *     {isAdded ? <CheckCircle2 /> : <ShoppingBag />}
 *   </button>
 */
export function useAddFeedback(addFn: () => void, durationMs = 550) {
  const [isAdded, setIsAdded] = useState(false);

  const trigger = useCallback(() => {
    addFn();
    setIsAdded(true);
    // The CSS animation runs for 380ms; we keep the check visible slightly longer
    const t = setTimeout(() => setIsAdded(false), durationMs);
    return () => clearTimeout(t);
  }, [addFn, durationMs]);

  return { isAdded, trigger };
}
