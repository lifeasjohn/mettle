import { describe, expect, it } from 'vitest';
import {
  FREE_SPAR_ALLOWANCE,
  canSpar,
  consumeSpar,
  freeEntitlement,
  isFinalFreeSpar,
} from './entitlement';

describe('entitlement', () => {
  it('grants exactly three free spars', () => {
    let e = freeEntitlement();
    for (let i = 0; i < FREE_SPAR_ALLOWANCE; i++) {
      expect(canSpar(e).allowed).toBe(true);
      e = consumeSpar(e);
    }
    expect(canSpar(e)).toMatchObject({ allowed: false, reason: 'allowance-spent' });
  });

  it('counts down remaining spars', () => {
    expect(canSpar(freeEntitlement()).remaining).toBe(3);
    expect(canSpar(consumeSpar(freeEntitlement())).remaining).toBe(2);
  });

  it('warns before the last free spar rather than surprising them', () => {
    expect(isFinalFreeSpar({ status: 'free', sparsUsed: 1 })).toBe(false);
    expect(isFinalFreeSpar({ status: 'free', sparsUsed: 2 })).toBe(true);
  });

  it('never meters a subscriber', () => {
    const active = { status: 'active' as const, sparsUsed: 99 };
    expect(canSpar(active)).toMatchObject({ allowed: true, reason: 'subscribed' });
    expect(consumeSpar(active)).toBe(active);
    expect(isFinalFreeSpar(active)).toBe(false);
  });
});
