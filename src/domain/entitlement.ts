import type { Entitlement } from './types';

/**
 * The paywall is spar-metered rather than time- or lesson-metered.
 *
 * Sparring is simultaneously the thing users want more of and the only thing
 * that costs real inference money, so metering it aligns the business model
 * with the cost curve. It also means the ask lands after three complete
 * verdicts have already proven the product, rather than before anything has.
 *
 * Free tier keeps all five lessons and unlimited Quench forever. The Quench is
 * the input to The Pattern, and a free user who keeps journaling is building
 * the dataset that eventually makes upgrading worth it.
 */

export const FREE_SPAR_ALLOWANCE = 3;

/** Inference calls per spar: two escalations plus one scoring pass. */
export const INFERENCE_CALLS_PER_SPAR = 3;

export const freeEntitlement = (): Entitlement => ({ status: 'free', sparsUsed: 0 });

export interface SparPermission {
  allowed: boolean;
  /** Remaining free spars. Infinity once subscribed. */
  remaining: number;
  reason: 'subscribed' | 'within-free-allowance' | 'allowance-spent';
}

export function canSpar(entitlement: Entitlement): SparPermission {
  if (entitlement.status === 'active') {
    return { allowed: true, remaining: Number.POSITIVE_INFINITY, reason: 'subscribed' };
  }

  const remaining = Math.max(0, FREE_SPAR_ALLOWANCE - entitlement.sparsUsed);
  return remaining > 0
    ? { allowed: true, remaining, reason: 'within-free-allowance' }
    : { allowed: false, remaining: 0, reason: 'allowance-spent' };
}

/** Called on spar completion, not on start: an abandoned spar should not cost one. */
export function consumeSpar(entitlement: Entitlement): Entitlement {
  if (entitlement.status === 'active') return entitlement;
  return { ...entitlement, sparsUsed: entitlement.sparsUsed + 1 };
}

/**
 * Warn on the last free spar so the paywall is never a surprise. Being straight
 * about the boundary costs one conversion and buys the trust the whole
 * training-not-therapy posture depends on.
 */
export function isFinalFreeSpar(entitlement: Entitlement): boolean {
  return entitlement.status === 'free' && entitlement.sparsUsed === FREE_SPAR_ALLOWANCE - 1;
}
